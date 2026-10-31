import { mockApi, DEFAULT_CHECKLIST, DEFAULT_DRAFT } from './mockApi.js';
import { realApi } from './realApi.js';

export function getApiMode(overrideMode) {
  if (overrideMode) return overrideMode;
  const mode =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_MODE) ||
    'mock';
  return mode;
}

export function selectApi(overrideMode) {
  return getApiMode(overrideMode) === 'real' ? realApi : mockApi;
}

export const api = selectApi();
export { mockApi, realApi, DEFAULT_CHECKLIST, DEFAULT_DRAFT };
