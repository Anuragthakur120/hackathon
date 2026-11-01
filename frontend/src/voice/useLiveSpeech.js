import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../api/voiceApi.js';
import { whisperHint } from './languages.js';

/**
 * Live speech input for /assistant.
 *
 * Two engines, chosen automatically:
 *   - "browser": Web Speech API (continuous + interimResults). Words are pushed to `onText` as they are heard.
 *   - "cloud"  : MediaRecorder -> backend /api/stt (Whisper, auto language detection). Used for Auto mode and for
 *                browsers without SpeechRecognition (e.g. Firefox). Audio is uploaded once and never stored.
 *
 * All callbacks are read through refs so the long-lived recognition handlers never see stale state.
 * Nothing fails silently: every event is logged with the "[NagarSathi STT]" prefix and errors reach `onError`.
 */

const TAG = '[NagarSathi STT]';
const SILENCE_RMS = 0.015; // cloud mode: below this level counts as silence

export const MIC_ERRORS = Object.freeze({
  'not-allowed': 'Microphone permission is blocked. Click the lock icon in the address bar, allow the microphone, then tap the mic again.',
  'service-not-allowed': 'Speech recognition service is blocked by the browser. Allow the microphone and reload.',
  network: 'Network error: speech recognition could not reach its server. Check your internet connection, or type your message.',
  'no-speech': 'No speech was detected. Please speak closer to the microphone and try again.',
  'audio-capture': 'No microphone was found or it is in use by another app. Connect a microphone and try again.',
  'language-not-supported': 'This browser does not support speech recognition for the selected language. Try Auto-detect or another language.',
  aborted: 'Listening was interrupted.',
  unsupported: 'This browser has no built-in speech recognition. Using cloud transcription instead.',
});

export function describeMicError(code, fallback = '') {
  return MIC_ERRORS[code] || fallback || `Speech error: ${code}`;
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
}

