import { describe, it, expect, beforeEach } from 'vitest';
import {
  Case,
  clearMemoryDatabase,
  seedDatabase,
  findOneDocument,
} from '@nagarsathi/database';
import {
  createApp,
  invokeApp,
  createAgentAdapter,
  defaultAgentAdapter,
} from '../index.js';

function extractCookiePair(setCookies = [], cookieName = 'ns_token') {
  for (const headerVal of setCookies) {
    if (headerVal.startsWith(`${cookieName}=`)) {
      return headerVal.split(';')[0];
    }
  }
  return '';
}

describe('Module B4: Backend Agent Routes (/agents/*), Language Enforcement & Thin /models Adapter', () => {
  let app;

  beforeEach(async () => {
    process.env.OTP_MODE = 'mock';
    process.env.MOCK_OTP = '123456';
    process.env.DEMO_MODE = 'true';
    clearMemoryDatabase();
    await seedDatabase('memory');
    app = createApp({ rateLimitMax: 500 });
  });

  it('strictly enforces that a valid chosen language (mr-IN, hi-IN, en-IN) is passed to every /agents/* route and adapter method', async () => {
    const routes = [
      '/agents/intake',
      '/agents/documents',
      '/agents/portal',
      '/agents/tracker',
      '/agents/caller',
      '/agents/letter',
    ];

    // 1. Missing language on any /agents/* route -> 400 LANGUAGE_REQUIRED
    for (const url of routes) {
      const missingRes = await invokeApp(app, {
        method: 'POST',
        url,
        body: { transcript: 'Meri pension band ho gayi' },
      });
      expect(missingRes.status).toBe(400);
      expect(missingRes.body.code).toBe('LANGUAGE_REQUIRED');

      const invalidRes = await invokeApp(app, {
        method: 'POST',
        url,
        body: { language: 'fr-FR' },
      });
      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.code).toBe('LANGUAGE_REQUIRED');
    }

    // 2. Direct adapter calls without language throw LANGUAGE_REQUIRED
    await expect(defaultAgentAdapter.intake({})).rejects.toMatchObject({
      code: 'LANGUAGE_REQUIRED',
    });
    await expect(defaultAgentAdapter.documents({})).rejects.toMatchObject({
      code: 'LANGUAGE_REQUIRED',
    });
    await expect(defaultAgentAdapter.portal({})).rejects.toMatchObject({
      code: 'LANGUAGE_REQUIRED',
    });
    await expect(defaultAgentAdapter.tracker({})).rejects.toMatchObject({
      code: 'LANGUAGE_REQUIRED',
    });
    await expect(defaultAgentAdapter.caller({})).rejects.toMatchObject({
      code: 'LANGUAGE_REQUIRED',
    });
    await expect(defaultAgentAdapter.letter({})).rejects.toMatchObject({
      code: 'LANGUAGE_REQUIRED',
    });

    // 3. All 6 routes succeed across all 3 supported languages (mr-IN, hi-IN, en-IN)
    for (const lang of ['mr-IN', 'hi-IN', 'en-IN']) {
      for (const url of routes) {
        const okRes = await invokeApp(app, {
          method: 'POST',
          url,
          body: { language: lang },
        });
        expect(okRes.status).toBe(200);
        expect(typeof okRes.body.display).toBe('string');
        expect(okRes.body.display.length).toBeGreaterThan(0);
        expect(typeof okRes.body.speech).toBe('string');
        expect(okRes.body.speech.length).toBeGreaterThan(0);
        expect(okRes.body.data.language).toBe(lang);
      }
    }
  });

  it('delegates to /models client when provided and scrubs PII (Aadhaar/phone/bank) before calling models', async () => {
    const capturedCalls = [];
    const mockModelsClient = {
      async intake(payload) {
        capturedCalls.push({ agent: 'intake', payload });
        return {
          display: 'Stubbed models intake',
          speech: 'Stubbed models speech',
          data: { language: payload.language, ok: true },
        };
      },
      async letter(payload) {
        capturedCalls.push({ agent: 'letter', payload });
        return {
          display: 'Stubbed models letter',
          speech: 'Stubbed models letter speech',
          data: { language: payload.language, ok: true },
        };
      },
    };

    const customAdapter = createAgentAdapter({ modelsClient: mockModelsClient });
    const customApp = createApp({ agentAdapter: customAdapter });

    const intakeRes = await invokeApp(customApp, {
      method: 'POST',
      url: '/api/agents/intake',
      body: {
        transcript: 'Mera Aadhaar 7123 4567 4821 aur phone 9876543210 hai',
        language: 'hi-IN',
      },
    });
    expect(intakeRes.status).toBe(200);
    expect(capturedCalls).toHaveLength(1);
    expect(capturedCalls[0].payload.language).toBe('hi-IN');
    expect(capturedCalls[0].payload.transcript).not.toContain('7123 4567 4821');
    expect(capturedCalls[0].payload.transcript).not.toContain('9876543210');
    expect(capturedCalls[0].payload.transcript).toContain('XXXX-XXXX-4821');
    expect(capturedCalls[0].payload.transcript).toContain('XXXXXX3210');

    const letterRes = await invokeApp(customApp, {
      method: 'POST',
      url: '/api/agents/letter',
      body: {
        text: 'Letter for Aadhaar 712345674821',
        language: 'en-IN',
      },
    });
    expect(letterRes.status).toBe(200);
    expect(capturedCalls[1].payload.language).toBe('en-IN');
    expect(capturedCalls[1].payload.text).not.toContain('712345674821');
  });

  it('drives the complete 16-step citizen case lifecycle through /api/agents/* and /api/cases/* with database persistence', async () => {
    const loginRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/auth/verify',
      body: { phone: '9876543210', otp: '123456', language: 'mr-IN' },
    });
    expect(loginRes.status).toBe(200);
    const cookie = extractCookiePair(loginRes.setCookies);
    const caseId = 'CASE-B4-E2E-001';

    // 1. Intake classify
    const intakeRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/intake',
      cookie,
      body: {
        action: 'classify',
        caseId,
        transcript: 'Meri pension band ho gayi',
        language: 'mr-IN',
      },
    });
    expect(intakeRes.status).toBe(200);
    expect(intakeRes.body.data.service.id).toBe('pension_restoration');
    expect(intakeRes.body.data.clarifyingQuestion).toBe('kaunsi pension?');

    // 2. Intake clarify
    const clarifyRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/intake',
      cookie,
      body: {
        action: 'clarify',
        caseId,
        answer: 'old_age_pension',
        language: 'mr-IN',
      },
    });
    expect(clarifyRes.status).toBe(200);
    expect(clarifyRes.body.data.readyForServiceConfirm).toBe(true);

    // 3. Confirm service
    await invokeApp(app, {
      method: 'POST',
      url: `/api/cases/${caseId}/confirm-service`,
      cookie,
      body: { serviceId: 'pension', confirmed: true, language: 'mr-IN' },
    });

    // 4. Gate 1 Consent
    const consentRes = await invokeApp(app, {
      method: 'POST',
      url: `/api/cases/${caseId}/consent`,
      cookie,
      body: { given: true, language: 'mr-IN' },
    });
    expect(consentRes.status).toBe(200);
    expect(consentRes.body.data.status).toBe('CONSENTED');

    // 5. Documents Agent: blurry -> expired -> DOCS_READY
    const blurryRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/documents',
      cookie,
      body: { caseId, simulateIssue: 'blurry', language: 'mr-IN' },
    });
    expect(blurryRes.body.data.issue).toBe('PHOTO_BLURRY');

    const expiredRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/documents',
      cookie,
      body: { caseId, simulateIssue: 'expired', language: 'mr-IN' },
    });
    expect(expiredRes.body.data.issue).toBe('LIFE_CERT_EXPIRED');

    const docsReadyRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/documents',
      cookie,
      body: { caseId, markReady: true, language: 'mr-IN' },
    });
    expect(docsReadyRes.body.data.status).toBe('DOCS_READY');

    // 6. Portal Agent: fillDraft (FORM_FILLED)
    const draftRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/portal',
      cookie,
      body: { action: 'fillDraft', caseId, language: 'mr-IN' },
    });
    expect(draftRes.status).toBe(200);
    expect(draftRes.body.data.status).toBe('FORM_FILLED');
    expect(draftRes.body.data.draft.isDraft).toBe(true);

    // Submitting before Gate 2 approval is blocked (403 APPROVAL_REQUIRED)
    const blockedSubmit = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/portal',
      cookie,
      body: { action: 'submit', caseId, language: 'mr-IN' },
    });
    expect(blockedSubmit.status).toBe(403);
    expect(blockedSubmit.body.code).toBe('APPROVAL_REQUIRED');

    // 7. Gate 2 physical approval -> Submit
    const approveRes = await invokeApp(app, {
      method: 'POST',
      url: `/api/cases/${caseId}/approve`,
      cookie,
      body: { given: true, byPhysicalButton: true, language: 'mr-IN' },
    });
    expect(approveRes.body.data.status).toBe('APPROVED');

    const submitRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/portal',
      cookie,
      body: { action: 'submit', caseId, language: 'mr-IN' },
    });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('SUBMITTED');
    expect(submitRes.body.data.applicationId).toMatch(/^PEN-2026-\d{5}$/);

    // 8. Tracker & Caller Agents
    const trackRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/tracker',
      cookie,
      body: { action: 'track', caseId, language: 'mr-IN' },
    });
    expect(trackRes.body.data.status).toBe('TRACKING');

    const stallRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/tracker',
      cookie,
      body: { action: 'stalled', caseId, days: 21, language: 'mr-IN' },
    });
    expect(stallRes.body.data.status).toBe('STALLED');

    const callStart = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/caller',
      cookie,
      body: { action: 'start', caseId, language: 'mr-IN' },
    });
    expect(callStart.body.data.status).toBe('IN_PROGRESS');

    const callTurn = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/caller',
      cookie,
      body: {
        action: 'turn',
        caseId,
        officerUtterance: 'Approved under REF-5521, check in 3 days',
        language: 'mr-IN',
      },
    });
    expect(callTurn.body.data.extractedRefId).toBe('REF-5521');

    const callEnd = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/caller',
      cookie,
      body: { action: 'end', caseId, language: 'mr-IN' },
    });
    expect(callEnd.body.data.status).toBe('CALLED');
    expect(callEnd.body.data.referenceId).toBe('REF-5521');

    const closeRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/agents/tracker',
      cookie,
      body: { action: 'close', caseId, language: 'mr-IN' },
    });
    expect(closeRes.body.data.status).toBe('CLOSED');

    const finalDbCase = await findOneDocument(Case, { caseId });
    expect(finalDbCase).not.toBeNull();
    expect(finalDbCase.appId).toMatch(/^PEN-2026-\d{5}$/);
  });
});

