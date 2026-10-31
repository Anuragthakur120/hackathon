import { mockApi, DEFAULT_CHECKLIST, DEFAULT_DRAFT } from './mockApi.js';
import { realApi } from './realApi.js';

export function getApiMode() {
  const mode =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_API_MODE) ||
    'mock';
  return mode;
}

export const api = getApiMode() === 'real' ? realApi : mockApi;
export { mockApi, realApi, DEFAULT_CHECKLIST, DEFAULT_DRAFT };