export function useLiveSpeech({
  langCode, // BCP-47 code, or null for auto
  silenceMs = 1500,
  onText, // (fullText, { isFinal }) -> write into the input box state
  onSilence, // (finalText, { detectedLang }) -> auto-send
  onError, // (message, code)
  onDetectedLang, // (code)
} = {}) {
  const [status, setStatus] = useState('idle'); // idle | listening | transcribing
  const [error, setError] = useState('');
  const [engine, setEngine] = useState(null); // 'browser' | 'cloud' | null

  const cb = useRef({});
  cb.current = { onText, onSilence, onError, onDetectedLang, langCode, silenceMs };

  const recRef = useRef(null);
  const wantListeningRef = useRef(false); // user intent: keep mic on
  const pausedRef = useRef(false); // temporarily off (assistant speaking)
  const baseTextRef = useRef(''); // text kept across engine restarts
  const liveTextRef = useRef('');
  const silenceTimerRef = useRef(null);
  const sentRef = useRef(false);

  // cloud engine
  const streamRef = useRef(null);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const vadTimerRef = useRef(null);
  const heardSpeechRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const sendAfterStopRef = useRef(true);

  const SpeechRec =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const cloudCapable =
    typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';
  const supported = Boolean(SpeechRec) || cloudCapable;

  const fail = useCallback((code, fallback) => {
    const message = describeMicError(code, fallback);
    console.error(TAG, 'ERROR', code, message);
    setError(message);
    cb.current.onError?.(message, code);
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const emitFinal = useCallback((text, detectedLang = null) => {
    const finalText = String(text || '').trim();
    if (!finalText || sentRef.current) return;
    sentRef.current = true;
    console.log(TAG, 'sending final text:', finalText);
    cb.current.onSilence?.(finalText, { detectedLang });
  }, []);

  /* ------------------------------ browser engine ------------------------------ */

  const stopBrowserEngine = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort ? rec.abort() : rec.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const startBrowserEngine = useCallback(() => {
    const rec = new SpeechRec();
    rec.lang = cb.current.langCode || 'hi-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let fatal = false;

    rec.onstart = () => {
      console.log(TAG, 'onstart (browser) lang=', rec.lang);
      setStatus('listening');
      setError('');
    };

    rec.onresult = (event) => {
      let finalPart = '';
      let interimPart = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const r = event.results[i];
        const t = r[0]?.transcript || '';
        if (r.isFinal) finalPart += `${t} `;
        else interimPart += t;
      }
      const sessionText = `${finalPart}${interimPart}`.trim();
      const full = `${baseTextRef.current} ${sessionText}`.trim();
      const last = event.results[event.results.length - 1];
      console.log(TAG, 'onresult', last?.isFinal ? 'FINAL' : 'interim', JSON.stringify(full));
      liveTextRef.current = full;
      cb.current.onText?.(full, { isFinal: Boolean(last?.isFinal) });

      clearSilenceTimer();
      if (full) {
        silenceTimerRef.current = setTimeout(() => {
          console.log(TAG, `${cb.current.silenceMs}ms of silence -> auto-send`);
          emitFinal(liveTextRef.current, cb.current.langCode);
        }, cb.current.silenceMs);
      }
    };

    rec.onerror = (e) => {
      const code = e?.error || 'unknown';
      console.warn(TAG, 'onerror', code, e?.message || '');
      if (code === 'no-speech') {
        fail('no-speech'); // visible, but the mic keeps listening (onend restarts it)
        return;
      }
      if (code === 'aborted') return; // we aborted it ourselves (pause / restart)
      fatal = true;
      wantListeningRef.current = false;
      setStatus('idle');
      fail(code);
    };

    rec.onend = () => {
      console.log(TAG, 'onend (browser). wantListening=', wantListeningRef.current, 'paused=', pausedRef.current);
      if (recRef.current !== rec) return; // replaced or stopped on purpose
      baseTextRef.current = liveTextRef.current; // keep what we heard across the restart
      if (wantListeningRef.current && !pausedRef.current && !fatal) {
        try {
          startBrowserEngine();
        } catch (err) {
          console.error(TAG, 'restart failed', err);
          setStatus('idle');
          fail('restart-failed', `Could not restart the microphone: ${err.message}`);
        }
      } else if (!pausedRef.current) {
        setStatus('idle');
      }
    };

    recRef.current = rec;
    rec.start();
  }, [SpeechRec, emitFinal, fail]);

  /* ------------------------------ cloud engine ------------------------------ */

  const cleanupCloud = useCallback(() => {
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const finishCloudRecording = useCallback(async () => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const mime = mediaRecRef.current?.mimeType || 'audio/webm';
    mediaRecRef.current = null;
    cleanupCloud();

    if (!sendAfterStopRef.current || !heardSpeechRef.current || !chunks.length) {
      console.log(TAG, 'cloud: nothing to transcribe (no speech heard or cancelled)');
      setStatus('idle');
      if (sendAfterStopRef.current && !heardSpeechRef.current) fail('no-speech');
      return;
    }

    setStatus('transcribing');
    try {
      const blob = new Blob(chunks, { type: mime });
      console.log(TAG, `cloud: uploading ${(blob.size / 1024).toFixed(1)} KB for transcription`);
      const { text, lang } = await transcribeAudio(blob, whisperHint(cb.current.langCode));
      console.log(TAG, 'cloud: transcript =', JSON.stringify(text), 'lang =', lang);
      if (lang) cb.current.onDetectedLang?.(lang);
      if (!text.trim()) {
        setStatus('idle');
        fail('no-speech');
        return;
      }
      liveTextRef.current = text;
      cb.current.onText?.(text, { isFinal: true });
      setStatus('idle');
      emitFinal(text, lang);
    } catch (err) {
      console.error(TAG, 'cloud STT failed', err);
      setStatus('idle');
      fail(err.code || 'stt-failed', err.message);
    }
  }, [cleanupCloud, emitFinal, fail]);

  const startCloudEngine = useCallback(async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error(TAG, 'getUserMedia failed', err);
      const code =
        err.name === 'NotAllowedError' || err.name === 'SecurityError'
          ? 'not-allowed'
          : err.name === 'NotFoundError' || err.name === 'NotReadableError'
            ? 'audio-capture'
            : 'audio-capture';
      wantListeningRef.current = false;
      setStatus('idle');
      fail(code);
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    heardSpeechRef.current = false;
    lastVoiceAtRef.current = Date.now();
    sendAfterStopRef.current = true;

    const mimeType = pickMimeType();
    const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstart = () => {
      console.log(TAG, 'onstart (cloud MediaRecorder)', mr.mimeType);
      setStatus('listening');
      setError('');
    };
    mr.onerror = (e) => {
      console.error(TAG, 'MediaRecorder error', e);
      fail('audio-capture', 'Recording failed. Please try again.');
    };
    mr.onstop = () => {
      console.log(TAG, 'onend (cloud MediaRecorder stopped)');
      finishCloudRecording();
    };

    // Voice-activity detection so we can auto-stop after `silenceMs` of quiet.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      vadTimerRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        if (rms > SILENCE_RMS) {
          heardSpeechRef.current = true;
          lastVoiceAtRef.current = Date.now();
        } else if (
          heardSpeechRef.current &&
          Date.now() - lastVoiceAtRef.current > cb.current.silenceMs &&
          mediaRecRef.current?.state === 'recording'
        ) {
          console.log(TAG, `cloud: ${cb.current.silenceMs}ms silence -> stop & transcribe`);
          mediaRecRef.current.stop();
        }
      }, 100);
    } catch (err) {
      console.warn(TAG, 'VAD unavailable; use "Done Speaking" to send', err);
    }

    mr.start(250);
  }, [fail, finishCloudRecording]);

  /* ------------------------------ public API ------------------------------ */

  const start = useCallback(() => {
    if (!supported) {
      fail('unsupported', 'This browser cannot record audio. Please type your message instead.');
      return false;
    }
    setError('');
    wantListeningRef.current = true;
    pausedRef.current = false;
    sentRef.current = false;
    baseTextRef.current = '';
    liveTextRef.current = '';
    clearSilenceTimer();
    stopBrowserEngine();

    // Prioritize built-in browser SpeechRecognition whenever supported (Chrome, Edge, Android).
    // Fall back to Cloud MediaRecorder only on browsers without SpeechRecognition (e.g. Firefox).
    const useCloud = !SpeechRec;
    if (useCloud) {
      if (!cloudCapable) {
        fail('unsupported', 'This browser has no speech recognition and cannot record audio.');
        wantListeningRef.current = false;
        return false;
      }
      setEngine('cloud');
      startCloudEngine();
      return true;
    }

    setEngine('browser');
    try {
      startBrowserEngine();
      return true;
    } catch (err) {
      console.error(TAG, 'start() threw', err);
      wantListeningRef.current = false;
      fail('start-failed', `Could not start the microphone: ${err.message}`);
      return false;
    }
  }, [SpeechRec, cloudCapable, fail, startBrowserEngine, startCloudEngine, stopBrowserEngine, supported]);

  const stop = useCallback(() => {
    console.log(TAG, 'stop()');
    wantListeningRef.current = false;
    pausedRef.current = false;
    clearSilenceTimer();
    stopBrowserEngine();
    if (mediaRecRef.current?.state === 'recording') {
      sendAfterStopRef.current = false;
      mediaRecRef.current.stop();
    } else {
      cleanupCloud();
    }
    setStatus('idle');
  }, [cleanupCloud, stopBrowserEngine]);

  /** "Done Speaking -> Send": stop listening and send what has been heard right now. */
  const finish = useCallback(() => {
    console.log(TAG, 'finish() (Done Speaking)');
    wantListeningRef.current = false;
    clearSilenceTimer();
    if (mediaRecRef.current?.state === 'recording') {
      sendAfterStopRef.current = true;
      heardSpeechRef.current = heardSpeechRef.current || chunksRef.current.length > 0;
      mediaRecRef.current.stop(); // -> onstop -> transcribe -> emitFinal
      return;
    }
    stopBrowserEngine();
    setStatus('idle');
    emitFinal(liveTextRef.current, cb.current.langCode);
  }, [emitFinal, stopBrowserEngine]);

  /** Echo guard: silence the mic while the assistant is speaking. */
  const pause = useCallback(() => {
    if (!wantListeningRef.current) return false;
    console.log(TAG, 'pause() - assistant speaking');
    pausedRef.current = true;
    clearSilenceTimer();
    stopBrowserEngine();
    if (mediaRecRef.current?.state === 'recording') {
      sendAfterStopRef.current = false;
      mediaRecRef.current.stop();
    }
    setStatus('idle');
    return true;
  }, [stopBrowserEngine]);

  const resume = useCallback(() => {
    if (!pausedRef.current || !wantListeningRef.current) return;
    console.log(TAG, 'resume() - assistant finished');
    pausedRef.current = false;
    start();
  }, [start]);

  useEffect(
    () => () => {
      wantListeningRef.current = false;
      clearSilenceTimer();
      stopBrowserEngine();
      try {
        if (mediaRecRef.current?.state === 'recording') {
          sendAfterStopRef.current = false;
          mediaRecRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      cleanupCloud();
    },
    [cleanupCloud, stopBrowserEngine]
  );

  return {
    status,
    error,
    engine,
    supported,
    browserRecognition: Boolean(SpeechRec),
    isListening: status === 'listening',
    start,
    stop,
    finish,
    pause,
    resume,
    clearError: () => setError(''),
  };
}

