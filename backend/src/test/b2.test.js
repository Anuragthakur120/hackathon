import { describe, it, expect, beforeEach } from 'vitest';
import {
  Case,
  AuditLog,
  CASE_TTL_SECONDS,
  clearMemoryDatabase,
  seedDatabase,
  findDocuments,
  findOneDocument,
  getCollectionIndexes,
} from '@nagarsathi/database';
import {
  createApp,
  invokeApp,
  InMemoryPortalAdapter,
  submitCaseToPortal,
  transitionCase,
  flushPendingAudits,
} from '../index.js';

function extractCookiePair(setCookies = [], cookieName = 'ns_token') {
  for (const headerVal of setCookies) {
    if (headerVal.startsWith(`${cookieName}=`)) {
      return headerVal.split(';')[0];
    }
  }
  return '';
}

describe('Module B2: Case State Machine, Gate 1 & Gate 2 Guards, requireConsent(scope), In-Memory Portal Adapter & Retry x3', () => {
  let portalAdapter;
  let app;
  let cookie;

  beforeEach(async () => {
    process.env.OTP_MODE = 'mock';
    process.env.MOCK_OTP = '123456';
    process.env.DEMO_MODE = 'true';
    clearMemoryDatabase();
    await seedDatabase('memory');
    portalAdapter = new InMemoryPortalAdapter();
    app = createApp({ portalAdapter, rateLimitMax: 200 });

    const loginRes = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9876543210', otp: '123456', language: 'mr-IN' },
    });
    cookie = extractCookiePair(loginRes.setCookies);
  });

  it('enforces Gate 2: submit() throws without approval and voice-only approval is never enough', async () => {
    // 1. Direct submitCaseToPortal() and portalAdapter.submit() throw when approval.given !== true
    await expect(
      submitCaseToPortal(
        {
          caseId: 'CASE-TEST-NO-APPROVAL',
          userId: 'user-1',
          service: 'pension',
          consent: { caseConsent: true },
          approval: { given: false, byPhysicalButton: false },
        },
        { portalAdapter }
      )
    ).rejects.toThrow(/Gate 2 Violation/i);

    // 2. Direct submitCaseToPortal() throws when given === true but byPhysicalButton === false (voice-only)
    await expect(
      submitCaseToPortal(
        {
          caseId: 'CASE-TEST-VOICE-ONLY',
          userId: 'user-1',
          service: 'pension',
          consent: { caseConsent: true },
          approval: { given: true, byPhysicalButton: false },
        },
        { portalAdapter }
      )
    ).rejects.toThrow(/Gate 2 Violation/i);

    // 3. Via API: create case -> confirm -> consent -> docs ready -> fill draft
    const createRes = await invokeApp(app, {
      method: 'POST',
      url: '/cases',
      cookie,
      body: { caseId: 'CASE-GATE2-API', transcript: 'Meri pension band ho gayi' },
    });
    expect(createRes.status).toBe(201);

    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE2-API/confirm-service',
      cookie,
      body: { confirmed: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE2-API/consent',
      cookie,
      body: { given: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE2-API/documents',
      cookie,
      body: { markReady: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE2-API/fill-draft',
      cookie,
    });

    // Attempt submit before approval -> 403 APPROVAL_REQUIRED
    const unapprovedSubmit = await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE2-API/submit',
      cookie,
    });
    expect(unapprovedSubmit.status).toBe(403);
    expect(unapprovedSubmit.body.error).toBe('APPROVAL_REQUIRED');

    // Attempt voice-only approval -> stays in FORM_FILLED, approval.given remains false
    const voiceApprove = await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE2-API/approve',
      cookie,
      body: { given: true, source: 'voice', byPhysicalButton: false },
    });
    expect(voiceApprove.status).toBe(200);
    expect(voiceApprove.body.data.status).toBe('FORM_FILLED');
    expect(voiceApprove.body.data.voiceOnly).toBe(true);
    expect(voiceApprove.body.data.approval.given).toBe(false);

    // Submit after voice-only approval STILL fails with 403 APPROVAL_REQUIRED
    const afterVoiceSubmit = await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE2-API/submit',
      cookie,
    });
    expect(afterVoiceSubmit.status).toBe(403);
    expect(afterVoiceSubmit.body.error).toBe('APPROVAL_REQUIRED');
  });

  it('enforces Gate 1: consent NO halts and saves nothing, saveProfileConsent is independent, and requireConsent(scope) returns 403 + AuditLog entry', async () => {
    const createRes = await invokeApp(app, {
      method: 'POST',
      url: '/cases',
      cookie,
      body: { caseId: 'CASE-GATE1-TEST', transcript: 'Meri pension band ho gayi' },
    });
    expect(createRes.status).toBe(201);

    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE1-TEST/confirm-service',
      cookie,
      body: { confirmed: true },
    });

    // 1. Before consent is given, requireConsent(scope) blocks upload, fill, submit, and call with 403 + AuditLog
    for (const [urlPath, expectedScope] of [
      ['/cases/CASE-GATE1-TEST/documents', 'upload'],
      ['/cases/CASE-GATE1-TEST/fill-draft', 'fill'],
      ['/cases/CASE-GATE1-TEST/submit', 'submit'],
      ['/cases/CASE-GATE1-TEST/call/start', 'call'],
    ]) {
      const blockedRes = await invokeApp(app, {
        method: 'POST',
        url: urlPath,
        cookie,
      });
      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error).toBe('CONSENT_REQUIRED');
      expect(blockedRes.body.data.scope).toBe(expectedScope);
    }

    await flushPendingAudits();
    const guardAudits = await findDocuments(AuditLog, {
      action: 'CONSENT_GUARD_BLOCKED',
    });
    expect(guardAudits.length).toBeGreaterThanOrEqual(4);

    // 2. Citizen says NO at Gate 1 -> halts flow and deletes uncommitted case so nothing is saved
    const consentNoRes = await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-GATE1-TEST/consent',
      cookie,
      body: { given: false },
    });
    expect(consentNoRes.status).toBe(200);
    expect(consentNoRes.body.data.status).toBe('CANCELLED');
    expect(consentNoRes.body.data.halted).toBe(true);
    expect(consentNoRes.body.data.nothingSaved).toBe(true);
    expect(consentNoRes.body.data.permissions.canDo).toContain('FILL_DRAFT_FORM');
    expect(consentNoRes.body.data.permissions.cannotDo).toContain(
      'SUBMIT_WITHOUT_CITIZEN_APPROVAL'
    );

    const deletedCase = await findOneDocument(Case, { caseId: 'CASE-GATE1-TEST' });
    expect(deletedCase).toBeNull();
  });

  it('halts at Gate 2 when approval is NO and rejects illegal state transitions', async () => {
    await invokeApp(app, {
      method: 'POST',
      url: '/cases',
      cookie,
      body: { caseId: 'CASE-ILLEGAL-TEST', transcript: 'Meri pension band ho gayi' },
    });

    // 1. Illegal transition INTAKE -> SUBMITTED is rejected with 409 ILLEGAL_CASE_TRANSITION
    const illegalJump = await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ILLEGAL-TEST/transition',
      cookie,
      body: { toStatus: 'SUBMITTED' },
    });
    expect(illegalJump.status).toBe(409);
    expect(illegalJump.body.error).toBe('ILLEGAL_CASE_TRANSITION');

    expect(() =>
      transitionCase({ status: 'INTAKE', consent: {}, approval: {} }, 'SUBMITTED')
    ).toThrow(/Illegal case status transition/i);

    // 2. Move to FORM_FILLED and test Approval = NO halt
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ILLEGAL-TEST/confirm-service',
      cookie,
      body: { confirmed: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ILLEGAL-TEST/consent',
      cookie,
      body: { given: true, saveProfileConsent: false },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ILLEGAL-TEST/documents',
      cookie,
      body: { markReady: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ILLEGAL-TEST/fill-draft',
      cookie,
    });

    const approvalNoRes = await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ILLEGAL-TEST/approve',
      cookie,
      body: { given: false },
    });
    expect(approvalNoRes.status).toBe(200);
    expect(approvalNoRes.body.data.status).toBe('FORM_FILLED');
    expect(approvalNoRes.body.data.halted).toBe(true);
    expect(approvalNoRes.body.data.approval.given).toBe(false);
  });

  it('completes the full 16-step happy path via API including Day-10 Query, +21 din Stall, Office Call (REF-5521) -> TRACKING loopback -> CLOSED, with 30-day TTL and transition audits', async () => {
    const caseId = 'CASE-HAPPY-16';

    // Step 2: INTAKE
    const r1 = await invokeApp(app, {
      method: 'POST',
      url: '/cases',
      cookie,
      body: { caseId, transcript: 'Meri pension band ho gayi' },
    });
    expect(r1.body.data.status).toBe('INTAKE');

    // Step 3: CLARIFYING
    const r2 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/answer`,
      cookie,
      body: { fieldId: 'pension_subtype', answer: 'old_age_pension' },
    });
    expect(r2.body.data.status).toBe('CLARIFYING');

    // Step 4: SERVICE_CONFIRMED
    const r3 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/confirm-service`,
      cookie,
      body: { confirmed: true },
    });
    expect(r3.body.data.status).toBe('SERVICE_CONFIRMED');

    // Step 6 & 7: CONSENTED + separate saveProfileConsent
    const r4 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/consent`,
      cookie,
      body: { given: true, saveProfileConsent: false },
    });
    expect(r4.body.data.status).toBe('CONSENTED');
    expect(r4.body.data.consent.caseConsent).toBe(true);
    expect(r4.body.data.consent.saveProfileConsent).toBe(false);

    const r4b = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/save-profile-consent`,
      cookie,
      body: { saveProfileConsent: true },
    });
    expect(r4b.body.data.consent.saveProfileConsent).toBe(true);

    // Step 8: DOCS_COLLECTING
    const r5 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/documents`,
      cookie,
      body: { markReady: false },
    });
    expect(r5.body.data.status).toBe('DOCS_COLLECTING');

    // Step 9: DOCS_READY
    const r6 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/documents`,
      cookie,
      body: { markReady: true },
    });
    expect(r6.body.data.status).toBe('DOCS_READY');

    // Step 10: FORM_FILLED (DRAFT)
    const r7 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/fill-draft`,
      cookie,
    });
    expect(r7.body.data.status).toBe('FORM_FILLED');
    expect(r7.body.data.draft.isDraft).toBe(true);
    expect(r7.body.data.draft.fields.length).toBeGreaterThanOrEqual(10);

    // Step 11: APPROVED (Gate 2 physical button)
    const r8 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/approve`,
      cookie,
      body: { given: true, byPhysicalButton: true },
    });
    expect(r8.body.data.status).toBe('APPROVED');

    // Step 12: SUBMITTED (returns PEN-2026-88213)
    const r9 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/submit`,
      cookie,
    });
    expect(r9.body.data.status).toBe('SUBMITTED');
    expect(r9.body.data.applicationId).toBe('PEN-2026-88213');

    // Step 13: TRACKING
    const r10 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/track`,
      cookie,
      body: { daysElapsed: 3 },
    });
    expect(r10.body.data.status).toBe('TRACKING');

    // Step 14: QUERY_RAISED (Day 10: "life certificate purana hai")
    const r11 = await invokeApp(app, {
      method: 'POST',
      url: '/demo/raise-query',
      cookie,
      body: { caseId },
    });
    expect(r11.body.data.status).toBe('QUERY_RAISED');
    expect(r11.body.data.query.message).toMatch(/life certificate purana hai/i);

    // Resubmit renewed document -> loops back to TRACKING
    const r11b = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/documents`,
      cookie,
      body: { docType: 'life_certificate' },
    });
    expect(r11b.body.data.status).toBe('TRACKING');

    // Step 15: Time-Skip +21 days -> STALLED ("7 din se ruka hai")
    const r12 = await invokeApp(app, {
      method: 'POST',
      url: '/demo/skip-days',
      cookie,
      body: { caseId, days: 21 },
    });
    expect(r12.body.data.status).toBe('STALLED');
    expect(r12.body.data.stalled).toBe(true);
    expect(r12.body.data.stallDetails.stalledDays).toBe(7);

    // Simulated Office Call: STALLED -> CALLED -> TRACKING (with REF-5521 and nextCheckAt ~3 days)
    const callStart = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/call/start`,
      cookie,
    });
    expect(callStart.body.data.officeCallPolicy.never_say).toContain('aadhaar');

    await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/call/turn`,
      cookie,
      body: { officerUtterance: 'Logged REF-5521. Check in 3 days.' },
    });

    const callEnd = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/call/end`,
      cookie,
      body: { referenceId: 'REF-5521', loopToTracking: false },
    });
    expect(callEnd.body.data.status).toBe('CALLED');
    expect(callEnd.body.data.referenceId).toBe('REF-5521');
    expect(new Date(callEnd.body.data.nextCheckAt).getTime()).toBeGreaterThan(
      Date.now() + 2 * 24 * 60 * 60 * 1000
    );

    // Loop back CALLED -> TRACKING
    const r13 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/track`,
      cookie,
      body: { daysElapsed: 18 },
    });
    expect(r13.body.data.status).toBe('TRACKING');

    // Step 16: Final Approval -> CLOSED ("Pension phir chalu ho gayi")
    const r14 = await invokeApp(app, {
      method: 'POST',
      url: '/demo/approve',
      cookie,
      body: { caseId },
    });
    expect(r14.body.data.status).toBe('CLOSED');
    expect(r14.body.display).toMatch(/Pension phir chalu ho gayi/i);

    // Verify 30-day TTL index on Case and transition AuditLogs
    const caseIndexes = await getCollectionIndexes(Case);
    expect(
      caseIndexes.some((idx) => idx.expireAfterSeconds === CASE_TTL_SECONDS)
    ).toBe(true);

    await flushPendingAudits();
    const transitionAudits = await findDocuments(AuditLog, {
      caseId,
      action: 'CASE_STATE_TRANSITION',
    });
    expect(transitionAudits.length).toBeGreaterThanOrEqual(12);
  });

  it('retries portal failures 3 times (dobara koshish 1/3 -> 3/3) and returns a clear 503 failure with draft intact when all 3 fail', async () => {
    const caseId = 'CASE-PORTAL-RETRY';
    await invokeApp(app, {
      method: 'POST',
      url: '/cases',
      cookie,
      body: { caseId, transcript: 'Meri pension band ho gayi' },
    });
    await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/confirm-service`,
      cookie,
      body: { confirmed: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/consent`,
      cookie,
      body: { given: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/documents`,
      cookie,
      body: { markReady: true },
    });

    // 1. Set portal to fail all 3 times -> returns 503 with attempts ['dobara koshish 1/3', 'dobara koshish 2/3', 'dobara koshish 3/3']
    portalAdapter.setFailureMode({ alwaysFail: true });
    const failFillRes = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/fill-draft`,
      cookie,
    });
    expect(failFillRes.status).toBe(503);
    expect(failFillRes.body.error).toBe('PORTAL_FAILED_AFTER_3_RETRIES');
    expect(failFillRes.body.data.attempts).toEqual([
      'dobara koshish 1/3',
      'dobara koshish 2/3',
      'dobara koshish 3/3',
    ]);
    expect(failFillRes.body.data.draftSafe).toBe(true);

    // 2. Set portal to fail twice then succeed on 3rd attempt -> returns 200 FORM_FILLED
    portalAdapter.setFailureMode({ failTimes: 2, alwaysFail: false });
    const recoveredFillRes = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/fill-draft`,
      cookie,
    });
    expect(recoveredFillRes.status).toBe(200);
    expect(recoveredFillRes.body.data.status).toBe('FORM_FILLED');
  });
});
