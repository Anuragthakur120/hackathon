import {
  CASE_STATUS,
  createInitialCaseState,
  transitionCaseState,
} from '../state/caseMachine.js';
import { normalizeLangCode } from '../i18n/index.js';
import { DEFAULT_CHECKLIST, DEFAULT_DRAFT } from './mockApi.js';

let customTransport = null;
let sessionToken = '';
let sessionCookie = '';
let realStore = createInitialCaseState('mr-IN');

const networkState = {
  loading: false,
  inFlightCount: 0,
  lastError: null,
};
const listeners = new Set();

function notifyListeners() {
  const snapshot = getRealApiNetworkState();
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch {
      // Ignore listener errors
    }
  }
}

export function getRealApiNetworkState() {
  return { ...networkState };
}

export function subscribeRealApiNetworkState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Allows tests or custom environments to supply a custom transport
 * `(url, options) => Promise<{ status, ok, headers, setCookies, body }>`
 * or reset to standard browser `fetch`.
 */
export function configureRealApi({ transport = null } = {}) {
  customTransport = transport;
  sessionToken = '';
  sessionCookie = '';
  realStore = createInitialCaseState('mr-IN');
  networkState.loading = false;
  networkState.inFlightCount = 0;
  networkState.lastError = null;
}

function getApiBaseUrl() {
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL
  ) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');
  }
  return '';
}

async function request(path, options = {}) {
  const lang = normalizeLangCode(
    options.language || realStore.language || 'mr-IN'
  );
  const fullPath = `${getApiBaseUrl()}${path}`;

  networkState.inFlightCount += 1;
  networkState.loading = true;
  networkState.lastError = null;
  notifyListeners();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-NagarSathi-Lang': lang,
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(options.headers || {}),
    };

    if (customTransport) {
      const parsedBody =
        typeof options.body === 'string' && options.body
          ? JSON.parse(options.body)
          : options.body;

      const res = await customTransport({
        method: options.method || 'GET',
        url: fullPath,
        headers,
        cookie: sessionCookie,
        body: parsedBody,
      });

      if (Array.isArray(res.setCookies)) {
        for (const c of res.setCookies) {
          if (String(c).startsWith('ns_token=')) {
            sessionCookie = String(c).split(';')[0];
          }
        }
      }

      const payload = res.body;
      if (res.status >= 400) {
        const err = new Error(
          payload?.display || payload?.error || `HTTP_${res.status}`
        );
        err.code = payload?.code || payload?.error || `HTTP_${res.status}`;
        err.status = res.status;
        err.display = payload?.display || err.message;
        err.speech = payload?.speech || err.display;
        throw err;
      }
      return payload;
    }

    const response = await fetch(fullPath, {
      method: options.method || 'GET',
      credentials: 'include',
      headers,
      ...(options.body ? { body: options.body } : {}),
    });

    const payload = await response.json();
    if (!response.ok) {
      const err = new Error(
        payload?.display || payload?.error || 'API Error'
      );
      err.code = payload?.code || payload?.error || `HTTP_${response.status}`;
      err.status = response.status;
      err.display = payload?.display || err.message;
      err.speech = payload?.speech || err.display;
      throw err;
    }
    return payload;
  } catch (err) {
    networkState.lastError = {
      code: err.code || 'NETWORK_ERROR',
      message: err.message,
      display: err.display || err.message,
    };
    throw err;
  } finally {
    networkState.inFlightCount = Math.max(0, networkState.inFlightCount - 1);
    networkState.loading = networkState.inFlightCount > 0;
    notifyListeners();
  }
}

async function ensureCitizenSession(language = 'mr-IN') {
  if (sessionToken || sessionCookie) return;
  const lang = normalizeLangCode(language);
  const res = await request('/api/auth/verify', {
    method: 'POST',
    language: lang,
    body: JSON.stringify({
      phone: '9876543210',
      otp: '123456',
      language: lang,
    }),
  });
  if (res?.data?.token) {
    sessionToken = res.data.token;
  }
}

