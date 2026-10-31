import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Derives a deterministic 32-byte key from ENCRYPTION_KEY env var
 * or a safe local fallback for unit tests / mock mode.
 */
function getCipherKey(customSecret) {
  const secret =
    customSecret ||
    process.env.ENCRYPTION_KEY ||
    'nagarsathi-dev-local-encryption-key-32b';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypts a plaintext string or JSON value using AES-256-GCM.
 * Returns { iv, authTag, ciphertext }.
 */
export function encryptSensitiveValue(value, customSecret) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const plaintext = JSON.stringify({ __ns_val: value });
  const key = getCipherKey(customSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload { iv, authTag, ciphertext }.
 */
export function decryptSensitiveValue(payload, customSecret) {
  if (!payload || !payload.iv || !payload.authTag || !payload.ciphertext) {
    return null;
  }
  const key = getCipherKey(customSecret);
  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const encryptedText = Buffer.from(payload.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]).toString('utf8');

  try {
    const parsed = JSON.parse(decrypted);
    if (parsed && typeof parsed === 'object' && '__ns_val' in parsed) {
      return parsed.__ns_val;
    }
    return parsed;
  } catch {
    return decrypted;
  }
}

/**
 * Masks an Aadhaar number so only the last 4 digits are visible: XXXX-XXXX-4821.
 */
export function maskAadhaar(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const last4 = digits.slice(-4) || '0000';
  return `XXXX-XXXX-${last4}`;
}

/**
 * Masks a 10-digit mobile number so only the last 4 digits are visible: XXXXXX3210.
 */
export function maskPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const last4 = digits.slice(-4) || '0000';
  return `XXXXXX${last4}`;
}

/**
 * Masks a bank account number so only the last 4 digits are visible: XXXXXXXX9012.
 */
export function maskBankAccount(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const last4 = digits.slice(-4) || '0000';
  return `XXXXXXXX${last4}`;
}

/**
 * Recursively masks sensitive fields (aadhaar, mobile, phone, bankAccount, account_number, otp, password)
 * inside an arbitrary payload before writing to AuditLog.
 */
export function maskAuditPayload(payload) {
  if (payload === null || payload === undefined) {
    return {};
  }
  if (typeof payload !== 'object') {
    return { value: String(payload) };
  }
  if (Array.isArray(payload)) {
    return payload.map((item) =>
      typeof item === 'object' && item !== null ? maskAuditPayload(item) : item
    );
  }

  const scrubbed = {};
  for (const [key, val] of Object.entries(payload)) {
    const lower = key.toLowerCase();
    if (lower.includes('otp') || lower.includes('password') || lower.includes('secret')) {
      scrubbed[key] = '[REDACTED]';
    } else if (lower.includes('aadhaar')) {
      scrubbed[key] = maskAadhaar(val);
    } else if (lower.includes('phone') || lower.includes('mobile')) {
      scrubbed[key] = maskPhone(val);
    } else if (lower.includes('bank') || lower.includes('account')) {
      scrubbed[key] = maskBankAccount(val);
    } else if (val && typeof val === 'object') {
      scrubbed[key] = maskAuditPayload(val);
    } else {
      scrubbed[key] = val;
    }
  }
  return scrubbed;
}

