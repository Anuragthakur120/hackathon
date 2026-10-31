import en from './en.json';
import hi from './hi.json';
import mr from './mr.json';
import gu from './gu.json';
import bn from './bn.json';
import ta from './ta.json';
import te from './te.json';

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en-IN',
    shortCode: 'en',
    nativeLabel: 'English',
    englishName: 'English',
  },
  {
    code: 'hi-IN',
    shortCode: 'hi',
    nativeLabel: 'हिन्दी',
    englishName: 'Hindi',
  },
  {
    code: 'mr-IN',
    shortCode: 'mr',
    nativeLabel: 'मराठी',
    englishName: 'Marathi',
  },
  {
    code: 'gu-IN',
    shortCode: 'gu',
    nativeLabel: 'ગુજરાતી',
    englishName: 'Gujarati',
  },
  {
    code: 'bn-IN',
    shortCode: 'bn',
    nativeLabel: 'বাংলা',
    englishName: 'Bengali',
  },
  {
    code: 'ta-IN',
    shortCode: 'ta',
    nativeLabel: 'தமிழ்',
    englishName: 'Tamil',
  },
  {
    code: 'te-IN',
    shortCode: 'te',
    nativeLabel: 'తెలుగు',
    englishName: 'Telugu',
  },
];

export const DEFAULT_LANGUAGE = 'en-IN';
export const LANGUAGE_STORAGE_KEY = 'nagarsathi_lang';

export const BUNDLES = {
  'en-IN': en,
  en,
  'hi-IN': hi,
  hi,
  'mr-IN': mr,
  mr,
  'gu-IN': gu,
  gu,
  'bn-IN': bn,
  bn,
  'ta-IN': ta,
  ta,
  'te-IN': te,
  te,
};

const SHORT_TO_BCP47 = {
  en: 'en-IN',
  'en-in': 'en-IN',
  hi: 'hi-IN',
  'hi-in': 'hi-IN',
  mr: 'mr-IN',
  'mr-in': 'mr-IN',
  gu: 'gu-IN',
  'gu-in': 'gu-IN',
  bn: 'bn-IN',
  'bn-in': 'bn-IN',
  ta: 'ta-IN',
  'ta-in': 'ta-IN',
  te: 'te-IN',
  'te-in': 'te-IN',
};

export function normalizeLangCode(lang) {
  if (!lang || typeof lang !== 'string') return DEFAULT_LANGUAGE;
  const cleaned = lang.trim().toLowerCase();
  if (SHORT_TO_BCP47[cleaned]) return SHORT_TO_BCP47[cleaned];
  const prefix = cleaned.split('-')[0];
  if (SHORT_TO_BCP47[prefix]) return SHORT_TO_BCP47[prefix];
  return DEFAULT_LANGUAGE;
}

export function toBcp47Lang(lang) {
  return normalizeLangCode(lang);
}

export function toShortLangCode(lang) {
  return normalizeLangCode(lang).split('-')[0];
}

export function getLanguageMeta(lang) {
  const bcp47 = normalizeLangCode(lang);
  return (
    SUPPORTED_LANGUAGES.find((item) => item.code === bcp47) ||
    SUPPORTED_LANGUAGES[0]
  );
}

export function getDictionary(lang = DEFAULT_LANGUAGE) {
  const normalized = normalizeLangCode(lang);
  return BUNDLES[normalized] || BUNDLES['en-IN'];
}

export function getSavedLanguage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved) return normalizeLangCode(saved);
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return DEFAULT_LANGUAGE;
}

export function saveLanguage(lang) {
  const normalized = normalizeLangCode(lang);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = normalized.split('-')[0];
    }
  } catch {
    // Ignore storage write errors
  }
  return normalized;
}

function resolveKeyPath(dict, keyPath) {
  if (!dict || !keyPath) return undefined;
  const parts = String(keyPath).split('.');
  let current = dict;
  for (const part of parts) {
    if (
      current &&
      typeof current === 'object' &&
      Object.prototype.hasOwnProperty.call(current, part)
    ) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function t(lang = DEFAULT_LANGUAGE, keyPath = '', customBundles = null) {
  const normalized = normalizeLangCode(lang);
  const short = normalized.split('-')[0];
  const activeBundles = customBundles || BUNDLES;

  const primaryDict =
    activeBundles[normalized] || activeBundles[short] || null;
  const primaryValue = resolveKeyPath(primaryDict, keyPath);
  if (primaryValue !== undefined && primaryValue !== '') {
    return primaryValue;
  }

  // Fall back to English for a missing key
  const englishDict =
    activeBundles['en-IN'] || activeBundles.en || BUNDLES['en-IN'];
  const fallbackValue = resolveKeyPath(englishDict, keyPath);
  if (fallbackValue !== undefined && fallbackValue !== '') {
    return fallbackValue;
  }

  return keyPath;
}
