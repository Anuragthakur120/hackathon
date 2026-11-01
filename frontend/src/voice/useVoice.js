import { useState, useRef, useCallback, useEffect } from 'react';
import {
  speak,
  stopSpeaking,
  checkVoiceSupport,
  formatSpeechText,
} from './speak.js';
import { matchVoiceCommand, VOICE_COMMAND } from './commands.js';
import { toBcp47Lang } from '../i18n/index.js';

export const DEFAULT_SPEECH_RATE = 0.85;
export const SLOW_SPEECH_RATE = 0.65;

export function createMicController({
  lang = 'mr-IN',
  rate = DEFAULT_SPEECH_RATE,
  recognitionInstance = null,
  onCommand,
  onTranscript,
} = {}) {
  let currentRate = rate;
  let lastSpoken = '';
  let micWasActiveBeforeSpeak = false;
  let isListening = false;
  let isSpeaking = false;

  const rec = recognitionInstance;

  const stopMic = () => {
    if (rec && isListening) {
      isListening = false;
      if (typeof rec.stop === 'function') {
        rec.stop();
      }
    }
  };

  const startMic = () => {
    if (rec && !isListening && !isSpeaking) {
      isListening = true;
      rec.lang = toBcp47Lang(lang);
      if (typeof rec.start === 'function') {
        rec.start();
      }
    }
  };

  const speakWithEchoGuard = (text, customOpts = {}) => {
    const formatted = formatSpeechText(text);
    lastSpoken = formatted;
    micWasActiveBeforeSpeak = isListening || Boolean(customOpts.resumeMicAfter);

    // Turn mic OFF while the app is speaking so it never hears itself
    stopMic();
    isSpeaking = true;

    return speak(formatted, {
      lang: customOpts.lang || lang,
      rate: customOpts.rate || currentRate,
      onStart: () => {
        stopMic();
        isSpeaking = true;
        if (typeof customOpts.onStart === 'function') customOpts.onStart();
      },
      onEnd: () => {
        isSpeaking = false;
        if (micWasActiveBeforeSpeak) {
          startMic();
        }
        if (typeof customOpts.onEnd === 'function') customOpts.onEnd();
      },
    });
  };

  const handleRecognizedSpeech = (utteranceText) => {
    const cmd = matchVoiceCommand(utteranceText);
    if (cmd === VOICE_COMMAND.SLOWER) {
      currentRate = Math.max(0.5, Number((currentRate - 0.2).toFixed(2)));
      if (lastSpoken) {
        speakWithEchoGuard(lastSpoken, { rate: currentRate });
      }
      if (typeof onCommand === 'function') onCommand(cmd, utteranceText);
      return cmd;
    }
    if (cmd === VOICE_COMMAND.REPEAT) {
      if (lastSpoken) {
        speakWithEchoGuard(lastSpoken, { rate: currentRate });
      }
      if (typeof onCommand === 'function') onCommand(cmd, utteranceText);
      return cmd;
    }
    if (cmd === VOICE_COMMAND.STOP) {
      stopSpeaking();
      isSpeaking = false;
      stopMic();
      if (typeof onCommand === 'function') onCommand(cmd, utteranceText);
      return cmd;
    }
    if (cmd) {
      if (typeof onCommand === 'function') onCommand(cmd, utteranceText);
      return cmd;
    }
    if (typeof onTranscript === 'function') {
      onTranscript(utteranceText);
    }
    return null;
  };

  return {
    getState: () => ({
      isListening,
      isSpeaking,
      rate: currentRate,
      lastSpoken,
    }),
    startMic,
    stopMic,
    speakWithEchoGuard,
    handleRecognizedSpeech,
    setRate: (r) => {
      currentRate = r;
    },
  };
}

