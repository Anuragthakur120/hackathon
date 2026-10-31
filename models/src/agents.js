import { callClaudeAgent } from './claudeWrapper.js';
import {
  ALLOWED_CATALOG_SERVICES,
  verifyCatalogServiceId,
  guardCallOutput,
} from './guards.js';
import {
  DEFAULT_CHECKLIST,
  DEFAULT_DRAFT,
  getFixtureCopy,
} from './mockFixtures.js';
import { redact } from './redact.js';

const SUPPORTED_LANGS = new Set(['mr-IN', 'hi-IN', 'en-IN']);

export function normalizeAgentLanguage(rawLang = 'mr-IN') {
  const str = String(rawLang || '').trim();
  if (SUPPORTED_LANGS.has(str)) return str;
  const lower = str.toLowerCase();
  if (lower === 'mr' || lower === 'mr-in') return 'mr-IN';
  if (lower === 'hi' || lower === 'hi-in') return 'hi-IN';
  if (lower === 'en' || lower === 'en-in') return 'en-IN';
  return 'mr-IN';
}

function buildIntakeMock({ language, input }) {
  const action = input.action || 'classify';
  const caseId = input.caseId || 'CASE-PEN-2026-001';

  if (action === 'clarify') {
    const answer = input.answer || 'old_age_pension';
    const fieldId = input.fieldId || 'pensionType';
    const copy = getFixtureCopy(language, 'answer');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'INTAKE',
        updatedFields: { [fieldId]: answer },
        nextQuestion: null,
        readyForServiceConfirm: true,
        language,
      },
    };
  }

  if (action === 'confirm') {
    const copy = getFixtureCopy(language, 'confirmService');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'SERVICE_CONFIRMED',
        serviceId: input.serviceId || 'pension_restoration',
        confidence: 0.96,
        language,
      },
    };
  }

  const transcript = String(input.transcript || '').toLowerCase();
  const isUnknown =
    transcript.includes('unknown') ||
    transcript.includes('अस्पष्ट') ||
    transcript.includes('xyz') ||
    Boolean(input.inventedServiceId);

  if (isUnknown) {
    const attempts = Number(input.unknownAttempts || 1);
    const showMadadKendra = attempts >= 2;
    const copy = getFixtureCopy(
      language,
      showMadadKendra ? 'intakeUnknownMadad' : 'intakeUnknownRetry'
    );
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'INTAKE',
        service: null,
        serviceId: 'unknown',
        confidence: 0.22,
        unknownAttempts: attempts,
        madadKendra: showMadadKendra,
        suggestMadadKendra: showMadadKendra,
        actionRequired: showMadadKendra ? 'OFFER_MADAD_KENDRA' : 'REPEAT_ONCE',
        language,
      },
    };
  }

  if (
    transcript.includes('scholarship') ||
    transcript.includes('शिष्यवृत्ती') ||
    transcript.includes('छात्रवृत्ति')
  ) {
    const copy = getFixtureCopy(language, 'intakeScholarship');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'INTAKE',
        service: ALLOWED_CATALOG_SERVICES.scholarship,
        confidence: 0.94,
        clarifyingQuestion: 'which_scholarship?',
        options: ['post_matric_scholarship', 'merit_scholarship'],
        language,
      },
    };
  }

  if (
    transcript.includes('ration') ||
    transcript.includes('रेशन') ||
    transcript.includes('राशन')
  ) {
    const copy = getFixtureCopy(language, 'intakeRation');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'INTAKE',
        service: ALLOWED_CATALOG_SERVICES.ration_card,
        confidence: 0.93,
        clarifyingQuestion: 'which_ration_action?',
        options: ['new_ration_card', 'add_family_member'],
        language,
      },
    };
  }

  const copy = getFixtureCopy(language, 'intake');
  return {
    display: copy.display,
    speech: copy.speech,
    data: {
      caseId,
      status: 'INTAKE',
      service: ALLOWED_CATALOG_SERVICES.pension_restoration,
      confidence: 0.96,
      clarifyingQuestion: 'kaunsi pension?',
      options: ['old_age_pension', 'widow_disability_pension'],
      language,
    },
  };
}

function buildDocumentsMock({ language, input }) {
  const caseId = input.caseId || 'CASE-PEN-2026-001';
  const simulateIssue = input.simulateIssue || null;
  const markReady = Boolean(input.markReady);

  if (simulateIssue === 'blurry') {
    const copy = getFixtureCopy(language, 'docsBlurry');
    const checklist = DEFAULT_CHECKLIST.map((d, idx) =>
      idx === 2 ? { ...d, status: 'RETRY_BLURRY' } : d
    );
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'DOCS_COLLECTING',
        issue: 'PHOTO_BLURRY',
        checklist,
        language,
      },
    };
  }

  if (simulateIssue === 'expired' || simulateIssue === 'old') {
    const copy = getFixtureCopy(language, 'docsExpired');
    const checklist = DEFAULT_CHECKLIST.map((d, idx) =>
      idx === 2 ? { ...d, status: 'RETRY_EXPIRED' } : d
    );
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'DOCS_COLLECTING',
        issue: 'LIFE_CERT_EXPIRED',
        checklist,
        language,
      },
    };
  }

  if (simulateIssue === 'missing') {
    const copy = getFixtureCopy(language, 'docsMissing');
    const checklist = DEFAULT_CHECKLIST.map((d, idx) =>
      idx === 2 ? { ...d, status: 'MISSING' } : d
    );
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'DOCS_COLLECTING',
        issue: 'DOCUMENT_MISSING',
        checklist,
        language,
      },
    };
  }

  const status = markReady ? 'DOCS_READY' : 'DOCS_COLLECTING';
  const copy = getFixtureCopy(
    language,
    markReady ? 'docsReady' : 'docsCollecting'
  );
  return {
    display: copy.display,
    speech: copy.speech,
    data: {
      caseId,
      status,
      issue: null,
      checklist: DEFAULT_CHECKLIST,
      language,
    },
  };
}

