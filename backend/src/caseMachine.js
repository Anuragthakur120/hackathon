import {
  Case,
  CASE_TTL_SECONDS,
} from '@nagarsathi/database';
import { enqueueAuditLog } from './auditMiddleware.js';

/**
 * The canonical 16-step case statuses + operational states for NagarSathi.
 */
export const CASE_STATUS = Object.freeze({
  LANGUAGE_SELECTED: 'LANGUAGE_SELECTED',
  INTAKE: 'INTAKE',
  CLARIFYING: 'CLARIFYING',
  SERVICE_CONFIRMED: 'SERVICE_CONFIRMED',
  CONSENT_PENDING: 'CONSENT_PENDING',
  CONSENTED: 'CONSENTED',
  PROFILE_SAVE_CONSENT: 'PROFILE_SAVE_CONSENT',
  DOCS_CHECKLIST: 'DOCS_CHECKLIST',
  DOCS_COLLECTING: 'DOCS_COLLECTING',
  DOCS_UPLOADED: 'DOCS_UPLOADED',
  DOCS_READY: 'DOCS_READY',
  FORM_FILLED: 'FORM_FILLED',
  APPROVED: 'APPROVED',
  SUBMITTED: 'SUBMITTED',
  TRACKING: 'TRACKING',
  QUERY_RAISED: 'QUERY_RAISED',
  STALLED: 'STALLED',
  CALLED: 'CALLED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
});

// Ensure Mongoose runtime schema accepts DOCS_COLLECTING without modifying /database files
function ensureRuntimeEnumSupport(schemaPath) {
  if (!schemaPath) return;
  if (Array.isArray(schemaPath.enumValues) && !schemaPath.enumValues.includes('DOCS_COLLECTING')) {
    schemaPath.enumValues.push('DOCS_COLLECTING');
  }
  if (Array.isArray(schemaPath.validators)) {
    for (const v of schemaPath.validators) {
      if (Array.isArray(v.enumValues) && !v.enumValues.includes('DOCS_COLLECTING')) {
        v.enumValues.push('DOCS_COLLECTING');
      }
    }
  }
}

ensureRuntimeEnumSupport(Case.schema.path('status'));
ensureRuntimeEnumSupport(Case.schema.path('history')?.schema?.path('status'));
if (!Case.schema.path('draftUpdatedAt')) {
  Case.schema.add({ draftUpdatedAt: { type: Date, default: null } });
}

/**
 * Gate 1 CAN / CANNOT lists recorded when citizen reviews consent.
 */
export const GATE1_PERMISSIONS = Object.freeze({
  canDo: [
    'FILL_DRAFT_FORM',
    'TRACK_APPLICATION_STATUS',
    'CALL_OFFICE_ON_STALL',
  ],
  cannotDo: [
    'SUBMIT_WITHOUT_CITIZEN_APPROVAL',
    'PAY_OR_DEDUCT_MONEY',
    'SHARE_DATA_WITH_THIRD_PARTIES',
  ],
});

/**
 * Allowed state transitions map enforcing the 16-step journey & loopbacks:
 * INTAKE -> SERVICE_CONFIRMED -> CONSENTED -> DOCS_COLLECTING -> DOCS_READY ->
 * FORM_FILLED -> APPROVED -> SUBMITTED -> TRACKING -> QUERY_RAISED -> STALLED ->
 * CALLED -> TRACKING -> CLOSED
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  LANGUAGE_SELECTED: ['INTAKE', 'CANCELLED'],
  INTAKE: ['INTAKE', 'CLARIFYING', 'SERVICE_CONFIRMED', 'CANCELLED'],
  CLARIFYING: ['CLARIFYING', 'SERVICE_CONFIRMED', 'INTAKE', 'CANCELLED'],
  SERVICE_CONFIRMED: ['CONSENT_PENDING', 'CONSENTED', 'CANCELLED'],
  CONSENT_PENDING: ['CONSENTED', 'CANCELLED'],
  CONSENTED: [
    'PROFILE_SAVE_CONSENT',
    'DOCS_COLLECTING',
    'DOCS_CHECKLIST',
    'DOCS_READY',
    'CANCELLED',
  ],
  PROFILE_SAVE_CONSENT: ['DOCS_COLLECTING', 'DOCS_CHECKLIST', 'DOCS_READY'],
  DOCS_CHECKLIST: ['DOCS_COLLECTING', 'DOCS_UPLOADED', 'DOCS_READY'],
  DOCS_COLLECTING: ['DOCS_COLLECTING', 'DOCS_UPLOADED', 'DOCS_READY'],
  DOCS_UPLOADED: ['DOCS_COLLECTING', 'DOCS_READY'],
  DOCS_READY: ['DOCS_COLLECTING', 'FORM_FILLED'],
  FORM_FILLED: ['FORM_FILLED', 'DOCS_COLLECTING', 'APPROVED'],
  APPROVED: ['FORM_FILLED', 'SUBMITTED'],
  SUBMITTED: ['TRACKING', 'QUERY_RAISED', 'STALLED'],
  TRACKING: ['TRACKING', 'QUERY_RAISED', 'STALLED', 'CLOSED'],
  QUERY_RAISED: ['DOCS_COLLECTING', 'DOCS_READY', 'TRACKING', 'STALLED'],
  STALLED: ['CALLED', 'TRACKING', 'CLOSED'],
  CALLED: ['TRACKING', 'CLOSED'],
  CLOSED: [],
  CANCELLED: ['INTAKE'],
});

export const STEP_NUMBER_BY_STATUS = Object.freeze({
  LANGUAGE_SELECTED: 1,
  INTAKE: 2,
  CLARIFYING: 3,
  SERVICE_CONFIRMED: 4,
  CONSENT_PENDING: 5,
  CONSENTED: 6,
  PROFILE_SAVE_CONSENT: 7,
  DOCS_CHECKLIST: 8,
  DOCS_COLLECTING: 8,
  DOCS_UPLOADED: 8,
  DOCS_READY: 9,
  FORM_FILLED: 10,
  APPROVED: 11,
  SUBMITTED: 12,
  TRACKING: 13,
  QUERY_RAISED: 14,
  STALLED: 15,
  CALLED: 15,
  CLOSED: 16,
  CANCELLED: 0,
});

/**
 * Checks whether transitioning from `fromStatus` to `toStatus` is legal.
 */
