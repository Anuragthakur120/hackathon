import { describe, it, expect, beforeEach } from 'vitest';
import {
  User,
  Profile,
  VaultDoc,
  Case,
  AuditLog,
  ServiceCatalog,
  CASE_TTL_SECONDS,
  CASE_16_STEP_STATUSES,
  clearMemoryDatabase,
  saveDocument,
  findDocuments,
  findOneDocument,
  getCollectionIndexes,
  createEncryptedProfile,
  decryptProfileSensitiveFields,
  validateCatalog,
  loadCatalog,
  loadAllCatalogs,
  autoFillDraftFields,
  isDocumentRequired,
  evaluateDocumentFreshness,
  deleteAllCitizenData,
  seedDatabase,
  triggerDay10CaseQuery,
  triggerPlus21DaysCaseStall,
  DEMO_CASE_ID,
  DEMO_APP_ID,
  DEMO_REF_NO,
} from '../index.js';

describe('Module D1: Database (Schemas, 3 Data Layers, Catalog JSONs, Auto-Fill, Seed, TTL Index & Cascading Delete)', () => {
  beforeEach(() => {
    clearMemoryDatabase();
  });

  it('validates all 3 catalog JSONs (pension, scholarship with 14 fields, ration_card) against JSON schema including portal, tracking, office_call, required_if & max_age_days', () => {
    const catalogs = loadAllCatalogs();
    expect(catalogs).toHaveLength(3);

    const ids = catalogs.map((c) => c.id);
    expect(ids).toEqual(['pension', 'scholarship', 'ration_card']);

    for (const cat of catalogs) {
      const check = validateCatalog(cat);
      expect(check.valid).toBe(true);
      expect(check.errors).toEqual([]);
      expect(cat.steps).toHaveLength(16);
      expect(cat.tracking.stall_after_days).toBe(7);
      expect(cat.office_call.may_say).toEqual(
        expect.arrayContaining(['application_id', 'name'])
      );
      expect(cat.office_call.never_say).toEqual(
        expect.arrayContaining(['aadhaar', 'otp', 'password', 'account_number'])
      );
      expect(cat.portal.start_path).toMatch(/^\/portal\//);
      expect(Object.keys(cat.portal.uploads).length).toBeGreaterThan(0);
    }

    // Verify scholarship.json has all 14 required fields
    const scholarship = loadCatalog('scholarship');
    expect(scholarship.fields).toHaveLength(14);
    const scholarshipFieldKeys = scholarship.fields.map((f) => f.key);
    expect(scholarshipFieldKeys).toEqual([
      'full_name',
      'dob',
      'gender',
      'aadhaar_masked',
      'mobile',
      'address',
      'district',
      'caste_category',
      'annual_family_income',
      'course_name',
      'institute_name',
      'previous_year_marks_pct',
      'bank_account_masked',
      'ifsc',
    ]);

    // Verify validator rejects malformed catalog objects
    const invalidResult = validateCatalog({ id: 'invalid_service' });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('seeds demo user Ramabai, all 3 services, and the mock portal case, creating all collections and the 30-day TTL index on Case', async () => {
    const seeded = await seedDatabase('memory');

    expect(seeded.collections).toEqual([
      'auditlogs',
      'cases',
      'profiles',
      'servicecatalogs',
      'users',
      'vaultdocs',
    ]);

    // Verify TTL index on Case (expireAfterSeconds = 2,592,000 = 30 days)
    const caseIndexes = await getCollectionIndexes(Case);
    const ttlIndex = caseIndexes.find(
      (idx) => idx.key?.createdAt === 1 && idx.expireAfterSeconds === CASE_TTL_SECONDS
    );
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.expireAfterSeconds).toBe(30 * 24 * 60 * 60);

    // Verify unique indexes exist on User, Profile, Case, ServiceCatalog
    const userIndexes = await getCollectionIndexes(User);
    expect(userIndexes.some((idx) => idx.key?.phone === 1 && idx.unique)).toBe(true);
    const profileIndexes = await getCollectionIndexes(Profile);
    expect(profileIndexes.some((idx) => idx.key?.userId === 1 && idx.unique)).toBe(true);
    const catalogIndexes = await getCollectionIndexes(ServiceCatalog);
    expect(catalogIndexes.some((idx) => idx.key?.serviceId === 1 && idx.unique)).toBe(true);

    // Verify seeded records
    expect(seeded.user.phoneMasked).toBe('XXXXXX3210');
    expect(seeded.user.language).toBe('mr-IN');
    expect(seeded.user.role).toBe('citizen');
    expect(seeded.catalogs).toHaveLength(3);
    expect(seeded.vaultDocs).toHaveLength(5);
    expect(seeded.demoCase.caseId).toBe(DEMO_CASE_ID);
    expect(seeded.demoCase.appId).toBe(DEMO_APP_ID);
    expect(seeded.demoCase.refNo).toBe(DEMO_REF_NO);

    // Verify Day-10 Query and +21-Day Stall triggers on the seeded case
    const afterQuery = await triggerDay10CaseQuery(DEMO_CASE_ID);
    expect(afterQuery.status).toBe('QUERY_RAISED');
    expect(afterQuery.queryDetails.active).toBe(true);
    expect(afterQuery.queryDetails.raisedOnDay).toBe(10);
    expect(afterQuery.queryDetails.message).toMatch(/life certificate purana hai/i);

    const afterStall = await triggerPlus21DaysCaseStall(DEMO_CASE_ID);
    expect(afterStall.status).toBe('STALLED');
    expect(afterStall.stallDetails.stalled).toBe(true);
    expect(afterStall.stallDetails.daysElapsed).toBe(21);
    expect(afterStall.stallDetails.stalledDays).toBe(7);
    expect(afterStall.stallDetails.reason).toMatch(/7 din se ruka hai/i);
  });

  it('enforces encryption at rest, PII masking, Profile consent Gate 1, Case approval Gate 2, and AuditLog scrubbing', async () => {
    const seeded = await seedDatabase('memory');

    // 1. Profile sensitive fields are encrypted at rest (ciphertext != plaintext) and masked to last 4 digits
    expect(seeded.profile.aadhaarMasked).toBe('XXXX-XXXX-4821');
    expect(seeded.profile.mobileMasked).toBe('XXXXXX3210');
    expect(seeded.profile.bankAccountMasked).toBe('XXXXXXXX9012');
    expect(seeded.profile.aadhaarEncrypted.ciphertext).not.toContain('712345674821');
    expect(seeded.profile.bankAccountEncrypted.ciphertext).not.toContain('309876549012');

    // Authorized decryption recovers exact plaintext values
    const decrypted = decryptProfileSensitiveFields(seeded.profile);
    expect(decrypted.aadhaarDecrypted).toBe('712345674821');
    expect(decrypted.mobileDecrypted).toBe('9876543210');
    expect(decrypted.bankAccountDecrypted).toBe('309876549012');

    // 2. Profile CANNOT be saved without consentGiven === true
    await expect(
      createEncryptedProfile({
        userId: seeded.user._id,
        consentGiven: false,
        fullName: 'No Consent User',
        dob: '1960-01-01',
        gender: 'Female',
        address: 'Pune',
        district: 'Pune',
        aadhaar: '123456789012',
        mobile: '9876543210',
        bankAccount: '112233445566',
      })
    ).rejects.toThrow(/consentGiven/i);

    // 3. Case CANNOT transition to SUBMITTED without consent.caseConsent and approval.given
    expect(CASE_16_STEP_STATUSES).toHaveLength(16);
    await expect(
      saveDocument(Case, {
        caseId: 'CASE-UNAPPROVED-001',
        userId: seeded.user._id,
        service: 'pension',
        status: 'SUBMITTED',
        consent: { caseConsent: true },
        approval: { given: false },
      })
    ).rejects.toThrow(/Safety Gate 2 Violation/i);

    // 4. AuditLog automatically masks sensitive fields in maskedPayload
    expect(seeded.auditLog.maskedPayload.aadhaar).toBe('XXXX-XXXX-4821');
    expect(seeded.auditLog.maskedPayload.phone).toBe('XXXXXX3210');
    expect(seeded.auditLog.maskedPayload.bankAccount).toBe('XXXXXXXX9012');
  });

  it('auto-fills fields from higher-trust sources first (PROFILE -> DOCUMENT -> DERIVED -> DEFAULT) and asks citizen only for missing fields, plus evaluates required_if & max_age_days', async () => {
    const seeded = await seedDatabase('memory');
    const scholarshipCatalog = loadCatalog('scholarship');

    // Auto-fill scholarship without citizen answers yet:
    // Profile + VaultDocs fill 10 fields; course_name, institute_name, annual_family_income, previous_year_marks_pct remain missing
    const partialFill = autoFillDraftFields({
      catalog: scholarshipCatalog,
      profile: seeded.profile,
      vaultDocs: seeded.vaultDocs,
      citizenAnswers: {},
    });

    const filledKeys = partialFill.draftFields.map((f) => f.key);
    expect(filledKeys).toEqual(
      expect.arrayContaining([
        'full_name',
        'dob',
        'gender',
        'aadhaar_masked',
        'mobile',
        'address',
        'district',
        'caste_category',
        'bank_account_masked',
        'ifsc',
      ])
    );

    const missingKeys = partialFill.missingCitizenQuestions.map((q) => q.key);
    expect(missingKeys).toContain('course_name');
    expect(missingKeys).toContain('institute_name');
    expect(missingKeys).not.toContain('full_name');
    expect(missingKeys).not.toContain('aadhaar_masked');

    // Evaluate conditional required_if on caste_certificate
    const casteDocDef = scholarshipCatalog.documents.find(
      (d) => d.key === 'caste_certificate'
    );
    expect(isDocumentRequired(casteDocDef, { caste_category: 'General' })).toBe(false);
    expect(isDocumentRequired(casteDocDef, { caste_category: 'OBC' })).toBe(true);

    // Evaluate max_age_days (365 days) on life_certificate
    const pensionCatalog = loadCatalog('pension');
    const lifeCertDef = pensionCatalog.documents.find(
      (d) => d.key === 'life_certificate'
    );
    const freshCheck = evaluateDocumentFreshness(
      lifeCertDef,
      { status: 'VERIFIED', issuedAt: new Date('2026-09-01T00:00:00Z') },
      new Date('2026-10-31T00:00:00Z')
    );
    expect(freshCheck.valid).toBe(true);

    const expiredCheck = evaluateDocumentFreshness(
      lifeCertDef,
      { status: 'VERIFIED', issuedAt: new Date('2024-01-01T00:00:00Z') },
      new Date('2026-10-31T00:00:00Z')
    );
    expect(expiredCheck.valid).toBe(false);
    expect(expiredCheck.reason).toBe('EXPIRED_MAX_AGE_DAYS');
  });

  it('cascading delete helper ("delete all my data") removes Profile, VaultDocs, Cases, and User across all 3 data layers', async () => {
    const seeded = await seedDatabase('memory');
    const userId = seeded.user._id;

    const deletionResult = await deleteAllCitizenData(userId);
    expect(deletionResult.deleted).toBe(true);
    expect(deletionResult.counts).toEqual({
      profiles: 1,
      vaultDocs: 5,
      cases: 1,
      users: 1,
    });

    expect(await findOneDocument(Profile, { userId })).toBeNull();
    expect(await findDocuments(VaultDoc, { userId })).toHaveLength(0);
    expect(await findDocuments(Case, { userId })).toHaveLength(0);
    expect(await findOneDocument(User, { _id: userId })).toBeNull();

    const auditLogs = await findDocuments(AuditLog, {
      action: 'DELETE_ALL_MY_DATA',
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].userId).toBe('ANONYMIZED_DELETED_USER');
  });
});

