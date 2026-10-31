import mr from './mr.json';
import hi from './hi.json';
import en from './en.json';

export const SUPPORTED_LANGUAGES = [
  {
    code: 'mr-IN',
    shortCode: 'mr',
    nativeLabel: 'मराठी',
    subLabel: 'Marathi (Default)',
  },
  {
    code: 'hi-IN',
    shortCode: 'hi',
    nativeLabel: 'हिंदी',
    subLabel: 'Hindi',
  },
  {
    code: 'en-IN',
    shortCode: 'en',
    nativeLabel: 'English',
    subLabel: 'English',
  },
];

export const DEFAULT_LANGUAGE = 'mr-IN';

export const DICTIONARIES = {
  'mr-IN': mr,
  mr,
  'hi-IN': hi,
  hi,
  'en-IN': en,
  en,
};

export function normalizeLangCode(lang = DEFAULT_LANGUAGE) {
  if (lang === 'hi' || lang === 'hi-IN') return 'hi-IN';
  if (lang === 'en' || lang === 'en-IN') return 'en-IN';
  return 'mr-IN';
}

export function getDictionary(lang = DEFAULT_LANGUAGE) {
  const normalized = normalizeLangCode(lang);
  return DICTIONARIES[normalized] || mr;
}

export function t(lang, keyPath) {
  const dict = getDictionary(lang);
  const parts = keyPath.split('.');
  let current = dict;
  for (const part of parts) {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      current = current[part];
    } else {
      return keyPath;
    }
  }
  return current;
}

