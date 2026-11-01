import { toBcp47Lang } from '../i18n/index.js';

let voices = [];
let activeUtterances = [];
if (typeof window !== 'undefined') {
  window.__ns_active_utterances = activeUtterances;
}

function getSynth() {
  if (typeof globalThis !== 'undefined' && globalThis.speechSynthesis) {
    return globalThis.speechSynthesis;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    return window.speechSynthesis;
  }
  return null;
}

export const loadVoices = () => {
  const synth = getSynth();
  if (!synth || typeof synth.getVoices !== 'function') {
    voices = [];
    return voices;
  }
  voices = synth.getVoices() || [];
  return voices;
};

const initialSynth = getSynth();
if (initialSynth) {
  loadVoices();
  initialSynth.onvoiceschanged = loadVoices;
}

export function pickVoice(lang = 'en-IN', availableVoices) {
  const bcp47 = toBcp47Lang(lang);
  const list = Array.isArray(availableVoices) ? availableVoices : loadVoices();
  if (!list.length) return null;
  const prefix = String(bcp47).split('-')[0];
  return (
    list.find((v) => v.lang === bcp47) ||
    list.find((v) => v.lang && v.lang.startsWith(prefix)) ||
    list.find((v) => v.lang === 'hi-IN') || // Marathi/Indian missing -> Hindi fallback
    list.find((v) => v.lang === 'en-IN') ||
    null
  );
}

/**
 * Formats speech text according to NagarSathi speech rules:
 * - Strips URLs and non-spoken symbols
 * - Reads numbers/IDs digit-by-digit when part of codes like PEN-2026-88213 or REF-5521
 */
