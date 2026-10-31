export const ALLOWED_CATALOG_SERVICES = Object.freeze({
  pension: {
    id: 'pension_restoration',
    catalogId: 'pension',
    name: 'Old Age Pension Restoration',
  },
  pension_restoration: {
    id: 'pension_restoration',
    catalogId: 'pension',
    name: 'Old Age Pension Restoration',
  },
  scholarship: {
    id: 'scholarship',
    catalogId: 'scholarship',
    name: 'Post-Matric Scholarship',
  },
  ration_card: {
    id: 'ration_card',
    catalogId: 'ration_card',
    name: 'Priority Household Ration Card',
  },
});

const blockedCallGuardLogs = [];

export function getBlockedCallGuardLogs() {
  return [...blockedCallGuardLogs];
}

export function clearBlockedCallGuardLogs() {
  blockedCallGuardLogs.length = 0;
}

/**
 * Verifies that any service ID returned by the model exists in the official catalog.
 * Invented or unrecognized service IDs are always converted to `'unknown'`.
 */
export function verifyCatalogServiceId(rawServiceId) {
  if (!rawServiceId || typeof rawServiceId !== 'string') {
    return 'unknown';
  }
  const key = rawServiceId.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALLOWED_CATALOG_SERVICES, key)) {
    return ALLOWED_CATALOG_SERVICES[key].id;
  }
  return 'unknown';
}

/**
 * Validates that a `speech` string follows NagarSathi's spoken-voice rules:
 * - Non-empty string
 * - No URLs (`http://`, `https://`, `www.`, `.gov`, `.com`, `.in`)
 * - No brackets or code/math symbols (`(`, `)`, `[`, `]`, `{`, `}`, `<`, `>`, `/`, `\`, `*`, `#`, `@`, `=`, `+`, `|`, `~`, `_`)
 * - Short sentences (<= 14 words per sentence)
 */
export function validateSpeechField(speech) {
  if (!speech || typeof speech !== 'string' || !speech.trim()) {
    return { valid: false, reason: 'EMPTY_SPEECH' };
  }

  if (/(?:https?:\/\/|www\.|\.[a-z]{2,3}\/|\.gov\.in|\.com\b)/i.test(speech)) {
    return { valid: false, reason: 'SPEECH_CONTAINS_URL' };
  }

  if (/[[\]{}()<>/\\*#@=+|~_`^$%&]/.test(speech)) {
    return { valid: false, reason: 'SPEECH_CONTAINS_FORBIDDEN_SYMBOLS' };
  }

  const sentences = speech
    .split(/[.।?!]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length > 15) {
      return {
        valid: false,
        reason: `SPEECH_SENTENCE_TOO_LONG (${words.length} words)`,
      };
    }
  }

  return { valid: true, reason: null };
}

/**
 * Sanitizes a speech string by removing URLs, parenthetical remarks, brackets,
 * and forbidden symbols so TTS reads cleanly.
 */
export function sanitizeSpeechField(speech = '') {
  return String(speech)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[{}()<>/\\*#@=+|~_`^$%&:;-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates that an agent response matches strict `{ display, speech, data }` JSON schema
 * and that `speech` passes `validateSpeechField`.
 */
export function validateAgentResponseSchema(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, reason: 'NOT_AN_OBJECT' };
  }
  if (typeof payload.display !== 'string' || !payload.display.trim()) {
    return { valid: false, reason: 'INVALID_DISPLAY' };
  }
  if (typeof payload.speech !== 'string' || !payload.speech.trim()) {
    return { valid: false, reason: 'INVALID_SPEECH' };
  }
  if (
    !payload.data ||
    typeof payload.data !== 'object' ||
    Array.isArray(payload.data)
  ) {
    return { valid: false, reason: 'INVALID_DATA_OBJECT' };
  }

  const speechCheck = validateSpeechField(payload.speech);
  if (!speechCheck.valid) {
    return speechCheck;
  }

  return { valid: true, reason: null };
}

const ADVERSARIAL_CALL_PATTERNS = [
  /\b(?:aadhaar|aadhar|uidai|आधार)\b/i,
  /\b(?:otp|one[\s-]*time[\s-]*password|pin|ओटीपी|पिन)\b/i,
  /\b(?:password|passcode|secret|पासवर्ड)\b/i,
  /\b(?:bank\s*account|account\s*number|account\s*no|खाते\s*क्रमांक|बैंक\s*खाता|खाता\s*नंबर)\b/i,
  /\b(?:\d{4}[\s-]?){2}\d{4}\b/, // 12-digit Aadhaar-like number
  /\b\d{9,18}\b/, // 9-18 digit account/phone number
];

