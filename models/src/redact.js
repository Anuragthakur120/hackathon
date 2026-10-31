/**
 * Redacts sensitive citizen PII (Aadhaar, mobile phone, bank account numbers, and OTP/PIN/passwords)
 * before any text or object is sent to the Claude LLM prompt.
 */
export function redact(text = '') {
  if (text === null || text === undefined) return '';
  let out = String(text);

  // 1. Redact OTP / PIN / Password tokens near keywords
  out = out.replace(
    /\b(otp|pin|password|passcode|ओटीपी|पासवर्ड|कोड)(\s*(?:is|hai|aahe|आहे|है|:|=|-)?\s*)([0-9A-Za-z@#$_-]{4,16})\b/gi,
    '$1$2[REDACTED_OTP]'
  );

  // 2. Redact bank account numbers preceded by account/bank keywords (keep last 4 digits masked)
  out = out.replace(
    /\b(account(?:\s+number|\s+no)?|bank(?:\s+account)?|खाते|खाता)(\s*[:=-]?\s*)\d{5,14}(\d{4})\b/gi,
    '$1$2XXXXXXXX$3'
  );

  // 3. Redact 12-digit Aadhaar numbers (with or without spaces/hyphens -> XXXX-XXXX-last4)
  out = out.replace(/\b(?:\d{4}[\s-]?){2}(\d{4})\b/g, 'XXXX-XXXX-$1');

  // 4. Redact 10-digit Indian mobile numbers (starting 6-9 -> XXXXXXlast4)
  out = out.replace(/\b[6-9]\d{5}(\d{4})\b/g, 'XXXXXX$1');

  // 5. Redact remaining 11 to 18 digit bank account numbers
  out = out.replace(/\b\d{7,14}(\d{4})\b/g, 'XXXXXXXX$1');

  return out;
}

/**
 * Recursively redacts all strings and sensitive keys inside an object or array
 * before serialization into an LLM prompt.
 */
export function redactPayload(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redact(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redactPayload(item));

  const result = {};
  for (const [k, v] of Object.entries(value)) {
    const lowerKey = k.toLowerCase();
    if (
      lowerKey.includes('otp') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret')
    ) {
      result[k] = '[REDACTED_OTP]';
    } else if (lowerKey.includes('aadhaar') && typeof v === 'string') {
      const digits = v.replace(/\D/g, '');
      result[k] =
        digits.length >= 4 ? `XXXX-XXXX-${digits.slice(-4)}` : 'XXXX-XXXX-XXXX';
    } else if (
      (lowerKey.includes('bank') || lowerKey.includes('account')) &&
      typeof v === 'string'
    ) {
      const digits = v.replace(/\D/g, '');
      result[k] =
        digits.length >= 4 ? `XXXXXXXX${digits.slice(-4)}` : 'XXXXXXXXXXXX';
    } else if (
      (lowerKey.includes('phone') || lowerKey.includes('mobile')) &&
      typeof v === 'string'
    ) {
      const digits = v.replace(/\D/g, '');
      result[k] =
        digits.length >= 4 ? `XXXXXX${digits.slice(-4)}` : 'XXXXXXXXXX';
    } else {
      result[k] = redactPayload(v);
    }
  }
  return result;
}