export const realApi = {
  getState() {
    return { ...realStore };
  },

  async requestOtp({ phone = '9876543210', language = realStore.language } = {}) {
    const lang = normalizeLangCode(language);
    return request('/api/auth/otp', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({ phone, language: lang }),
    });
  },

  async verifyOtp({
    phone = '9876543210',
    otp = '123456',
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    const res = await request('/api/auth/verify', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({ phone, otp, language: lang }),
    });
    if (res?.data?.token) {
      sessionToken = res.data.token;
    }
    return res;
  },

  async createCaseFromTranscript({
    transcript = 'Meri pension band ho gayi',
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/intake', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'classify',
        transcript,
        caseId: realStore.id,
        language: lang,
      }),
    });

    if (res?.data?.service) {
      realStore = {
        ...createInitialCaseState(lang),
        id: res.data.caseId || realStore.id,
        status: CASE_STATUS.INTAKE,
        serviceId: res.data.service.id,
        serviceName: res.data.service.name,
        confidence: res.data.confidence,
        transcript,
      };
    }
    return res;
  },

  async answerCaseQuestion({
    caseId = realStore.id,
    answer = 'old_age_pension',
    fieldId = 'pensionType',
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    return request('/api/agents/intake', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'clarify',
        caseId,
        answer,
        fieldId,
        language: lang,
      }),
    });
  },

  async confirmService({
    caseId = realStore.id,
    serviceId = 'pension_restoration',
    confirmed = true,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/intake', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'confirm',
        caseId,
        serviceId,
        confirmed,
        language: lang,
      }),
    });

    await request(`/api/cases/${caseId}/confirm-service`, {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        serviceId: 'pension',
        confirmed,
        language: lang,
      }),
    });

    realStore = transitionCaseState(realStore, CASE_STATUS.SERVICE_CONFIRMED, {
      serviceId,
      serviceName: 'Old Age Pension Restoration',
      confidence: 0.96,
      language: lang,
    });
    return res;
  },

  async giveConsent({
    caseId = realStore.id,
    given = true,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request(`/api/cases/${caseId}/consent`, {
      method: 'POST',
      language: lang,
      body: JSON.stringify({ given, language: lang }),
    });

    if (!given) {
      return {
        ...res,
        data: {
          ...res.data,
          caseId,
          status: realStore.status,
          halted: true,
          consent: { given: false, timestamp: new Date().toISOString() },
        },
      };
    }

    const consentObj = {
      given: true,
      timestamp: res?.data?.consent?.timestamp || new Date().toISOString(),
    };
    realStore = transitionCaseState(realStore, CASE_STATUS.CONSENTED, {
      consent: consentObj,
      language: lang,
    });

    return {
      ...res,
      data: {
        ...res.data,
        caseId,
        status: realStore.status,
        consent: consentObj,
      },
    };
  },

  async uploadDocuments({
    caseId = realStore.id,
    documents = [],
    markReady = false,
    simulateIssue = null,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/documents', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        caseId,
        documents,
        markReady,
        simulateIssue,
        language: lang,
      }),
    });

    const targetStatus =
      res?.data?.status === 'DOCS_READY'
        ? CASE_STATUS.DOCS_READY
        : CASE_STATUS.DOCS_COLLECTING;

    realStore = transitionCaseState(realStore, targetStatus, {
      documents: res?.data?.checklist || DEFAULT_CHECKLIST,
      language: lang,
    });

    return res;
  },

  async fillDraft({
    caseId = realStore.id,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/portal', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'fillDraft',
        caseId,
        language: lang,
      }),
    });

    if (
      realStore.status === CASE_STATUS.CONSENTED ||
      realStore.status === CASE_STATUS.DOCS_COLLECTING
    ) {
      realStore = transitionCaseState(realStore, CASE_STATUS.DOCS_READY, {
        documents: DEFAULT_CHECKLIST,
      });
    }
    realStore = transitionCaseState(realStore, CASE_STATUS.FORM_FILLED, {
      draft: res?.data?.draft || DEFAULT_DRAFT,
      approval: { given: false, timestamp: null },
      language: lang,
    });

    return res;
  },

  async approveDraft({
    caseId = realStore.id,
    given = true,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request(`/api/cases/${caseId}/approve`, {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        given,
        byPhysicalButton: true,
        language: lang,
      }),
    });

    const approval = {
      given: Boolean(given),
      timestamp:
        res?.data?.approval?.timestamp || new Date().toISOString(),
    };

    if (given) {
      realStore = transitionCaseState(realStore, CASE_STATUS.APPROVED, {
        approval,
        language: lang,
      });
    }

    return {
      ...res,
      data: {
        ...res.data,
        caseId,
        status: realStore.status,
        approval,
      },
    };
  },

  async submitApplication({
    caseId = realStore.id,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    // Client-side + Backend Gate 2 verification
    realStore = transitionCaseState(realStore, CASE_STATUS.SUBMITTED, {
      submission: {
        applicationId: 'PEN-2026-88213',
        submittedAt: new Date().toISOString(),
      },
      language: lang,
    });

    const res = await request('/api/agents/portal', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'submit',
        caseId,
        language: lang,
      }),
    });

    return {
      ...res,
      data: {
        ...res.data,
        caseId,
        status: realStore.status,
        applicationId: res?.data?.applicationId || 'PEN-2026-88213',
      },
    };
  },

  async getCaseStatus({
    caseId = realStore.id,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/tracker', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'track',
        caseId,
        language: lang,
      }),
    });

    if (
      realStore.status === CASE_STATUS.SUBMITTED ||
      realStore.status === CASE_STATUS.CALLED ||
      realStore.status === CASE_STATUS.QUERY_RAISED
    ) {
      realStore = transitionCaseState(realStore, CASE_STATUS.TRACKING, {
        tracking: res?.data?.tracking || {
          stage: 'Taluka Social Welfare Verification',
          daysElapsed: 2,
          stalled: false,
          query: null,
          lastUpdated: new Date().toISOString(),
        },
        language: lang,
      });
    }

    return {
      ...res,
      data: {
        ...res.data,
        caseId,
        status: realStore.status,
        applicationId: res?.data?.applicationId || 'PEN-2026-88213',
        approval: realStore.approval,
        draft: realStore.draft,
        tracking: res?.data?.tracking || realStore.tracking,
      },
    };
  },

  async startCall({
    caseId = realStore.id,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    return request('/api/agents/caller', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'start',
        caseId,
        language: lang,
      }),
    });
  },

  async callTurn({
    caseId = realStore.id,
    callId = 'CALL-SIM-001',
    officerUtterance = '',
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    return request('/api/agents/caller', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'turn',
        caseId,
        callId,
        officerUtterance,
        language: lang,
      }),
    });
  },

  async endCall({
    caseId = realStore.id,
    callId = 'CALL-SIM-001',
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/caller', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'end',
        caseId,
        callId,
        language: lang,
      }),
    });

    realStore = transitionCaseState(realStore, CASE_STATUS.CALLED, {
      callRecord: {
        callId,
        referenceId: res?.data?.referenceId || 'REF-5521',
        completedAt: new Date().toISOString(),
      },
      language: lang,
    });

    return res;
  },

  async getProfile({ language = realStore.language } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    return request(`/api/profile?language=${encodeURIComponent(lang)}`, {
      method: 'GET',
      language: lang,
    });
  },

  async patchProfile({
    name = 'Ramabai Kulkarni',
    saveProfile = true,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    realStore.language = lang;
    await ensureCitizenSession(lang);

    return request('/api/profile', {
      method: 'PATCH',
      language: lang,
      body: JSON.stringify({
        name,
        saveProfile,
        consentGiven: Boolean(saveProfile),
        language: lang,
      }),
    });
  },

  async deleteProfile({ language = realStore.language } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    return request('/api/profile', {
      method: 'DELETE',
      language: lang,
      body: JSON.stringify({ language: lang }),
    });
  },

  async deleteAllMyData({ language = realStore.language } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/profile/delete-all-my-data', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({ language: lang }),
    });
    realStore = createInitialCaseState(lang);
    sessionToken = '';
    sessionCookie = '';
    return res;
  },

  async explainLetter({
    text = '',
    imageName = '',
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    return request('/api/agents/letter', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({ text, imageName, language: lang }),
    });
  },

  async demoRaiseQuery({
    caseId = realStore.id,
    queryText = '',
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/tracker', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'query',
        caseId,
        queryText,
        language: lang,
      }),
    });

    realStore = transitionCaseState(realStore, CASE_STATUS.QUERY_RAISED, {
      tracking: {
        ...(realStore.tracking || {}),
        query: res?.data?.query || {
          code: 'LIFE_CERT_PENDING',
          message: 'Re-verify Jeevan Pramaan certificate',
        },
      },
      language: lang,
    });
    return res;
  },

  async demoSkipDays({
    caseId = realStore.id,
    days = 21,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/tracker', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'stalled',
        caseId,
        days,
        language: lang,
      }),
    });

    realStore = transitionCaseState(realStore, CASE_STATUS.STALLED, {
      tracking: {
        ...(realStore.tracking || {}),
        daysElapsed: days,
        stalled: true,
      },
      language: lang,
    });
    return res;
  },

  async demoApproveAndClose({
    caseId = realStore.id,
    language = realStore.language,
  } = {}) {
    const lang = normalizeLangCode(language);
    await ensureCitizenSession(lang);

    const res = await request('/api/agents/tracker', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({
        action: 'close',
        caseId,
        language: lang,
      }),
    });

    realStore = transitionCaseState(realStore, CASE_STATUS.CLOSED, {
      language: lang,
    });
    return res;
  },

  async demoReset({ language = realStore.language } = {}) {
    const lang = normalizeLangCode(language);
    await request('/api/demo/reset', {
      method: 'POST',
      language: lang,
      body: JSON.stringify({ language: lang }),
    });
    realStore = createInitialCaseState(lang);
    return {
      display: resResetCopy(lang).display,
      speech: resResetCopy(lang).speech,
      data: {
        caseId: realStore.id,
        status: realStore.status,
        reset: true,
      },
    };
  },
};

function resResetCopy(lang) {
  if (lang === 'hi-IN') {
    return {
      display: 'डेमो को प्रारंभिक स्थिति (INTAKE) में रीसेट कर दिया गया है।',
      speech: 'डेमो रीसेट हो गया है।',
    };
  }
  if (lang === 'en-IN') {
    return {
      display: 'Demo state reset to initial INTAKE status.',
      speech: 'The demo has been reset.',
    };
  }
  return {
    display: 'डेमो पुन्हा सुरुवातीच्या स्थितीत (INTAKE) आणला आहे.',
    speech: 'डेमो पुन्हा सुरू केला आहे.',
  };
}