const SAFE_REFUSAL_BY_LANG = {
  'mr-IN': {
    display:
      'सुरक्षा नियमांनुसार मी आधार क्रमांक, बँक खाते किंवा ओटीपी सांगू शकत नाही. मी फक्त अर्ज क्रमांक PEN-2026-88213 आणि संदर्भ क्रमांक REF-5521 सांगू शकतो.',
    speech:
      'मी आधार किंवा ओटीपी सांगू शकत नाही. फक्त अर्ज क्रमांक सांगू शकतो.',
    agentLine:
      'Security Guard: I cannot share Aadhaar, OTP, password, or bank account numbers. Only Application ID PEN-2026-88213 for Ramabai Kulkarni may be shared.',
  },
  'hi-IN': {
    display:
      'सुरक्षा नियम के अनुसार मैं आधार नंबर, बैंक खाता या ओटीपी साझा नहीं कर सकता। मैं केवल आवेदन संख्या PEN-2026-88213 और संदर्भ REF-5521 बता सकता हूँ।',
    speech:
      'मैं आधार या ओटीपी नहीं बता सकता। केवल आवेदन संख्या बता सकता हूँ।',
    agentLine:
      'Security Guard: I cannot share Aadhaar, OTP, password, or bank account numbers. Only Application ID PEN-2026-88213 for Ramabai Kulkarni may be shared.',
  },
  'en-IN': {
    display:
      'Security policy blocks sharing Aadhaar, bank account, password, or OTP. I can only share Application ID PEN-2026-88213 and reference REF-5521 for Ramabai Kulkarni.',
    speech:
      'I cannot share Aadhaar or OTP. I can only share the application number.',
    agentLine:
      'Security Guard: I cannot share Aadhaar, OTP, password, or bank account numbers. Only Application ID PEN-2026-88213 for Ramabai Kulkarni may be shared.',
  },
};

function containsForbiddenCallContent(text = '') {
  if (!text || typeof text !== 'string') return null;
  for (const pattern of ADVERSARIAL_CALL_PATTERNS) {
    if (pattern.test(text)) {
      return pattern.toString();
    }
  }
  return null;
}

/**
 * Scans both incoming officer requests and every outgoing Caller agent line.
 * Blocks and logs any attempt to request or speak Aadhaar, OTP, password, or bank account numbers.
 * Only Application ID, citizen name, and reference numbers may be spoken.
 */
export function guardCallOutput({
  officerUtterance = '',
  agentResponse = {},
  language = 'mr-IN',
} = {}) {
  const lang = SAFE_REFUSAL_BY_LANG[language] ? language : 'mr-IN';
  const refusal = SAFE_REFUSAL_BY_LANG[lang];

  const officerMatch = containsForbiddenCallContent(officerUtterance);
  const displayMatch = containsForbiddenCallContent(agentResponse?.display);
  const speechMatch = containsForbiddenCallContent(agentResponse?.speech);

  let turnMatch = null;
  if (agentResponse?.data?.turn?.text) {
    turnMatch = containsForbiddenCallContent(agentResponse.data.turn.text);
  }
  if (!turnMatch && Array.isArray(agentResponse?.data?.turns)) {
    for (const t of agentResponse.data.turns) {
      const m = containsForbiddenCallContent(t?.text);
      if (m) {
        turnMatch = m;
        break;
      }
    }
  }

  const triggeredRule = officerMatch || displayMatch || speechMatch || turnMatch;
  if (!triggeredRule) {
    return {
      blocked: false,
      response: agentResponse,
    };
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    reason: officerMatch
      ? 'ADVERSARIAL_OFFICER_REQUEST_BLOCKED'
      : 'AGENT_SENSITIVE_OUTPUT_BLOCKED',
    pattern: triggeredRule,
    language: lang,
    allowedFieldsOnly: ['applicationId', 'citizenName', 'referenceId'],
  };
  blockedCallGuardLogs.push(logEntry);

  const safeResponse = {
    display: refusal.display,
    speech: refusal.speech,
    data: {
      ...(agentResponse?.data || {}),
      blockedByGuard: true,
      guardReason: logEntry.reason,
      allowedFieldsOnly: ['applicationId', 'citizenName', 'referenceId'],
      applicationId: agentResponse?.data?.applicationId || 'PEN-2026-88213',
      citizenName: 'Ramabai Kulkarni',
      referenceId: agentResponse?.data?.referenceId || 'REF-5521',
      turn: {
        speaker: 'NAGARSATHI_AGENT',
        text: refusal.agentLine,
      },
    },
  };

  return {
    blocked: true,
    logEntry,
    response: safeResponse,
  };
}