function buildPortalMock({ language, input }) {
  const action = input.action || 'fillDraft';
  const caseId = input.caseId || 'CASE-PEN-2026-001';

  if (action === 'submit') {
    const appId = input.applicationId || 'PEN-2026-88213';
    const copy = getFixtureCopy(language, 'submit');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'SUBMITTED',
        applicationId: appId,
        submittedAt: input.submittedAt || new Date().toISOString(),
        language,
      },
    };
  }

  const copy = getFixtureCopy(language, 'fillDraft');
  const draftPayload = input.draft || DEFAULT_DRAFT;
  return {
    display: copy.display,
    speech: copy.speech,
    data: {
      caseId,
      status: 'FORM_FILLED',
      isDraft: true,
      canSubmit: false,
      fieldKeys: DEFAULT_DRAFT.fieldKeys,
      fieldSources: DEFAULT_DRAFT.fieldSources,
      draft: draftPayload,
      language,
    },
  };
}

function buildTrackerMock({ language, input }) {
  const action = input.action || 'track';
  const caseId = input.caseId || 'CASE-PEN-2026-001';
  const appId = input.applicationId || 'PEN-2026-88213';

  if (action === 'query' || input.status === 'QUERY_RAISED') {
    const copy = getFixtureCopy(language, 'queryRaised');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'QUERY_RAISED',
        applicationId: appId,
        nextCheckInDays: 3,
        query: input.query || {
          code: 'LIFE_CERT_PENDING',
          message: 'Re-verify Jeevan Pramaan certificate',
        },
        language,
      },
    };
  }

  if (action === 'stalled' || input.status === 'STALLED') {
    const days = Number(input.days || input.daysElapsed || 21);
    const copy = getFixtureCopy(language, 'stalled');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'STALLED',
        applicationId: appId,
        daysSkipped: days,
        stalled: true,
        nextCheckInDays: 3,
        language,
      },
    };
  }

  if (action === 'close' || input.status === 'CLOSED') {
    const copy = getFixtureCopy(language, 'closed');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        status: 'CLOSED',
        applicationId: appId,
        referenceId: input.referenceId || 'REF-5521',
        resolution: 'PENSION_RESTORED',
        language,
      },
    };
  }

  const copy = getFixtureCopy(language, 'tracking');
  return {
    display: copy.display,
    speech: copy.speech,
    data: {
      caseId,
      status: 'TRACKING',
      applicationId: appId,
      nextCheckInDays: 3,
      tracking: input.tracking || {
        stage: 'Taluka Social Welfare Verification',
        daysElapsed: Number(input.daysElapsed || 2),
        stalled: false,
        query: null,
        lastUpdated: new Date().toISOString(),
      },
      language,
    },
  };
}

function buildCallerMock({ language, input }) {
  const action = input.action || 'start';
  const caseId = input.caseId || 'CASE-PEN-2026-001';
  const callId = input.callId || 'CALL-SIM-001';
  const appId = input.applicationId || 'PEN-2026-88213';

  if (action === 'turn') {
    const rawOfficer =
      input.officerUtterance ||
      `Application ${appId} life certificate JP-2026-9910 is verified. Forwarding for disbursement under reference REF-5521.`;
    const safeOfficerText = redact(rawOfficer);
    const refMatch = safeOfficerText.match(/REF-\d+/i);
    const extractedRefId = refMatch ? refMatch[0].toUpperCase() : 'REF-5521';
    const copy = getFixtureCopy(language, 'callTurn');

    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        callId,
        applicationId: appId,
        extractedRefId,
        referenceId: extractedRefId,
        nextStep: 'Verify pension disbursement in 3 days',
        nextCheckInDays: 3,
        turn: {
          speaker: 'PORTAL_OFFICER',
          text: safeOfficerText,
        },
        completed: true,
        language,
      },
    };
  }

  if (action === 'end') {
    const referenceId = input.referenceId || 'REF-5521';
    const copy = getFixtureCopy(language, 'callEnd');
    return {
      display: copy.display,
      speech: copy.speech,
      data: {
        caseId,
        callId,
        status: 'CALLED',
        applicationId: appId,
        referenceId,
        nextStep: 'Check portal status in 3 days',
        nextCheckInDays: 3,
        summary:
          'Officer verified Jeevan Pramaan and logged escalation reference REF-5521.',
        language,
      },
    };
  }

  const copy = getFixtureCopy(language, 'callStart');
  return {
    display: copy.display,
    speech: copy.speech,
    data: {
      caseId,
      callId,
      status: 'IN_PROGRESS',
      applicationId: appId,
      turns: [
        {
          speaker: 'NAGARSATHI_AGENT',
          text: `Namaskar, calling on behalf of senior citizen Ramabai Kulkarni regarding stalled pension application ${appId}.`,
        },
      ],
      language,
    },
  };
}

