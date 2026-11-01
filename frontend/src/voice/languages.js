/**
 * Speech language table for the AI Voice Assistant (/assistant).
 *
 * NOTE: this is intentionally independent of `i18n/index.js` (`toBcp47Lang`), which only knows the
 * 7 UI languages. The voice layer must also handle Kannada, Punjabi and Urdu.
 */

export const SPEECH_LANGUAGES = Object.freeze([
  { id: 'auto', label: 'Auto-detect (cloud)', code: null, name: 'Auto' },
  { id: 'hi', label: 'हिन्दी (Hindi)', code: 'hi-IN', name: 'Hindi' },
  { id: 'mr', label: 'मराठी (Marathi)', code: 'mr-IN', name: 'Marathi' },
  { id: 'en', label: 'English (India)', code: 'en-IN', name: 'English' },
  { id: 'gu', label: 'ગુજરાતી (Gujarati)', code: 'gu-IN', name: 'Gujarati' },
  { id: 'bn', label: 'বাংলা (Bengali)', code: 'bn-IN', name: 'Bengali' },
  { id: 'ta', label: 'தமிழ் (Tamil)', code: 'ta-IN', name: 'Tamil' },
  { id: 'te', label: 'తెలుగు (Telugu)', code: 'te-IN', name: 'Telugu' },
  { id: 'kn', label: 'ಕನ್ನಡ (Kannada)', code: 'kn-IN', name: 'Kannada' },
  { id: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', code: 'pa-IN', name: 'Punjabi' },
  { id: 'ur', label: 'اردو (Urdu)', code: 'ur-IN', name: 'Urdu' },
]);

export function getLangById(id) {
  return SPEECH_LANGUAGES.find((l) => l.id === id) || SPEECH_LANGUAGES[0];
}

export function getLangByCode(code) {
  const prefix = String(code || '').toLowerCase().split(/[-_]/)[0];
  return SPEECH_LANGUAGES.find((l) => l.code && l.id === prefix) || null;
}

export function langDisplayName(code) {
  const meta = getLangByCode(code);
  return meta ? `${meta.name} (${meta.code})` : String(code || 'Unknown');
}

/** Maps the app's UI language (e.g. mr-IN) to a speech-language selector id. */
export function uiLangToSpeechId(uiLang) {
  const prefix = String(uiLang || 'en').toLowerCase().split(/[-_]/)[0];
  return SPEECH_LANGUAGES.some((l) => l.id === prefix) ? prefix : 'en';
}

/** ISO-639-1 hint for Whisper (hi, mr, en...) from a BCP-47 code. */
export function whisperHint(code) {
  if (!code) return '';
  return String(code).toLowerCase().split(/[-_]/)[0];
}

const SCRIPTS = [
  { test: /[\u0A80-\u0AFF]/, code: 'gu-IN' },
  { test: /[\u0980-\u09FF]/, code: 'bn-IN' },
  { test: /[\u0B80-\u0BFF]/, code: 'ta-IN' },
  { test: /[\u0C00-\u0C7F]/, code: 'te-IN' },
  { test: /[\u0C80-\u0CFF]/, code: 'kn-IN' },
  { test: /[\u0A00-\u0A7F]/, code: 'pa-IN' },
  { test: /[\u0600-\u06FF]/, code: 'ur-IN' },
];

const MARATHI_MARKERS =
  /(आहे|आहेत|काय|कसा|कशी|कसे|मला|माझा|माझी|माझे|तुम्ही|तुमचा|करायचा|करायची|काढायचा|काढायचे|पाहिजे|नाही|भरायचा)/;

const HINGLISH_MARKERS =
  /\b(kaise|kaisa|kya|kyun|kyu|mujhe|mera|meri|mere|hai|hain|karna|karni|karein|kar do|chahiye|bharna|bhar do|nahi|nahin|aap|aapka|batao|bataiye|batayen|madad|paisa|sarkar|yojana|pension|ghar|abhi|dobara|dheere|haan|ruko)\b/i;

export function isHinglish(text) {
  const t = String(text || '');
  if (/[\u0600-\u06FF]/u.test(t) || /[\u0900-\u0DFF]/u.test(t)) return false; // contains an Indic / Arabic script
  const hits = t.toLowerCase().match(new RegExp(HINGLISH_MARKERS.source, 'gi'));
  return Boolean(hits && hits.length >= 2);
}

/**
 * Detects the language of a message from its script. Latin text is treated as English (Hinglish is
 * flagged separately via isHinglish). `hint` is the user's selected language code (if any).
 */
export function detectLangFromText(text, hint = null) {
  const t = String(text || '');
  for (const s of SCRIPTS) {
    if (s.test.test(t)) return s.code;
  }
  if (/[\u0900-\u097F]/.test(t)) {
    if (hint === 'mr-IN' || hint === 'hi-IN') return hint;
    return MARATHI_MARKERS.test(t) ? 'mr-IN' : 'hi-IN';
  }
  return 'en-IN';
}
