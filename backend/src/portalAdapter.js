import { enqueueAuditLog } from './auditMiddleware.js';

const APP_ID_BY_SERVICE = Object.freeze({
  pension: 'PEN-2026-88213',
  scholarship: 'SCH-2026-88213',
  ration_card: 'RAT-2026-88213',
});

/**
 * In-memory fake implementation of the Portal Adapter interface:
 *   - fillDraft(caseDoc, draftFields)
 *   - submit(caseDoc)
 *   - getStatus(appId, options)
 * Used in unit/integration tests and mock portal mode before Playwright robot (B3).
 */
export class InMemoryPortalAdapter {
  constructor() {
    this.drafts = new Map();
    this.submissions = new Map();
    this.failRemaining = 0;
    this.alwaysFail = false;
  }

  /**
   * Configures the fake portal to fail for the next `count` calls (or indefinitely if `count === Infinity`).
   */
  setFailureMode({ failTimes = 0, alwaysFail = false } = {}) {
    this.failRemaining = failTimes;
    this.alwaysFail = alwaysFail;
  }

  reset() {
    this.drafts.clear();
    this.submissions.clear();
    this.failRemaining = 0;
    this.alwaysFail = false;
  }

  _checkSimulatedFailure(operationName) {
    if (this.alwaysFail) {
      const err = new Error(`Portal ${operationName} failed: Portal server timeout`);
      err.code = 'PORTAL_UNAVAILABLE';
      throw err;
    }
    if (this.failRemaining > 0) {
      this.failRemaining -= 1;
      const err = new Error(`Portal ${operationName} failed: Temporary portal error`);
      err.code = 'PORTAL_UNAVAILABLE';
      throw err;
    }
  }

  async fillDraft(caseDoc, draftFields = []) {
    this._checkSimulatedFailure('fillDraft');
    const draftRecord = {
      caseId: caseDoc.caseId,
      service: caseDoc.service,
      isDraft: true,
      submitted: false,
      fields: draftFields,
      filledAt: new Date().toISOString(),
    };
    this.drafts.set(caseDoc.caseId, draftRecord);
    return draftRecord;
  }

  async submit(caseDoc) {
    // Hard safety enforcement inside adapter as well
    if (
      caseDoc?.approval?.given !== true ||
      caseDoc?.approval?.byPhysicalButton !== true
    ) {
      const err = new Error(
        'Gate 2 Violation: submit() requires case.approval.given === true and physical button confirmation'
      );
      err.code = 'APPROVAL_REQUIRED';
      err.statusCode = 403;
      throw err;
    }

    this._checkSimulatedFailure('submit');

    const appId =
      caseDoc.appId ||
      APP_ID_BY_SERVICE[caseDoc.service] ||
      'PEN-2026-88213';

    const submission = {
      appId,
      caseId: caseDoc.caseId,
      service: caseDoc.service,
      status: 'SUBMITTED',
      daysElapsed: 0,
      stalled: false,
      stalledDays: 0,
      query: null,
      approvedByOffice: false,
      submittedAt: new Date().toISOString(),
    };
    this.submissions.set(appId, submission);
    return submission;
  }

  async getStatus(appId, { daysElapsed, raiseQueryOnDay10 = false } = {}) {
    this._checkSimulatedFailure('getStatus');

    const record = this.submissions.get(appId) || {
      appId,
      status: 'TRACKING',
      daysElapsed: 0,
      stalled: false,
      stalledDays: 0,
      query: null,
      approvedByOffice: false,
    };

    if (daysElapsed !== undefined) {
      record.daysElapsed = Number(daysElapsed);
    }

    if (record.approvedByOffice) {
      record.status = 'CLOSED';
      record.stalled = false;
      return { ...record };
    }

    if (raiseQueryOnDay10 || record.daysElapsed === 10) {
      record.status = 'QUERY_RAISED';
      record.query = {
        active: true,
        raisedOnDay: 10,
        code: 'LIFE_CERT_EXPIRED',
        documentKey: 'life_certificate',
        message: 'Office ne ek sawal poocha: life certificate purana hai',
      };
      this.submissions.set(appId, record);
      return { ...record };
    }

    if (record.daysElapsed >= 21) {
      record.status = 'STALLED';
      record.stalled = true;
      record.stalledDays = Math.max(7, record.daysElapsed - 14);
      record.reason = '7 din se ruka hai';
      this.submissions.set(appId, record);
      return { ...record };
    }

    record.status = 'TRACKING';
    record.stalled = false;
    this.submissions.set(appId, record);
    return { ...record };
  }

