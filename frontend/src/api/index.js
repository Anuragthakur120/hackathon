import { mockApi, DEFAULT_CHECKLIST, DEFAULT_DRAFT } from './mockApi.js';
import {
  realApi,
  configureRealApi,
  getRealApiNetworkState,
  subscribeRealApiNetworkState,
} from './realApi.js';

let runtimeModeOverride = null;

export function setApiModeOverride(mode) {
  runtimeModeOverride = mode || null;
}

export function getApiMode(overrideMode) {
  if (overrideMode) return overrideMode;
  if (runtimeModeOverride) return runtimeModeOverride;
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_MODE
  ) {
    return import.meta.env.VITE_API_MODE;
  }
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)
  ) {
    return 'real';
  }
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    window.location.hostname.includes('vercel.app')
  ) {
    return 'real';
  }
  return 'mock';
}

export function selectApi(overrideMode) {
  return getApiMode(overrideMode) === 'real' ? realApi : mockApi;
}

const dynamicApi = {};
for (const methodName of Object.keys(mockApi)) {
  dynamicApi[methodName] = (...args) => selectApi()[methodName](...args);
}

export const api = dynamicApi;
export {
  mockApi,
  realApi,
  configureRealApi,
  getRealApiNetworkState,
  subscribeRealApiNetworkState,
  DEFAULT_CHECKLIST,
  DEFAULT_DRAFT,
};
