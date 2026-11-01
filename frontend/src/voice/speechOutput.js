import { formatSpeechText } from './speak.js';
import { fetchTts } from '../api/voiceApi.js';

/**
 * Reply voice output for /assistant.
 *   1. Browser speechSynthesis voice matched by language (waits for `voiceschanged`).
 *   2. If no voice for that language exists -> backend /api/tts (cloud voice).
 *   3. If that fails too -> text only (the caller still shows the text).
 * Long replies are split into sentences and spoken as a queue. The default rate is 0.85.
 */

const TAG = '[NagarSathi TTS]';

// Chrome garbage-collects utterances that are only referenced locally, which silently cuts speech.
let keepAlive = [];
let activeController = null;

function getSynth() {
  if (typeof window !== 'undefined' && window.speechSynthesis) return window.speechSynthesis;
  return null;
}

function norm(code) {
  return String(code || '').replace('_', '-').toLowerCase();
}

export function getVoicesAsync(timeoutMs = 1500) {
  const synth = getSynth();
  if (!synth) return Promise.resolve([]);
  const now = synth.getVoices();
  if (now && now.length) return Promise.resolve(now);

  return new Promise((resolve) => {
    let timer = null;
    const done = () => {
      synth.removeEventListener?.('voiceschanged', onChanged);
      if (timer) clearTimeout(timer);
      resolve(synth.getVoices() || []);
    };
    const onChanged = () => {
      if ((synth.getVoices() || []).length) done();
    };
    synth.addEventListener?.('voiceschanged', onChanged);
    timer = setTimeout(done, timeoutMs);
  });
}

/** Exact locale match first (hi-IN), then any voice of the same language (hi-*). No cross-language guessing. */
export async function findVoiceForLang(code) {
  const voices = await getVoicesAsync();
  const want = norm(code);
  const prefix = want.split('-')[0];
  return (
    voices.find((v) => norm(v.lang) === want) ||
    voices.find((v) => norm(v.lang).split('-')[0] === prefix) ||
    null
  );
}

/** Reports which voices the browser has for each language (useful for diagnostics). */
export async function listVoiceSupport(codes) {
  const out = {};
  for (const c of codes) {
    const v = await findVoiceForLang(c);
    out[c] = v ? v.name : null;
  }
  return out;
}

function cleanForSpeech(text) {
  return formatSpeechText(String(text || ''))
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitIntoSpeechChunks(text, max = 220) {
  const sentences = cleanForSpeech(text)
    .split(/(?<=[.?!।۔])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];
  for (const s of sentences) {
    if (s.length <= max) {
      chunks.push(s);
      continue;
    }
    let buf = '';
    for (const word of s.split(' ')) {
      if ((buf + ' ' + word).trim().length > max) {
        if (buf) chunks.push(buf.trim());
        buf = word;
      } else {
        buf = `${buf} ${word}`;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
  }
  return chunks;
}

export function stopAllSpeech() {
  if (activeController) activeController.cancel();
  const synth = getSynth();
  if (synth) synth.cancel();
}

/**
 * Speaks `text` in `lang`. Returns `{ cancel, done }`. `onEnd` fires when playback finishes (not on cancel).
 * `onEngine('browser' | 'cloud' | 'text')` reports which path was used.
 */
export function speakReply(text, { lang = 'en-IN', rate = 0.85, onStart, onEnd, onEngine } = {}) {
  stopAllSpeech();

  let cancelled = false;
  let audio = null;
  let resolveDone = () => {};
  const done = new Promise((r) => {
    resolveDone = r;
  });

  const controller = {
    cancel() {
      cancelled = true;
      if (audio) {
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
      }
      if (activeController === controller) activeController = null;
      resolveDone();
    },
    done,
  };
  activeController = controller;

  const finish = () => {
    if (activeController === controller) activeController = null;
    keepAlive = [];
    if (!cancelled && typeof onEnd === 'function') onEnd();
    resolveDone();
  };

  const playBrowser = (chunks, voice) =>
    new Promise((resolve) => {
      const synth = getSynth();
      let i = 0;
      const next = () => {
        if (cancelled || i >= chunks.length) {
          resolve();
          return;
        }
        const u = new window.SpeechSynthesisUtterance(chunks[i++]);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = rate;
        u.onend = next;
        u.onerror = (e) => {
          console.warn(TAG, 'utterance error:', e.error);
          if (e.error === 'canceled' || e.error === 'interrupted') {
            resolve();
            return;
          }
          next();
        };
        keepAlive.push(u);
        synth.speak(u);
      };
      if (synth.paused) synth.resume();
      next();
    });

  const playCloud = async (chunks) => {
    let pending = fetchTts(chunks[0], lang, rate);
    for (let i = 0; i < chunks.length; i += 1) {
      const blob = await pending; // first failure throws -> caller falls back to text only
      if (cancelled) return true;
      pending =
        i + 1 < chunks.length
          ? fetchTts(chunks[i + 1], lang, rate).catch((err) => {
              console.warn(TAG, 'cloud chunk failed', err.message);
              return null;
            })
          : null;
      if (!blob) return i > 0;
      const url = URL.createObjectURL(blob);
      audio = new Audio(url);
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch((err) => {
          console.warn(TAG, 'audio.play blocked', err);
          resolve();
        });
      });
      URL.revokeObjectURL(url);
      if (!pending) break;
    }
    return true;
  };

  (async () => {
    const chunks = splitIntoSpeechChunks(text, 220);
    if (!chunks.length) {
      if (typeof onEngine === 'function') onEngine('text');
      finish();
      return;
    }

    let voice = null;
    if (getSynth() && typeof window.SpeechSynthesisUtterance === 'function') {
      voice = await findVoiceForLang(lang);
    }
    if (cancelled) return;

    if (voice) {
      console.log(TAG, `browser voice "${voice.name}" (${voice.lang}) for ${lang}`);
      if (typeof onEngine === 'function') onEngine('browser');
      if (typeof onStart === 'function') onStart();
      await playBrowser(chunks, voice);
      finish();
      return;
    }

    console.warn(TAG, `no browser voice for ${lang}; trying backend /api/tts`);
    try {
      const cloudChunks = splitIntoSpeechChunks(text, 350);
      if (typeof onStart === 'function') onStart();
      const ok = await playCloud(cloudChunks);
      if (cancelled) return;
      if (typeof onEngine === 'function') onEngine(ok ? 'cloud' : 'text');
    } catch (err) {
      console.warn(TAG, 'cloud TTS unavailable, showing text only:', err.message);
      if (typeof onEngine === 'function') onEngine('text');
    }
    finish();
  })();

  return controller;
}
