export const CASE_STATUS = Object.freeze({
  INTAKE: 'INTAKE',
  SERVICE_CONFIRMED: 'SERVICE_CONFIRMED',
  CONSENTED: 'CONSENTED',
  DOCS_COLLECTING: 'DOCS_COLLECTING',
  DOCS_READY: 'DOCS_READY',
  FORM_FILLED: 'FORM_FILLED',
  APPROVED: 'APPROVED',
  SUBMITTED: 'SUBMITTED',
  TRACKING: 'TRACKING',
  QUERY_RAISED: 'QUERY_RAISED',
  STALLED: 'STALLED',
  CALLED: 'CALLED',
  CLOSED: 'CLOSED',
});

export const CASE_JOURNEY_SEQUENCE = Object.freeze([
  CASE_STATUS.INTAKE,
  CASE_STATUS.SERVICE_CONFIRMED,
  CASE_STATUS.CONSENTED,
  CASE_STATUS.DOCS_COLLECTING,
  CASE_STATUS.DOCS_READY,
  CASE_STATUS.FORM_FILLED,
  CASE_STATUS.APPROVED,
  CASE_STATUS.SUBMITTED,
  CASE_STATUS.TRACKING,
  CASE_STATUS.QUERY_RAISED,
  CASE_STATUS.STALLED,
  CASE_STATUS.CALLED,
  CASE_STATUS.TRACKING,
  CASE_STATUS.CLOSED,
]);

export const ALLOWED_TRANSITIONS = Object.freeze({
  [CASE_STATUS.INTAKE]: [
    CASE_STATUS.SERVICE_CONFIRMED,
    CASE_STATUS.CONSENTED,
    CASE_STATUS.DOCS_READY,
    CASE_STATUS.FORM_FILLED,
    CASE_STATUS.APPROVED,
    CASE_STATUS.SUBMITTED,
  ],
  [CASE_STATUS.SERVICE_CONFIRMED]: [
    CASE_STATUS.CONSENTED,
    CASE_STATUS.INTAKE,
    CASE_STATUS.FORM_FILLED,
    CASE_STATUS.APPROVED,
    CASE_STATUS.SUBMITTED,
  ],
  [CASE_STATUS.CONSENTED]: [
    CASE_STATUS.DOCS_COLLECTING,
    CASE_STATUS.DOCS_READY,
    CASE_STATUS.FORM_FILLED,
    CASE_STATUS.APPROVED,
    CASE_STATUS.SUBMITTED,
  ],
  [CASE_STATUS.DOCS_COLLECTING]: [
    CASE_STATUS.DOCS_COLLECTING,
    CASE_STATUS.DOCS_READY,
    CASE_STATUS.FORM_FILLED,
    CASE_STATUS.APPROVED,
    CASE_STATUS.SUBMITTED,
  ],
  [CASE_STATUS.DOCS_READY]: [
    CASE_STATUS.FORM_FILLED,
    CASE_STATUS.APPROVED,
    CASE_STATUS.SUBMITTED,
  ],
  [CASE_STATUS.FORM_FILLED]: [CASE_STATUS.APPROVED, CASE_STATUS.SUBMITTED],
  [CASE_STATUS.APPROVED]: [CASE_STATUS.SUBMITTED, CASE_STATUS.FORM_FILLED],
  [CASE_STATUS.SUBMITTED]: [CASE_STATUS.TRACKING, CASE_STATUS.INTAKE],
  [CASE_STATUS.TRACKING]: [
    CASE_STATUS.QUERY_RAISED,
    CASE_STATUS.STALLED,
    CASE_STATUS.CLOSED,
    CASE_STATUS.INTAKE,
  ],
  [CASE_STATUS.QUERY_RAISED]: [
    CASE_STATUS.TRACKING,
    CASE_STATUS.STALLED,
    CASE_STATUS.DOCS_COLLECTING,
    CASE_STATUS.INTAKE,
  ],
  [CASE_STATUS.STALLED]: [CASE_STATUS.CALLED, CASE_STATUS.TRACKING, CASE_STATUS.INTAKE],
  [CASE_STATUS.CALLED]: [CASE_STATUS.TRACKING, CASE_STATUS.CLOSED, CASE_STATUS.INTAKE],
  [CASE_STATUS.CLOSED]: [CASE_STATUS.INTAKE],
});

export const MACRO_PHASES = Object.freeze({
  SAMAJHNA: 'SAMAJHNA',
  KARNA: 'KARNA',
  PEECHA_KARNA: 'PEECHA_KARNA',
});

export function getMacroPhase(status) {
  switch (status) {
    case CASE_STATUS.INTAKE:
    case CASE_STATUS.SERVICE_CONFIRMED:
    case CASE_STATUS.CONSENTED:
      return MACRO_PHASES.SAMAJHNA;
    case CASE_STATUS.DOCS_COLLECTING:
    case CASE_STATUS.DOCS_READY:
    case CASE_STATUS.FORM_FILLED:
    case CASE_STATUS.APPROVED:
    case CASE_STATUS.SUBMITTED:
      return MACRO_PHASES.KARNA;
    case CASE_STATUS.TRACKING:
    case CASE_STATUS.QUERY_RAISED:
    case CASE_STATUS.STALLED:
    case CASE_STATUS.CALLED:
    case CASE_STATUS.CLOSED:
      return MACRO_PHASES.PEECHA_KARNA;
    default:
      return MACRO_PHASES.SAMAJHNA;
  }
}

export function canTransition(currentStatus, nextStatus, context = {}) {
  // Always permit transitioning to APPROVED if approval has been explicitly given
  if (nextStatus === CASE_STATUS.APPROVED && context?.approval?.given) {
    return { ok: true, reason: null };
  }

  // HARD SAFETY RULE: Submit never runs without approval.given === true
  if (nextStatus === CASE_STATUS.SUBMITTED) {
    if (!context?.approval || context.approval.given !== true) {
      return {
        ok: false,
        reason: 'HARD_SAFETY_GUARD: Transition to SUBMITTED refused because approval.given !== true',
      };
    }
    return { ok: true, reason: null };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      reason: `Invalid transition from ${currentStatus} to ${nextStatus}`,
    };
  }

  return { ok: true, reason: null };
}

export function transitionCaseState(caseState, nextStatus, payload = {}) {
  const currentStatus = caseState?.status || CASE_STATUS.INTAKE;
  const mergedContext = {
    ...caseState,
    ...payload,
    approval: payload.approval !== undefined ? payload.approval : caseState?.approval,
  };

  const check = canTransition(currentStatus, nextStatus, mergedContext);
  if (!check.ok) {
    const error = new Error(check.reason);
    error.code =
      nextStatus === CASE_STATUS.SUBMITTED
        ? 'APPROVAL_REQUIRED'
        : 'INVALID_TRANSITION';
    throw error;
  }

  return {
    ...mergedContext,
    status: nextStatus,
    history: [
      ...(caseState?.history || [currentStatus]),
      nextStatus,
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function createInitialCaseState(language = 'mr-IN') {
  return {
    id: 'CASE-RAMABAI-001',
    language,
    status: CASE_STATUS.INTAKE,
    serviceId: null,
    serviceName: null,
    confidence: null,
    consent: { given: false, timestamp: null },
    documents: [],
    draft: null,
    approval: { given: false, timestamp: null },
    submission: null,
    tracking: null,
    callRecord: null,
    history: [CASE_STATUS.INTAKE],
    updatedAt: new Date().toISOString(),
  };
}

