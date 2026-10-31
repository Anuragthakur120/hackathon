export const EVAL_DATASET = [
  // ==========================================================================
  // 1. INTAKE AGENT (mr-IN, hi-IN, en-IN)
  // ==========================================================================
  {
    id: 'intake-mr',
    agent: 'intake',
    language: 'mr-IN',
    input: {
      action: 'classify',
      transcript: 'माझी पेन्शन चार महिन्यांपासून बंद झाली आहे',
      language: 'mr-IN',
    },
    expected: {
      serviceId: 'pension_restoration',
      minConfidence: 0.8,
      clarifyingQuestion: 'kaunsi pension?',
    },
  },
  {
    id: 'intake-hi',
    agent: 'intake',
    language: 'hi-IN',
    input: {
      action: 'classify',
      transcript: 'मेरी पेंशन चार महीने से बंद हो गई है',
      language: 'hi-IN',
    },
    expected: {
      serviceId: 'pension_restoration',
      minConfidence: 0.8,
      clarifyingQuestion: 'kaunsi pension?',
    },
  },
  {
    id: 'intake-en',
    agent: 'intake',
    language: 'en-IN',
    input: {
      action: 'classify',
      transcript: 'My old age pension stopped four months ago',
      language: 'en-IN',
    },
    expected: {
      serviceId: 'pension_restoration',
      minConfidence: 0.8,
      clarifyingQuestion: 'kaunsi pension?',
    },
  },

  // ==========================================================================
  // 2. DOCUMENT AGENT (mr-IN, hi-IN, en-IN)
  // ==========================================================================
  {
    id: 'documents-mr',
    agent: 'documents',
    language: 'mr-IN',
    input: {
      caseId: 'CASE-PEN-2026-001',
      markReady: true,
      language: 'mr-IN',
    },
    expected: {
      status: 'DOCS_READY',
      checklistCount: 3,
    },
  },
  {
    id: 'documents-hi',
    agent: 'documents',
    language: 'hi-IN',
    input: {
      caseId: 'CASE-PEN-2026-001',
      simulateIssue: 'blurry',
      language: 'hi-IN',
    },
    expected: {
      status: 'DOCS_COLLECTING',
      issue: 'PHOTO_BLURRY',
    },
  },
  {
    id: 'documents-en',
    agent: 'documents',
    language: 'en-IN',
    input: {
      caseId: 'CASE-PEN-2026-001',
      simulateIssue: 'expired',
      language: 'en-IN',
    },
    expected: {
      status: 'DOCS_COLLECTING',
      issue: 'LIFE_CERT_EXPIRED',
    },
  },

  // ==========================================================================
  // 3. PORTAL AGENT (mr-IN, hi-IN, en-IN)
  // ==========================================================================
  {
    id: 'portal-mr',
    agent: 'portal',
    language: 'mr-IN',
    input: {
      action: 'fillDraft',
      caseId: 'CASE-PEN-2026-001',
      language: 'mr-IN',
    },
    expected: {
      status: 'FORM_FILLED',
      isDraft: true,
      canSubmit: false,
    },
  },
  {
    id: 'portal-hi',
    agent: 'portal',
    language: 'hi-IN',
    input: {
      action: 'fillDraft',
      caseId: 'CASE-PEN-2026-001',
      language: 'hi-IN',
    },
    expected: {
      status: 'FORM_FILLED',
      isDraft: true,
      canSubmit: false,
    },
  },
  {
    id: 'portal-en',
    agent: 'portal',
    language: 'en-IN',
    input: {
      action: 'fillDraft',
      caseId: 'CASE-PEN-2026-001',
      language: 'en-IN',
    },
    expected: {
      status: 'FORM_FILLED',
      isDraft: true,
      canSubmit: false,
    },
  },

  // ==========================================================================
  // 4. TRACKER AGENT (mr-IN, hi-IN, en-IN)
  // ==========================================================================
  {
    id: 'tracker-mr',
    agent: 'tracker',
    language: 'mr-IN',
    input: {
      action: 'track',
      caseId: 'CASE-PEN-2026-001',
      applicationId: 'PEN-2026-88213',
      language: 'mr-IN',
    },
    expected: {
      status: 'TRACKING',
      applicationId: 'PEN-2026-88213',
    },
  },
  {
    id: 'tracker-hi',
    agent: 'tracker',
    language: 'hi-IN',
    input: {
      action: 'query',
      caseId: 'CASE-PEN-2026-001',
      applicationId: 'PEN-2026-88213',
      language: 'hi-IN',
    },
    expected: {
      status: 'QUERY_RAISED',
      applicationId: 'PEN-2026-88213',
    },
  },
  {
    id: 'tracker-en',
    agent: 'tracker',
    language: 'en-IN',
    input: {
      action: 'stalled',
      caseId: 'CASE-PEN-2026-001',
      applicationId: 'PEN-2026-88213',
      days: 21,
      language: 'en-IN',
    },
    expected: {
      status: 'STALLED',
      stalled: true,
    },
  },

  // ==========================================================================
  // 5. CALLER AGENT (mr-IN, hi-IN, en-IN)
  // ==========================================================================
  {
    id: 'caller-mr',
    agent: 'caller',
    language: 'mr-IN',
    input: {
      action: 'turn',
      caseId: 'CASE-PEN-2026-001',
      applicationId: 'PEN-2026-88213',
      officerUtterance: 'Checked file, logged escalation reference REF-5521.',
      language: 'mr-IN',
    },
    expected: {
      extractedRefId: 'REF-5521',
    },
  },
  {
    id: 'caller-hi',
    agent: 'caller',
    language: 'hi-IN',
    input: {
      action: 'end',
      caseId: 'CASE-PEN-2026-001',
      applicationId: 'PEN-2026-88213',
      referenceId: 'REF-5521',
      language: 'hi-IN',
    },
    expected: {
      status: 'CALLED',
      referenceId: 'REF-5521',
    },
  },
  {
    id: 'caller-en',
    agent: 'caller',
    language: 'en-IN',
    input: {
      action: 'start',
      caseId: 'CASE-PEN-2026-001',
      applicationId: 'PEN-2026-88213',
      language: 'en-IN',
    },
    expected: {
      status: 'IN_PROGRESS',
    },
  },

  // ==========================================================================
  // 6. LETTER EXPLAINER AGENT (mr-IN, hi-IN, en-IN)
  // ==========================================================================
  {
    id: 'letter-mr',
    agent: 'letter',
    language: 'mr-IN',
    input: {
      text: 'Notice: Submit Jeevan Pramaan certificate within 15 days to Taluka Social Welfare Office.',
      language: 'mr-IN',
    },
    expected: {
      deadline: '15 days',
    },
  },
  {
    id: 'letter-hi',
    agent: 'letter',
    language: 'hi-IN',
    input: {
      text: 'Notice: Submit Jeevan Pramaan certificate within 15 days to Taluka Social Welfare Office.',
      language: 'hi-IN',
    },
    expected: {
      deadline: '15 days',
    },
  },
  {
    id: 'letter-en',
    agent: 'letter',
    language: 'en-IN',
    input: {
      text: 'Notice: Submit Jeevan Pramaan certificate within 15 days to Taluka Social Welfare Office.',
      language: 'en-IN',
    },
    expected: {
      deadline: '15 days',
    },
  },
];

