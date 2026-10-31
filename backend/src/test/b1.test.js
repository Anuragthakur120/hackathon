import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuditLog,
  VaultDoc,
  clearMemoryDatabase,
  seedDatabase,
  findDocuments,
  findOneDocument,
  DEMO_CASE_ID,
} from '@nagarsathi/database';
import {
  createApp,
  invokeApp,
  encryptWithEnvKey,
  decryptWithEnvKey,
  maskForLlm,
  maskAadhaar,
  maskPhone,
  maskBankAccount,
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

describe('Module B1: Backend Auth (Phone+OTP, httpOnly JWT), Privacy (Masking, AES-256-GCM, LLM Scrubber), Audit Log Middleware & Core Routes', () => {
  let logSink = [];
  let app;

  beforeEach(async () => {
    process.env.OTP_MODE = 'mock';
    process.env.MOCK_OTP = '123456';
    clearMemoryDatabase();
    await seedDatabase('memory');
    logSink = [];
    app = createApp({ logSink, rateLimitMax: 100 });
  });

  it('completes phone + OTP login in mock mode (MOCK_OTP=123456) and sets an httpOnly JWT cookie with role=citizen', async () => {
    // 1. Request OTP
    const otpRes = await invokeApp(app, {
      method: 'POST',
      url: '/auth/otp',
      body: { phone: '9876543210', language: 'mr-IN' },
    });
    expect(otpRes.status).toBe(200);
    expect(otpRes.body.data.otpSent).toBe(true);
    expect(otpRes.body.data.phoneMasked).toBe('XXXXXX3210');
    expect(otpRes.body.data.mode).toBe('mock');

    // 2. Reject wrong OTP
    const badVerify = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9876543210', otp: '000000' },
    });
    expect(badVerify.status).toBe(401);
    expect(badVerify.body.error).toBe('INVALID_OTP');

    // 3. Accept MOCK_OTP=123456 and set httpOnly cookie
    const verifyRes = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9876543210', otp: '123456', language: 'mr-IN' },
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.authenticated).toBe(true);
    expect(verifyRes.body.data.citizen.role).toBe('citizen');
    expect(verifyRes.body.data.citizen.phoneMasked).toBe('XXXXXX3210');

    const rawSetCookie = verifyRes.setCookies.join('; ');
    expect(rawSetCookie).toMatch(/ns_token=/);
    expect(rawSetCookie).toMatch(/HttpOnly/i);
  });

  it('denies cross-user access across /profile, /vault, and /cases (a citizen can only access their own data)', async () => {
    // Log in Citizen A (Ramabai: 9876543210)
    const loginA = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9876543210', otp: '123456' },
    });
    const citizenAId = loginA.body.data.citizen.id;
    const cookieA = extractCookiePair(loginA.setCookies);

    // Log in Citizen B (Another citizen: 9123456789)
    const loginB = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9123456789', otp: '123456' },
    });
    const cookieB = extractCookiePair(loginB.setCookies);

    // Citizen A can read their own profile
    const ownProfileRes = await invokeApp(app, {
      method: 'GET',
      url: `/profile/${citizenAId}`,
      cookie: cookieA,
    });
    expect(ownProfileRes.status).toBe(200);
    expect(ownProfileRes.body.data.profile.fullName).toBe('Ramabai Kulkarni');

    // Citizen B attempting to read Citizen A's profile -> 403 CROSS_USER_ACCESS_DENIED
    const crossProfileRead = await invokeApp(app, {
      method: 'GET',
      url: `/profile/${citizenAId}`,
      cookie: cookieB,
    });
    expect(crossProfileRead.status).toBe(403);
    expect(crossProfileRead.body.error).toBe('CROSS_USER_ACCESS_DENIED');

    // Citizen B attempting to modify Citizen A's profile -> 403 CROSS_USER_ACCESS_DENIED
    const crossProfilePatch = await invokeApp(app, {
      method: 'PATCH',
      url: `/profile/${citizenAId}`,
      cookie: cookieB,
      body: { fullName: 'Unauthorized Edit', consentGiven: true },
    });
    expect(crossProfilePatch.status).toBe(403);
    expect(crossProfilePatch.body.error).toBe('CROSS_USER_ACCESS_DENIED');

    // Citizen B attempting to read Citizen A's Document Vault -> 403 CROSS_USER_ACCESS_DENIED
    const crossVaultRead = await invokeApp(app, {
      method: 'GET',
      url: `/vault/${citizenAId}`,
      cookie: cookieB,
    });
    expect(crossVaultRead.status).toBe(403);
    expect(crossVaultRead.body.error).toBe('CROSS_USER_ACCESS_DENIED');

    // Citizen B attempting to read Citizen A's Case (CASE-DEMO-001) -> 403 CROSS_USER_ACCESS_DENIED
    const crossCaseRead = await invokeApp(app, {
      method: 'GET',
      url: `/cases/${DEMO_CASE_ID}`,
      cookie: cookieB,
    });
    expect(crossCaseRead.status).toBe(403);
    expect(crossCaseRead.body.error).toBe('CROSS_USER_ACCESS_DENIED');
  });

  it('passes AES-256-GCM encryption round-trip, masks Aadhaar/phone/bank in logs & API responses, and never sends full Aadhaar to the LLM', async () => {
    // 1. AES-256-GCM encryption round-trip test
    const customKey = 'unit-test-encryption-key-32-bytes!';
    const sensitiveObj = {
      aadhaar: '712345674821',
      account: '309876549012',
      ifsc: 'SBIN0004821',
    };
    const encrypted = encryptWithEnvKey(sensitiveObj, customKey);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext).not.toContain('712345674821');
    const decrypted = decryptWithEnvKey(encrypted, customKey);
    expect(decrypted).toEqual(sensitiveObj);

    // 2. Direct masking helpers (last 4 digits only)
    expect(maskAadhaar('7123-4567-4821')).toBe('XXXX-XXXX-4821');
    expect(maskPhone('9876543210')).toBe('XXXXXX3210');
    expect(maskBankAccount('309876549012')).toBe('XXXXXXXX9012');

    // 3. LLM scrubber: never send full Aadhaar, phone, or bank account to the LLM
    const rawCitizenPrompt =
      'Majha Aadhaar 7123 4567 4821 aahe, mobile 9876543210 ani bank account 309876549012 aahe.';
    const safeForLlm = maskForLlm(rawCitizenPrompt);
    expect(safeForLlm).not.toContain('7123 4567 4821');
    expect(safeForLlm).not.toContain('9876543210');
    expect(safeForLlm).not.toContain('309876549012');
    expect(safeForLlm).toContain('XXXX-XXXX-4821');
    expect(safeForLlm).toContain('XXXXXX3210');
    expect(safeForLlm).toContain('XXXXXXXX9012');

    // 4. Request logger masks sensitive fields in request body
    await invokeApp(app, {
      method: 'POST',
      url: '/auth/otp',
      body: { phone: '9876543210', aadhaar: '712345674821', otp: '123456' },
    });
    expect(logSink.length).toBeGreaterThan(0);
    const lastLog = logSink[logSink.length - 1];
    expect(lastLog.maskedBody.phone).toBe('XXXXXX3210');
    expect(lastLog.maskedBody.aadhaar).toBe('XXXX-XXXX-4821');
    expect(lastLog.maskedBody.otp).toBe('[REDACTED]');
  });

  it('enforces profile save-consent, encrypts /vault uploads, serves /services and /health, enforces rate limit, and writes background AuditLog entries', async () => {
    // 1. /health and /services work cleanly
    const healthRes = await invokeApp(app, { method: 'GET', url: '/health' });
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');

    const servicesRes = await invokeApp(app, { method: 'GET', url: '/services' });
    expect(servicesRes.status).toBe(200);
    expect(servicesRes.body.data.services).toHaveLength(3);

    const scholarshipRes = await invokeApp(app, {
      method: 'GET',
      url: '/services/scholarship',
    });
    expect(scholarshipRes.status).toBe(200);
    expect(scholarshipRes.body.data.service.fields).toHaveLength(14);

    // 2. Login a new citizen and test Profile Save-Consent Gate
    const loginRes = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9988776655', otp: '123456' },
    });
    const cookie = extractCookiePair(loginRes.setCookies);

    // Saving profile WITHOUT consentGiven: true is rejected (400)
    const noConsentProfile = await invokeApp(app, {
      method: 'POST',
      url: '/profile',
      cookie,
      body: {
        consentGiven: false,
        fullName: 'Shantabai Pawar',
        aadhaar: '654321098765',
      },
    });
    expect(noConsentProfile.status).toBe(400);
    expect(noConsentProfile.body.error).toBe('PROFILE_CONSENT_REQUIRED');

    // Saving profile WITH consentGiven: true encrypts at rest and returns masked fields only
    const savedProfileRes = await invokeApp(app, {
      method: 'POST',
      url: '/profile',
      cookie,
      body: {
        consentGiven: true,
        fullName: 'Shantabai Pawar',
        dob: '1960-02-14',
        gender: 'Female',
        address: 'Kasba Peth, Pune',
        district: 'Pune',
        aadhaar: '654321098765',
        mobile: '9988776655',
        bankAccount: '445566771234',
      },
    });
    expect(savedProfileRes.status).toBe(200);
    const returnedProfile = savedProfileRes.body.data.profile;
    expect(returnedProfile.aadhaarMasked).toBe('XXXX-XXXX-8765');
    expect(returnedProfile.mobileMasked).toBe('XXXXXX6655');
    expect(returnedProfile.bankAccountMasked).toBe('XXXXXXXX1234');
    expect(returnedProfile.aadhaarEncrypted).toBeUndefined();
    expect(returnedProfile.bankAccountEncrypted).toBeUndefined();

    // 3. Upload document to /vault -> stored encrypted in VaultDoc, response stripped of ciphertext
    const vaultUploadRes = await invokeApp(app, {
      method: 'POST',
      url: '/vault',
      cookie,
      body: {
        type: 'life_certificate',
        maxAgeDays: 365,
        metadata: {
          aadhaar: '654321098765',
          life_certificate_id: 'JP-2026-7788',
        },
      },
    });
    expect(vaultUploadRes.status).toBe(201);
    expect(vaultUploadRes.body.data.document.maskedSummary).toBe('XXXX-XXXX-8765');
    expect(vaultUploadRes.body.data.document.encryptedMetadata).toBeUndefined();

    const storedDoc = await findOneDocument(VaultDoc, {
      userId: loginRes.body.data.citizen.id,
      type: 'life_certificate',
    });
    expect(storedDoc.encryptedMetadata.ciphertext).toBeDefined();
    expect(storedDoc.encryptedMetadata.ciphertext).not.toContain('654321098765');

    // 4. Flush background audit writes and verify AuditLog entries exist with masked payloads
    await flushPendingAudits();
    const audits = await findDocuments(AuditLog, {});
    expect(audits.length).toBeGreaterThanOrEqual(4);
    const vaultAudit = audits.find((a) => a.action === 'VAULT_DOCUMENT_UPLOADED');
    expect(vaultAudit).toBeDefined();
    expect(vaultAudit.maskedPayload.body.metadata.aadhaar).toBe('XXXX-XXXX-8765');

    // 5. Rate limiter blocks when exceeding max requests
    const strictApp = createApp({ rateLimitMax: 2 });
    await invokeApp(strictApp, { method: 'GET', url: '/health' });
    await invokeApp(strictApp, { method: 'GET', url: '/health' });
    const rateLimitedRes = await invokeApp(strictApp, {
      method: 'GET',
      url: '/health',
    });
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body.error).toBe('RATE_LIMIT_EXCEEDED');
  });
});