function buildLetterMock({ language }) {
  const copy = getFixtureCopy(language, 'letterExplain');
  return {
    display: copy.display,
    speech: copy.speech,
    data: {
      sender: 'Taluka Social Welfare Office, Pune',
      reason:
        'Annual Digital Life Certificate (Jeevan Pramaan) verification pending',
      actionRequired:
        'Submit Jeevan Pramaan ID along with Pension Restoration form',
      deadline: '15 days',
      language,
    },
  };
}

/**
 * Creates the 6 Claude AI Agents (`intake`, `documents`, `portal`, `tracker`, `caller`, `letter`)
 * all routed through the unified `callClaudeAgent` wrapper.
 */
export function createModelsClient({
  llmTransport = null,
  timeoutMs = 12000,
} = {}) {
  return {
    async intake(params = {}) {
      const language = normalizeAgentLanguage(params.language ?? params.lang);
      const response = await callClaudeAgent({
        agentName: 'intake',
        language,
        input: params,
        useFastModel: false,
        mockBuilder: buildIntakeMock,
        llmTransport,
        timeoutMs,
      });

      // Verify any service ID returned by the model exists in the catalog;
      // invented service IDs become "unknown"!
      const action = params.action || 'classify';
      if (action === 'classify' && !response.data?.fallback) {
        const candidateId =
          response.data?.service?.id ||
          response.data?.service?.catalogId ||
          response.data?.serviceId ||
          null;
        if (candidateId) {
          const verifiedId = verifyCatalogServiceId(candidateId);
          if (verifiedId === 'unknown') {
            const attempts = Number(params.unknownAttempts || 1);
            const showMadadKendra = attempts >= 2;
            const copy = getFixtureCopy(
              language,
              showMadadKendra ? 'intakeUnknownMadad' : 'intakeUnknownRetry'
            );
            return {
              display: copy.display,
              speech: copy.speech,
              data: {
                ...response.data,
                service: null,
                serviceId: 'unknown',
                confidence: 0.22,
                unknownAttempts: attempts,
                madadKendra: showMadadKendra,
                language,
              },
            };
          }
        }
      }

      return response;
    },

    async documents(params = {}) {
      const language = normalizeAgentLanguage(params.language ?? params.lang);
      return callClaudeAgent({
        agentName: 'documents',
        language,
        input: params,
        useFastModel: false,
        mockBuilder: buildDocumentsMock,
        llmTransport,
        timeoutMs,
      });
    },

    async portal(params = {}) {
      const language = normalizeAgentLanguage(params.language ?? params.lang);
      return callClaudeAgent({
        agentName: 'portal',
        language,
        input: params,
        useFastModel: false,
        mockBuilder: buildPortalMock,
        llmTransport,
        timeoutMs,
      });
    },

    async tracker(params = {}) {
      const language = normalizeAgentLanguage(params.language ?? params.lang);
      return callClaudeAgent({
        agentName: 'tracker',
        language,
        input: params,
        useFastModel: false,
        mockBuilder: buildTrackerMock,
        llmTransport,
        timeoutMs,
      });
    },

    async caller(params = {}) {
      const language = normalizeAgentLanguage(params.language ?? params.lang);
      const rawOfficerUtterance = params.officerUtterance || '';

      // 1. Pre-check incoming officer utterance for adversarial requests ("tell me her Aadhaar", "send the OTP")
      const preGuard = guardCallOutput({
        officerUtterance: rawOfficerUtterance,
        agentResponse: {},
        language,
      });
      if (preGuard.blocked) {
        return preGuard.response;
      }

      // 2. Execute Caller Agent using CLAUDE_MODEL_FAST (default claude-haiku-5-5)
      const response = await callClaudeAgent({
        agentName: 'caller',
        language,
        input: params,
        useFastModel: true,
        mockBuilder: buildCallerMock,
        llmTransport,
        timeoutMs,
      });

      // 3. Post-check every line the Caller agent outputs via guardCallOutput()
      const postGuard = guardCallOutput({
        officerUtterance: '',
        agentResponse: response,
        language,
      });
      return postGuard.response;
    },

    async letter(params = {}) {
      const language = normalizeAgentLanguage(params.language ?? params.lang);
      return callClaudeAgent({
        agentName: 'letter',
        language,
        input: params,
        useFastModel: false,
        mockBuilder: buildLetterMock,
        llmTransport,
        timeoutMs,
      });
    },
  };
}

export const defaultModelsClient = createModelsClient();