  markOfficeApproved(appId) {
    const record = this.submissions.get(appId) || { appId };
    record.approvedByOffice = true;
    record.status = 'CLOSED';
    record.stalled = false;
    this.submissions.set(appId, record);
    return { ...record };
  }
}

export const defaultPortalAdapter = new InMemoryPortalAdapter();

/**
 * Portal call wrapper that retries up to `maxAttempts` (default 3) times.
 * Records retry progress ("dobara koshish 1/3", "2/3", "3/3") and throws a
 * structured citizen-friendly error if all 3 attempts fail.
 */
export async function withPortalRetry(
  operationFn,
  {
    maxAttempts = 3,
    actionName = 'PORTAL_CALL',
    caseId = null,
    userId = null,
  } = {}
) {
  const attempts = [];
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await operationFn(attempt);
      return {
        ok: true,
        attemptCount: attempt,
        attempts,
        result,
      };
    } catch (err) {
      // Do not retry Gate 1 / Gate 2 authorization errors or already-retried robot errors
      if (
        err.code === 'APPROVAL_REQUIRED' ||
        err.code === 'CONSENT_REQUIRED' ||
        err.code === 'PORTAL_FAILED_AFTER_3_RETRIES'
      ) {
        throw err;
      }
      lastError = err;
      const retryLabel = `dobara koshish ${attempt}/${maxAttempts}`;
      attempts.push(retryLabel);

      enqueueAuditLog({
        actor: 'SYSTEM',
        action: `${actionName}_RETRY_${attempt}`,
        caseId,
        userId,
        payload: {
          attempt,
          maxAttempts,
          retryLabel,
          error: err.message,
        },
      });
    }
  }

  const finalErr = new Error(
    `सरकारी पोर्टल सध्या प्रतिसाद देत नाही (${attempts.join(', ')}). तुमचा मसुदा सुरक्षित आहे.`
  );
  finalErr.code = 'PORTAL_FAILED_AFTER_3_RETRIES';
  finalErr.statusCode = 503;
  finalErr.attempts = attempts;
  finalErr.cause = lastError;
  throw finalErr;
}

/**
 * Core backend submit() function enforcing Gate 2:
 * Throws APPROVAL_REQUIRED unless `caseDoc.approval.given === true` AND
 * `caseDoc.approval.byPhysicalButton === true` (voice-only approval is never enough).
 */
export async function submitCaseToPortal(
  caseDoc,
  { portalAdapter = defaultPortalAdapter } = {}
) {
  const approval = caseDoc?.approval;
  const hasApproval =
    approval?.given === true && approval?.byPhysicalButton === true;
  const approvalTime = approval?.at ? new Date(approval.at).getTime() : 0;
  const draftTime = caseDoc?.draftUpdatedAt
    ? new Date(caseDoc.draftUpdatedAt).getTime()
    : 0;
  const isStaleApproval = draftTime > 0 && approvalTime < draftTime;

  if (!hasApproval || isStaleApproval) {
    const reason = isStaleApproval
      ? 'Draft was edited after approval; approval has been invalidated'
      : 'case.approval.given !== true or physical confirmation button was not pressed';

    enqueueAuditLog({
      actor: 'SYSTEM',
      action: 'PORTAL_SUBMIT_BLOCKED_GATE2',
      caseId: caseDoc?.caseId || null,
      userId: caseDoc?.userId ? String(caseDoc.userId) : null,
      payload: {
        hasApproval,
        isStaleApproval,
        approvalAt: approval?.at || null,
        draftUpdatedAt: caseDoc?.draftUpdatedAt || null,
        reason,
      },
    });

    const err = new Error(`Gate 2 Violation: submit() refused because ${reason}`);
    err.code = 'APPROVAL_REQUIRED';
    err.statusCode = 403;
    throw err;
  }

  return withPortalRetry(() => portalAdapter.submit(caseDoc), {
    maxAttempts: 3,
    actionName: 'PORTAL_SUBMIT',
    caseId: caseDoc.caseId,
    userId: String(caseDoc.userId),
  });
}

