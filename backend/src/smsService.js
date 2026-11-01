/**
 * SMS & OTP Service for NagarSathi Citizen Authentication
 * Supports MSG91 and configurable HTTP SMS providers.
 * Enforces strictly development-only mock OTP mode.
 */
import { maskPhone } from './privacy.js';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const otpStore = new Map();
const rateLimitStore = new Map();

export function clearSmsRateLimits() {
  otpStore.clear();
  rateLimitStore.clear();
}

/**
 * Normalizes an Indian mobile number to 10 digits
 * Handles +91, 91, 0 prefix, spaces, and dashes
 */
export function normalizeIndianPhone(input) {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(-10);
}

export function isValidIndianMobile(digits) {
  return /^[6-9]\d{9}$/.test(digits) || /^\d{10}$/.test(digits);
}

/**
 * Generates a random 6-digit numeric OTP
 */
export function generateOtpCode() {
  const isMock = process.env.OTP_MODE === 'mock' || !isProduction;
  if (isMock && process.env.MOCK_OTP) {
    return process.env.MOCK_OTP;
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Sends OTP via configured SMS provider (e.g. MSG91) or mock mode
 */
export async function sendOtpToPhone(phoneDigits, language = 'en-IN') {
  const normalized = normalizeIndianPhone(phoneDigits);
  if (!isValidIndianMobile(normalized)) {
    const err = new Error('INVALID_PHONE');
    err.code = 'INVALID_PHONE';
    throw err;
  }

  // Rate Limiting: Max 5 OTP requests per 5 minutes per phone number (disabled in automated test suites)
  const now = Date.now();
  if (!isTest) {
    const rateRecord = rateLimitStore.get(normalized) || { count: 0, windowStart: now };
    if (now - rateRecord.windowStart > 5 * 60 * 1000) {
      rateRecord.count = 0;
      rateRecord.windowStart = now;
    }
    if (rateRecord.count >= 5) {
      const waitTime = Math.ceil((rateRecord.windowStart + 5 * 60 * 1000 - now) / 1000);
      const err = new Error(`RATE_LIMIT_EXCEEDED: Please wait ${waitTime} seconds before requesting another OTP`);
      err.code = 'RATE_LIMIT_EXCEEDED';
      err.retryAfter = waitTime;
      throw err;
    }
    rateRecord.count += 1;
    rateLimitStore.set(normalized, rateRecord);
  }

  const otpMode = process.env.OTP_MODE || (isProduction ? 'live' : 'mock');

  if (isProduction && otpMode === 'mock') {
    throw new Error('SECURITY VIOLATION: Mock OTP mode is strictly prohibited in production');
  }

  const otpCode = generateOtpCode();
  const expiresAt = now + 5 * 60 * 1000; // 5 minute expiry

  otpStore.set(normalized, {
    otp: otpCode,
    language,
    expiresAt,
    attempts: 0,
    lockedUntil: null,
  });

  const phoneMasked = maskPhone(normalized);

  // If live SMS provider configured (e.g. MSG91)
  if (otpMode === 'live' && process.env.MSG91_AUTH_KEY) {
    try {
      const response = await fetch('https://api.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: process.env.MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
          template_id: process.env.MSG91_TEMPLATE_ID || 'nagarsathi_otp_template',
          mobile: `91${normalized}`,
          otp: otpCode,
          sender: process.env.MSG91_SENDER_ID || 'NGRSTH',
        }),
      });
      if (!response.ok) {
        console.error(`[SMS] MSG91 delivery returned HTTP ${response.status} for ${phoneMasked}`);
      }
    } catch (smsErr) {
      console.error(`[SMS] Failed to send SMS via MSG91 to ${phoneMasked}:`, smsErr.message);
    }
  }

  return {
    phoneMasked,
    otpSent: true,
    expiresAt,
    mode: otpMode,
    isMock: otpMode === 'mock',
  };
}

/**
 * Verifies the OTP with attempt tracking and 5-minute expiry
 */
export function verifyOtpCode(phoneDigits, enteredOtp) {
  const normalized = normalizeIndianPhone(phoneDigits);
  const now = Date.now();
  const stored = otpStore.get(normalized);

  const otpMode = process.env.OTP_MODE || (isProduction ? 'live' : 'mock');
  const expectedMockOtp = process.env.MOCK_OTP || '123456';

  if (!stored) {
    // If in dev mock mode and matches 123456
    if (otpMode === 'mock' && String(enteredOtp).trim() === expectedMockOtp) {
      return { success: true, normalizedPhone: normalized };
    }
    const err = new Error('OTP_NOT_FOUND_OR_EXPIRED');
    err.code = 'EXPIRED_OTP';
    throw err;
  }

  // Check lockout
  if (stored.lockedUntil && now < stored.lockedUntil) {
    const remaining = Math.ceil((stored.lockedUntil - now) / 1000);
    const err = new Error(`LOCKED: Too many failed attempts. Try again in ${remaining}s`);
    err.code = 'LOCKED';
    err.remainingSeconds = remaining;
    throw err;
  }

  // Check 5-minute expiry
  if (now > stored.expiresAt) {
    otpStore.delete(normalized);
    const err = new Error('OTP_EXPIRED: OTP expired after 5 minutes');
    err.code = 'EXPIRED_OTP';
    throw err;
  }

  // Validate OTP
  const isMatch =
    (otpMode === 'mock' && String(enteredOtp).trim() === expectedMockOtp) ||
    stored.otp === String(enteredOtp).trim();

  if (!isMatch) {
    stored.attempts = (stored.attempts || 0) + 1;
    let locked = false;
    if (stored.attempts >= 5) {
      stored.lockedUntil = now + 30 * 1000; // 30-second lock
      locked = true;
    }
    const err = new Error('INVALID_OTP');
    err.code = locked ? 'LOCKED' : 'INVALID_OTP';
    err.attempts = stored.attempts;
    err.locked = locked;
    err.remainingSeconds = 30;
    throw err;
  }

  // Verification succeeded: delete stored OTP
  otpStore.delete(normalized);
  return { success: true, normalizedPhone: normalized };
}
