import fs from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuditLog,
  clearMemoryDatabase,
  seedDatabase,
  findDocuments,
  loadCatalog,
} from '@nagarsathi/database';
import {
  createApp,
  invokeApp,
  createMockPortalApp,
  PlaywrightPortalRobot,
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

describe('Module B3: Mock Portal Website (PORTAL_PORT=4000) & Playwright Portal Robot', () => {
  let portalApp;
  let robot;
  let app;
  let cookie;

  beforeEach(async () => {
    process.env.OTP_MODE = 'mock';
    process.env.MOCK_OTP = '123456';
    process.env.DEMO_MODE = 'true';
    process.env.HEADED = 'false';

    clearMemoryDatabase();
    await seedDatabase('memory');

    portalApp = createMockPortalApp({ slowDelayMs: 5 });
    robot = new PlaywrightPortalRobot({
      portalApp,
      headed: false,
      backoffBaseMs: 2,
    });
    app = createApp({ portalAdapter: robot, rateLimitMax: 250 });

    const loginRes = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9876543210', otp: '123456', language: 'mr-IN' },
    });
    cookie = extractCookiePair(loginRes.setCookies);
  });

  it('allows completing and submitting all 3 service forms (pension 3 pages, scholarship sectioned page, ration_card 1 page) by hand with ?slow=1, dropdowns, and confirm checkbox', async () => {
    // 1. Login page & dashboard
    const loginGet = await invokeApp(portalApp, {
      method: 'GET',
      url: '/portal/login?slow=1',
    });
    expect(loginGet.status).toBe(200);
    expect(loginGet.text).toContain('id="input-portal-user"');

    const loginPost = await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/login',
      body: { username: 'ramabai', password: '123' },
    });
    expect(loginPost.status).toBe(200);
    expect(loginPost.text).toContain('href="/portal/pension/apply"');

    // 2. Complete & Submit Pension (3 pages) by hand
    for (const pageNum of [1, 2, 3]) {
      const pageGet = await invokeApp(portalApp, {
        method: 'GET',
        url: `/portal/pension/apply?page=${pageNum}&caseId=HAND-PEN-1&slow=1`,
      });
      expect(pageGet.status).toBe(200);
    }

    // Submitting without checking #chk-confirm-declaration fails with 400
    const missingCheckboxRes = await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/pension/apply?page=3&caseId=HAND-PEN-1',
      body: { action: 'submit', confirm_declaration: 'no' },
    });
    expect(missingCheckboxRes.status).toBe(400);

    // Submitting with confirm_declaration='yes' returns Application ID PEN-2026-88213
    const pensionSubmit = await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/pension/apply?page=3&caseId=HAND-PEN-1',
      body: {
        action: 'submit',
        confirm_declaration: 'yes',
        fields: { full_name: 'Ramabai Kulkarni', pension_subtype: 'old_age_pension' },
      },
    });
    expect(pensionSubmit.status).toBe(200);
    expect(pensionSubmit.text).toContain(
      '<div id="application-id-result" data-app-id="PEN-2026-88213">PEN-2026-88213</div>'
    );

    // 3. Complete & Submit Scholarship (1 sectioned page) by hand
    const schGet = await invokeApp(portalApp, {
      method: 'GET',
      url: '/portal/scholarship/apply?caseId=HAND-SCH-1',
    });
    expect(schGet.status).toBe(200);
    expect(schGet.text).toContain('id="section-student-personal"');
    expect(schGet.text).toContain('id="section-academic-and-bank"');

    const schSubmit = await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/scholarship/apply?caseId=HAND-SCH-1',
      body: {
        action: 'submit',
        confirm_declaration: 'yes',
        fields: { full_name: 'Aarti Kulkarni', course_name: 'B.Sc Computer Science' },
      },
    });
    expect(schSubmit.status).toBe(200);
    expect(schSubmit.text).toContain('SCH-2026-88213');

    // 4. Complete & Submit Ration Card (1 page) by hand
    const ratGet = await invokeApp(portalApp, {
      method: 'GET',
      url: '/portal/ration-card/apply?caseId=HAND-RAT-1',
    });
    expect(ratGet.status).toBe(200);
    expect(ratGet.text).toContain('id="input-hof-name"');

    const ratSubmit = await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/ration-card/apply?caseId=HAND-RAT-1',
      body: {
        action: 'submit',
        confirm_declaration: 'yes',
        fields: { head_of_family_name: 'Ramabai Kulkarni', family_members_count: 3 },
      },
    });
    expect(ratSubmit.status).toBe(200);
    expect(ratSubmit.text).toContain('RAT-2026-88213');
  });

  it('uses Playwright robot (headless) to complete both pension and scholarship drafts, captures screenshots, and never leaks full Aadhaar/account numbers to logs, LLM payloads, or screenshot filenames', async () => {
    // Configure an LLM-assisted selector fallback spy to verify outgoing payloads
    const llmFallbacksReceived = [];
    robot.llmSelectorFallback = async (payload) => {
      llmFallbacksReceived.push(payload);
      if (payload.brokenSelector === '#input-course-name') {
        return '#renamed-course-name-input';
      }
      return null;
    };

    // 1. Complete Pension Draft via API + Playwright Robot
    await invokeApp(app, {
      method: 'POST',
      url: '/cases',
      cookie,
      body: { caseId: 'CASE-ROBOT-PEN', transcript: 'Meri pension band ho gayi' },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ROBOT-PEN/confirm-service',
      cookie,
      body: { confirmed: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ROBOT-PEN/consent',
      cookie,
      body: { given: true },
    });
    await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ROBOT-PEN/documents',
      cookie,
      body: { markReady: true },
    });

    const penDraftRes = await invokeApp(app, {
      method: 'POST',
      url: '/cases/CASE-ROBOT-PEN/fill-draft',
      cookie,
    });
    expect(penDraftRes.status).toBe(200);
    expect(penDraftRes.body.data.status).toBe('FORM_FILLED');
    expect(penDraftRes.body.data.draft.isDraft).toBe(true);
    expect(penDraftRes.body.data.draft.portalDraft.submitted).toBe(false);
    expect(
      penDraftRes.body.data.draft.portalDraft.typedSelectors.length
    ).toBeGreaterThanOrEqual(13);

    // 2. Rename #input-course-name on the portal to trigger LLM-assisted selector fallback during Scholarship draft fill
    await robot.setFailureMode({
      brokenSelectors: { '#input-course-name': '#renamed-course-name-input' },
    });

    const schCatalog = loadCatalog('scholarship');
    const schDraftResult = await robot.fillDraft(
      {
        caseId: 'CASE-ROBOT-SCH',
        userId: 'user-ramabai',
        service: 'scholarship',
      },
      schCatalog.fields.map((f) => ({
        key: f.key,
        value:
          f.key === 'aadhaar_masked'
            ? '712345674821'
            : f.key === 'bank_account_masked'
              ? '309876549012'
              : 'SampleValue',
        source: f.source,
      }))
    );

    expect(schDraftResult.isDraft).toBe(true);
    expect(schDraftResult.submitted).toBe(false);
    expect(schDraftResult.typedSelectors).toHaveLength(14);
    expect(llmFallbacksReceived).toHaveLength(1);

    // Verify LLM fallback payload contains ONLY screenshotPath, pageId, brokenSelector, and fieldKeys (NEVER field values!)
    const llmPayload = llmFallbacksReceived[0];
    expect(Object.keys(llmPayload).sort()).toEqual([
      'brokenSelector',
      'fieldKeys',
      'pageId',
      'screenshotPath',
    ]);
    expect(llmPayload.fieldKeys).toContain('course_name');

    // Grep captured robot logs, outgoing LLM payloads, and screenshot filenames for full Aadhaar / phone / bank account numbers
    const serializedLogs = JSON.stringify(robot.logs);
    const serializedLlmPayloads = JSON.stringify(robot.llmPayloads);
    const allScreenshotNames = robot.screenshots.join(' ');

    for (const secretNumber of ['712345674821', '9876543210', '309876549012']) {
      expect(serializedLogs).not.toContain(secretNumber);
      expect(serializedLlmPayloads).not.toContain(secretNumber);
      expect(allScreenshotNames).not.toContain(secretNumber);
    }

    // Verify step screenshots were written to backend/storage/screenshots
    expect(robot.screenshots.length).toBeGreaterThanOrEqual(6);
    for (const shotPath of robot.screenshots) {
      expect(fs.existsSync(shotPath)).toBe(true);
    }
  });

  it('enforces Gate 2 + Fresh-Approval on submit(): throws with an audit entry without approval, invalidates approval when draft is edited after approval, and reads Application ID after re-approval', async () => {
    const caseId = 'CASE-FRESH-APPROVAL';

    // 1. Direct robot.submit() without approval throws APPROVAL_REQUIRED and writes AuditLog
    await expect(
      robot.submit({
        caseId,
        userId: 'user-1',
        service: 'pension',
        approval: { given: false, byPhysicalButton: false },
      })
    ).rejects.toThrow(/Gate 2 Violation/i);

    await flushPendingAudits();
    const blockedAudits = await findDocuments(AuditLog, {
      caseId,
      action: 'PORTAL_SUBMIT_BLOCKED_GATE2',
    });
    expect(blockedAudits.length).toBeGreaterThanOrEqual(1);

    // 2. Full API flow: create -> confirm -> consent -> docs -> fill-draft -> approve
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
    await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/fill-draft`,
      cookie,
    });

    const approve1 = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/approve`,
      cookie,
      body: { given: true, byPhysicalButton: true },
    });
    expect(approve1.status).toBe(200);
    expect(approve1.body.data.status).toBe('APPROVED');

    // 3. Citizen edits the draft AFTER approval -> invalidates approval and transitions back to FORM_FILLED
    const editRes = await invokeApp(app, {
      method: 'PATCH',
      url: `/cases/${caseId}/draft`,
      cookie,
      body: { fields: { address: 'Updated Ward 5, Shaniwar Peth, Pune' } },
    });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.status).toBe('FORM_FILLED');
    expect(editRes.body.data.approvalInvalidated).toBe(true);
    expect(editRes.body.data.approval.given).toBe(false);

    // Attempting submit after draft edit fails with 403 APPROVAL_REQUIRED + AuditLog
    const staleSubmit = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/submit`,
      cookie,
    });
    expect(staleSubmit.status).toBe(403);
    expect(staleSubmit.body.error).toBe('APPROVAL_REQUIRED');

    // Also verify direct timestamp comparison: if approval.at < draftUpdatedAt, robot.submit throws
    await expect(
      robot.submit({
        caseId,
        userId: 'user-1',
        service: 'pension',
        draftUpdatedAt: new Date(Date.now() + 10_000),
        approval: {
          given: true,
          byPhysicalButton: true,
          at: new Date(Date.now() - 10_000),
        },
      })
    ).rejects.toThrow(/invalidated/i);

    // 4. Re-approve after the edit -> submit succeeds and reads PEN-2026-88213 from the portal page
    await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/approve`,
      cookie,
      body: { given: true, byPhysicalButton: true },
    });

    const validSubmit = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/submit`,
      cookie,
    });
    expect(validSubmit.status).toBe(200);
    expect(validSubmit.body.data.status).toBe('SUBMITTED');
    expect(validSubmit.body.data.applicationId).toBe('PEN-2026-88213');
  });

  it('retries 3 times on a forced selector break and returns the clear citizen failure message', async () => {
    const caseId = 'CASE-SELECTOR-BREAK';
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

    // Force a selector break on #input-full-name with no LLM fallback
    robot.llmSelectorFallback = null;
    await robot.setFailureMode({
      brokenSelectors: { '#input-full-name': '#non-existent-broken-field' },
    });

    const brokenRes = await invokeApp(app, {
      method: 'POST',
      url: `/cases/${caseId}/fill-draft`,
      cookie,
    });
    expect(brokenRes.status).toBe(503);
    expect(brokenRes.body.error).toBe('PORTAL_FAILED_AFTER_3_RETRIES');
    expect(brokenRes.body.data.attempts).toEqual([
      'dobara koshish 1/3',
      'dobara koshish 2/3',
      'dobara koshish 3/3',
    ]);
    expect(brokenRes.body.data.draftSafe).toBe(true);
  });

  it('transitions portal status Pending -> Under review -> Query raised -> Approved via admin endpoints and updates daysSinceLastAction on clock skip', async () => {
    const appId = 'PEN-2026-88213';

    // Submit an application to initialize status = Pending
    await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/pension/apply?page=3&caseId=CASE-STATUS-FLOW',
      body: {
        action: 'submit',
        confirm_declaration: 'yes',
        appId,
        fields: { full_name: 'Ramabai Kulkarni' },
      },
    });

    // 1. Initial status is Pending, daysSinceLastAction = 0
    const s1 = await robot.getStatus(appId);
    expect(s1.stage).toBe('Pending');
    expect(s1.daysSinceLastAction).toBe(0);

    // Advance clock by 4 days -> daysSinceLastAction = 4
    await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/admin/advance-clock',
      body: { days: 4, appId },
    });
    const s1b = await robot.getStatus(appId);
    expect(s1b.daysSinceLastAction).toBe(4);

    // 2. Admin transitions status to "Under review" -> resets daysSinceLastAction to 0
    await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/admin/status',
      body: { appId, stage: 'Under review' },
    });
    const s2 = await robot.getStatus(appId);
    expect(s2.stage).toBe('Under review');
    expect(s2.status).toBe('TRACKING');
    expect(s2.daysSinceLastAction).toBe(0);

    // Advance clock by 8 days while Under review -> daysSinceLastAction = 8 -> STALLED!
    await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/admin/advance-clock',
      body: { days: 8, appId },
    });
    const s2Stalled = await robot.getStatus(appId);
    expect(s2Stalled.daysSinceLastAction).toBe(8);
    expect(s2Stalled.stalled).toBe(true);
    expect(s2Stalled.status).toBe('STALLED');

    // 3. Admin transitions status to "Query raised" -> status = QUERY_RAISED
    await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/admin/status',
      body: {
        appId,
        stage: 'Query raised',
        queryMessage: 'life certificate purana hai',
      },
    });
    const s3 = await robot.getStatus(appId);
    expect(s3.stage).toBe('Query raised');
    expect(s3.status).toBe('QUERY_RAISED');
    expect(s3.query.message).toMatch(/life certificate purana hai/i);

    // 4. Admin transitions status to "Approved" -> status = CLOSED
    await invokeApp(portalApp, {
      method: 'POST',
      url: '/portal/admin/status',
      body: { appId, stage: 'Approved' },
    });
    const s4 = await robot.getStatus(appId);
    expect(s4.stage).toBe('Approved');
    expect(s4.status).toBe('CLOSED');
    expect(s4.approvedByOffice).toBe(true);
  });
});