export function formatSpeechText(rawText = '') {
  return String(rawText)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[/*#_~`<>[\]{}|\\^]/g, ' ')
    .replace(/\b([A-Z]{2,4})-(\d[\d-]*)\b/g, (_, prefix, digits) => {
      const spelledPrefix = prefix.split('').join(' ');
      const spelledDigits = digits.replace(/-/g, ' ').split('').join(' ');
      return `${spelledPrefix} ${spelledDigits}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitIntoSentences(text = '') {
  return String(text)
    .split(/(?<=[.?!।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function speak(
  text,
  { lang = 'en-IN', rate = 0.85, onStart, onEnd } = {}
) {
  const bcp47 = toBcp47Lang(lang);
  const synth = getSynth();
  if (!synth || !text) {
    if (typeof onStart === 'function') onStart();
    if (typeof onEnd === 'function') onEnd();
    return [];
  }

  loadVoices();
  synth.cancel();

  // Handle Chrome paused state bug
  if (synth.paused) {
    try {
      synth.resume();
    } catch {
      // Ignore
    }
  }

  if (typeof onStart === 'function') {
    onStart();
  }

  // Split into sentences, otherwise Chrome stops mid-way on long text
  const parts = splitIntoSentences(text);
  if (parts.length === 0) {
    if (typeof onEnd === 'function') onEnd();
    return [];
  }

  const UtteranceCtor =
    (typeof globalThis !== 'undefined' && globalThis.SpeechSynthesisUtterance) ||
    (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) ||
    function MockUtterance(t) {
      this.text = t;
    };

  activeUtterances = [];
  if (typeof window !== 'undefined') {
    window.__ns_active_utterances = activeUtterances;
  }

  const utterances = parts.map((p, i) => {
    const u = new UtteranceCtor(p);
    u.rate = rate;
    const v = pickVoice(bcp47);
    if (v) {
      u.voice = v;
      // When voice is picked, align u.lang with voice's language so Chrome doesn't drop the audio
      u.lang = v.lang || bcp47;
    } else {
      u.lang = bcp47;
    }

    const isLast = i === parts.length - 1;
    if (isLast && typeof onEnd === 'function') {
      u.onend = () => {
        activeUtterances = [];
        if (typeof window !== 'undefined') window.__ns_active_utterances = [];
        onEnd();
      };
    }

    u.onerror = (err) => {
      console.debug('Speech utterance ended or skipped:', err);
      if (isLast && typeof onEnd === 'function') {
        activeUtterances = [];
        if (typeof window !== 'undefined') window.__ns_active_utterances = [];
        onEnd();
      }
    };

    activeUtterances.push(u);
    try {
      synth.speak(u);
    } catch (speakErr) {
      console.warn('synth.speak error:', speakErr);
      if (isLast && typeof onEnd === 'function') {
        onEnd();
      }
    }
    return u;
  });

  return utterances;
}

export const stopSpeaking = () => {
  const synth = getSynth();
  if (synth && typeof synth.cancel === 'function') {
    synth.cancel();
  }
};

export function checkVoiceSupport(lang = 'mr-IN') {
  const list = loadVoices();
  const hasNativeMarathi = list.some(
    (v) => v.lang === 'mr-IN' || (v.lang && v.lang.startsWith('mr'))
  );
  const selected = pickVoice(lang, list);
  const fallbackToHindi =
    lang.startsWith('mr') &&
    !hasNativeMarathi &&
    Boolean(selected && selected.lang === 'hi-IN');

  const sttSupported = Boolean(
    typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  return {
    ttsSupported: Boolean(getSynth()),
    sttSupported,
    hasNativeMarathi,
    fallbackToHindi,
    selectedVoiceName: selected ? selected.name || selected.lang : null,
    selectedVoiceLang: selected ? selected.lang : null,
  };
}

export const FIXED_AUDIO_SLOTS = Object.freeze({
  welcome: 'welcome.mp3',
  consent: 'consent.mp3',
  approval: 'approval.mp3',
});

export function getFixedAudioUrl(lang = 'mr-IN', slotKey = 'welcome') {
  const file = FIXED_AUDIO_SLOTS[slotKey];
  if (!file) return null;
  return `/audio/${lang}/${file}`;
}

export function playFixedAudioOrSpeak(
  slotKeyOrOptions,
  fallbackText,
  options = {}
) {
  let slotKey = slotKeyOrOptions;
  let text = fallbackText;
  let opts = options;

  // Support polymorphic signatures:
  // 1. playFixedAudioOrSpeak('welcome', text, { lang })
  // 2. playFixedAudioOrSpeak({ text: '...', lang: '...' })
  // 3. playFixedAudioOrSpeak('Text to speak')
  if (typeof slotKeyOrOptions === 'object' && slotKeyOrOptions !== null) {
    text = slotKeyOrOptions.text || slotKeyOrOptions.speech || slotKeyOrOptions.display || slotKeyOrOptions.fallbackText || '';
    slotKey = slotKeyOrOptions.slotKey || 'welcome';
    opts = slotKeyOrOptions;
  } else if (typeof slotKeyOrOptions === 'string' && fallbackText === undefined) {
    text = slotKeyOrOptions;
    slotKey = 'welcome';
  }

  const lang = opts.lang || 'mr-IN';
  const rate = opts.rate || 0.85;
  const onStart = opts.onStart;
  const onEnd = opts.onEnd;

  const audioUrl = getFixedAudioUrl(lang, slotKey);
  if (
    typeof window !== 'undefined' &&
    typeof window.Audio === 'function' &&
    window.__NAGARSATHI_ENABLE_MP3_SLOTS__ === true &&
    audioUrl
  ) {
    try {
      const audio = new window.Audio(audioUrl);
      if (typeof onStart === 'function') onStart();
      audio.onended = () => {
        if (typeof onEnd === 'function') onEnd();
      };
      audio.onerror = () => {
        speak(text, { lang, rate, onEnd });
      };
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          speak(text, { lang, rate, onEnd });
        });
      }
      return;
    } catch {
      // Fall back to browser TTS
    }
  }
  speak(text, { lang, rate, onStart, onEnd });
}