export function isLegalTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Validates and applies a state transition to a case object, enforcing:
 *   1. Transition legality (ALLOWED_TRANSITIONS)
 *   2. Gate 1 (consent.caseConsent === true required for post-CONSENTED states)
 *   3. Gate 2 (approval.given === true && approval.byPhysicalButton === true required for SUBMITTED)
 *   4. Appends history item and triggers background AuditLog entry.
 */
export function transitionCase(
  caseDoc,
  toStatus,
  { actor = 'AGENT', note = '', patch = {} } = {}
) {
  if (!caseDoc || !caseDoc.status) {
    const err = new Error('Invalid case document provided to transitionCase');
    err.code = 'INVALID_CASE';
    err.statusCode = 400;
    throw err;
  }

  const fromStatus = caseDoc.status;
  if (!isLegalTransition(fromStatus, toStatus)) {
    const err = new Error(
      `Illegal case status transition: ${fromStatus} -> ${toStatus}`
    );
    err.code = 'ILLEGAL_CASE_TRANSITION';
    err.statusCode = 409;
    throw err;
  }

  const mergedConsent = {
    ...(caseDoc.consent || {}),
    ...(patch.consent || {}),
  };
  const mergedApproval = {
    ...(caseDoc.approval || {}),
    ...(patch.approval || {}),
  };

  // Gate 1 enforcement for states after SERVICE_CONFIRMED (except CANCELLED)
  const postConsentStates = new Set([
    'CONSENTED',
    'PROFILE_SAVE_CONSENT',
    'DOCS_CHECKLIST',
    'DOCS_COLLECTING',
    'DOCS_UPLOADED',
    'DOCS_READY',
    'FORM_FILLED',
    'APPROVED',
    'SUBMITTED',
    'TRACKING',
    'QUERY_RAISED',
    'STALLED',
    'CALLED',
    'CLOSED',
  ]);
  if (postConsentStates.has(toStatus) && mergedConsent.caseConsent !== true) {
    const err = new Error(
      `Gate 1 Violation: Cannot transition to ${toStatus} without caseConsent === true`
    );
    err.code = 'CONSENT_REQUIRED';
    err.statusCode = 403;
    throw err;
  }

  // Gate 2 enforcement for APPROVED and SUBMITTED+
  if (
    toStatus === 'APPROVED' ||
    toStatus === 'SUBMITTED' ||
    toStatus === 'TRACKING' ||
    toStatus === 'QUERY_RAISED' ||
    toStatus === 'STALLED' ||
    toStatus === 'CALLED' ||
    toStatus === 'CLOSED'
  ) {
    if (mergedApproval.given !== true || mergedApproval.byPhysicalButton !== true) {
      const err = new Error(
        `Gate 2 Violation: Cannot transition to ${toStatus} without explicit physical button approval (approval.given === true && byPhysicalButton === true)`
      );
      err.code = 'APPROVAL_REQUIRED';
      err.statusCode = 403;
      throw err;
    }
  }

  const stepNo = STEP_NUMBER_BY_STATUS[toStatus] ?? 0;
  const historyEntry = {
    step: stepNo,
    status: toStatus,
    note: note || `Transitioned ${fromStatus} -> ${toStatus}`,
    actor,
    at: new Date(),
  };

  const nextCase = {
    ...caseDoc,
    ...patch,
    status: toStatus,
    consent: mergedConsent,
    approval: mergedApproval,
    history: [...(caseDoc.history || []), historyEntry],
  };

  enqueueAuditLog({
    actor,
    action: 'CASE_STATE_TRANSITION',
    caseId: nextCase.caseId,
    userId: String(nextCase.userId),
    payload: {
      fromStatus,
      toStatus,
      step: stepNo,
      note: historyEntry.note,
      ttlSeconds: CASE_TTL_SECONDS,
    },
  });

  return nextCase;
}