export function useVoice({
  language = 'mr-IN',
  onVoiceCommand,
  onSpokenInput,
  onResult,
} = {}) {
  const [autoPlay, setAutoPlay] = useState(true); // "Apne aap bolo" on by default
  const [rate, setRate] = useState(DEFAULT_SPEECH_RATE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState(null);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceCheckResult, setVoiceCheckResult] = useState(() =>
    checkVoiceSupport(language)
  );

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const userStoppedRef = useRef(false);
  const resumeListeningAfterSpeakRef = useRef(false);

  // Keep latest callbacks in refs to avoid stale closure in SpeechRecognition event handlers
  const onSpokenInputRef = useRef(onSpokenInput || onResult);
  useEffect(() => {
    onSpokenInputRef.current = onSpokenInput || onResult;
  }, [onSpokenInput, onResult]);

  const onVoiceCommandRef = useRef(onVoiceCommand);
  useEffect(() => {
    onVoiceCommandRef.current = onVoiceCommand;
  }, [onVoiceCommand]);

  useEffect(() => {
    setVoiceCheckResult(checkVoiceSupport(language));
  }, [language]);

  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setSttError(null);
    userStoppedRef.current = false;

    const SpeechRec =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRec) {
      setSttError('STT_UNSUPPORTED');
      isListeningRef.current = false;
      setIsListening(false);
      return false;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort ? recognitionRef.current.abort() : recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }

      const rec = new SpeechRec();
      rec.lang = toBcp47Lang(language);
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalTranscript += text + ' ';
          } else {
            interimTranscript += text;
          }
        }

        const fullTranscript = (finalTranscript + interimTranscript).trim();
        if (fullTranscript) {
          setLastTranscript(fullTranscript);
          if (typeof onSpokenInputRef.current === 'function') {
            onSpokenInputRef.current(fullTranscript);
          }
          const cmd = matchVoiceCommand(fullTranscript);
          if (cmd && typeof onVoiceCommandRef.current === 'function') {
            onVoiceCommandRef.current(cmd, fullTranscript);
          }
        }
      };

      rec.onerror = (err) => {
        const errType = err?.error || 'UNKNOWN_ERROR';
        if (errType === 'no-speech' || errType === 'aborted') {
          // Chrome pauses on silence or abort on re-init; keep listening active
          return;
        }
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setSttError('MIC_PERMISSION_DENIED');
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
          return;
        }
        if (errType === 'network') {
          setSttError('NETWORK_ERROR');
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
          return;
        }
        setSttError(errType);
      };

      rec.onend = () => {
        // Auto-restart if user did not explicitly stop the mic and Chrome stopped on a pause
        if (isListeningRef.current && !userStoppedRef.current) {
          try {
            rec.start();
          } catch {
            isListeningRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = rec;
      isListeningRef.current = true;
      setIsListening(true);
      rec.start();
      return true;
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setSttError(err?.message || 'START_FAILED');
      isListeningRef.current = false;
      setIsListening(false);
      return false;
    }
  }, [language]);

  const speakText = useCallback(
    (text, opts = {}) => {
      if (!text) return;
      const formatted = formatSpeechText(text);
      setLastSpokenText(formatted);

      const wasListening = isListening || Boolean(opts.resumeListening);
      resumeListeningAfterSpeakRef.current = wasListening;

      // Turn OFF mic while speaking so app never hears itself
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      isListeningRef.current = false;
      setIsListening(false);
      setIsSpeaking(true);

      speak(formatted, {
        lang: opts.lang || language,
        rate: opts.rate || rate,
        onEnd: () => {
          setIsSpeaking(false);
          if (resumeListeningAfterSpeakRef.current) {
            startListening();
          }
          if (typeof opts.onEnd === 'function') {
            opts.onEnd();
          }
        },
      });
    },
    [isListening, language, rate, startListening]
  );

  const stopAllSpeech = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    stopListening();
  }, [stopListening]);

  const runSelfCheck = useCallback(() => {
    const check = checkVoiceSupport(language);
    setVoiceCheckResult(check);
    const sampleSentence =
      'नमस्कार रमाबाई, नगरसाथीमध्ये तुमचे स्वागत आहे. आपली भाषा तपासणी पूर्ण झाली.';
    speakText(sampleSentence, { lang: 'mr-IN' });
    return check;
  }, [language, speakText]);

  return {
    autoPlay,
    setAutoPlay,
    rate,
    setRate,
    isSpeaking,
    isListening,
    sttError,
    sttSupported: voiceCheckResult.sttSupported,
    isSupported: voiceCheckResult.sttSupported,
    voiceCheckResult,
    lastSpokenText,
    lastTranscript,
    speakText,
    stopAllSpeech,
    startListening,
    stopListening,
    runSelfCheck,
  };
}
