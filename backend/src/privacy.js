import {
  encryptSensitiveValue,
  decryptSensitiveValue,
  maskAadhaar,
  maskPhone,
  maskBankAccount,
  maskAuditPayload,
} from '@nagarsathi/database';

export { maskAadhaar, maskPhone, maskBankAccount, maskAuditPayload };

/**
 * AES-256-GCM encryption using ENCRYPTION_KEY from environment.
 */
export function encryptWithEnvKey(value, customKey = process.env.ENCRYPTION_KEY) {
  return encryptSensitiveValue(value, customKey);
}

/**
 * AES-256-GCM decryption using ENCRYPTION_KEY from environment.
 */
export function decryptWithEnvKey(payload, customKey = process.env.ENCRYPTION_KEY) {
  return decryptSensitiveValue(payload, customKey);
}

/**
 * Masks any raw Aadhaar (12 digits, with or without spaces/hyphens),
 * 10-digit Indian mobile numbers, or 11-18 digit bank account numbers inside
 * free text or structured objects BEFORE sending to an LLM.
 * Guarantees full Aadhaar / phone / account numbers are never sent to the LLM.
 */
export function maskForLlm(input) {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    let text = input;
    // 1. Mask numbers explicitly preceded by account / bank keywords -> XXXXXXXXlast4
    text = text.replace(
      /((?:account|bank)\s*(?:no|number)?\s*[:=-]?\s*)\d{5,14}(\d{4})\b/gi,
      '$1XXXXXXXX$2'
    );
    // 2. Mask formatted Aadhaar: 1234-5678-4821 or 1234 5678 4821
    text = text.replace(/\b\d{4}[-\s]\d{4}[-\s](\d{4})\b/g, 'XXXX-XXXX-$1');
    // 3. Mask contiguous 12-digit Aadhaar numbers
    text = text.replace(/\b\d{8}(\d{4})\b/g, 'XXXX-XXXX-$1');
    // 4. Mask remaining 11-18 digit bank account numbers
    text = text.replace(/\b\d{7,14}(\d{4})\b/g, 'XXXXXXXX$1');
    // 5. Mask 10-digit Indian mobile numbers starting with 6-9
    text = text.replace(/\b[6-9]\d{5}(\d{4})\b/g, 'XXXXXX$1');
    return text;
  }

  if (Array.isArray(input)) {
    return input.map((item) => maskForLlm(item));
  }

  if (typeof input === 'object') {
    const maskedObj = {};
    for (const [k, v] of Object.entries(input)) {
      const lower = k.toLowerCase();
      if (
        lower.includes('encrypted') ||
        lower.includes('otp') ||
        lower.includes('password') ||
        lower.includes('secret')
      ) {
        maskedObj[k] = '[REDACTED]';
      } else if (lower.includes('aadhaar')) {
        maskedObj[k] = maskAadhaar(v);
      } else if (lower.includes('phone') || lower.includes('mobile')) {
        maskedObj[k] = maskPhone(v);
      } else if (lower.includes('bank') || lower.includes('account')) {
        maskedObj[k] = maskBankAccount(v);
      } else {
        maskedObj[k] = maskForLlm(v);
      }
    }
    return maskedObj;
  }

  return input;
}

/**
 * Sanitizes objects before returning them in API responses:
 * - Removes raw encrypted blobs (aadhaarEncrypted, mobileEncrypted, bankAccountEncrypted, encryptedMetadata)
 * - Masks any raw aadhaar, phone/mobile, or bankAccount fields to last-4 digits only.
 */
export function sanitizeForApiResponse(input) {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForApiResponse(item));
  }
  if (typeof input !== 'object' || input instanceof Date) {
    return input;
  }

  const out = {};
  for (const [key, val] of Object.entries(input)) {
    if (
      key === 'aadhaarEncrypted' ||
      key === 'mobileEncrypted' ||
      key === 'bankAccountEncrypted' ||
      key === 'encryptedMetadata'
    ) {
      continue;
    }
    const lower = key.toLowerCase();
    if (lower === 'aadhaar') {
      out.aadhaarMasked = maskAadhaar(val);
    } else if (lower === 'phone' || lower === 'mobile') {
      out[key] = maskPhone(val);
    } else if (lower === 'bankaccount' || lower === 'account_number') {
      out.bankAccountMasked = maskBankAccount(val);
    } else if (val && typeof val === 'object' && !(val instanceof Date)) {
      out[key] = sanitizeForApiResponse(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Express request logger middleware that masks all sensitive fields in body and query.
 */
export function createRequestLogger({ sink = [] } = {}) {
  return function requestLoggerMiddleware(req, res, next) {
    const startedAt = Date.now();
    res.on('finish', () => {
      const entry = {
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        maskedBody: maskAuditPayload(req.body || {}),
        maskedQuery: maskAuditPayload(req.query || {}),
        timestamp: new Date().toISOString(),
      };
      sink.push(entry);
    });
    next();
  };
}
