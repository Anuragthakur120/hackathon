import {
  User,
  VaultDoc,
  Case,
  AuditLog,
  ServiceCatalog,
  connectDatabase,
  saveDocument,
  updateOneDocument,
  createEncryptedProfile,
  listCreatedCollections,
} from './models/index.js';
import { encryptSensitiveValue, maskAadhaar, maskBankAccount } from './crypto.js';
import { loadAllCatalogs } from './validator.js';
import { autoFillDraftFields } from './autofill.js';

export const DEMO_CASE_ID = 'CASE-DEMO-001';
export const DEMO_APP_ID = 'PEN-2026-88213';
export const DEMO_REF_NO = 'REF-5521';

/**
 * Triggers the Day-10 Office Query ("life certificate purana hai") on a Case.
 */
export async function triggerDay10CaseQuery(caseId = DEMO_CASE_ID) {
  const updated = await updateOneDocument(
    Case,
    { caseId },
    {
      status: 'QUERY_RAISED',
      queryDetails: {
        active: true,
        raisedOnDay: 10,
        message: 'Office ne ek sawal poocha: life certificate purana hai',
        documentKey: 'life_certificate',
        resolvedAt: null,
      },
      history: [
        {
          step: 12,
          status: 'SUBMITTED',
          note: `Submitted to pension portal (${DEMO_APP_ID})`,
          actor: 'AGENT',
          at: new Date('2026-10-01T10:00:00Z'),
        },
        {
          step: 13,
          status: 'TRACKING',
          note: 'Daily portal status check active',
          actor: 'AGENT',
          at: new Date('2026-10-05T10:00:00Z'),
        },
        {
          step: 14,
          status: 'QUERY_RAISED',
          note: 'Day 10: Office ne ek sawal poocha - life certificate purana hai',
          actor: 'OFFICER',
          at: new Date('2026-10-11T10:00:00Z'),
        },
      ],
    }
  );

  await saveDocument(AuditLog, {
    actor: 'OFFICER',
    action: 'CASE_QUERY_RAISED_DAY_10',
    caseId,
    timestamp: new Date(),
    maskedPayload: {
      raisedOnDay: 10,
      documentKey: 'life_certificate',
      message: 'life certificate purana hai',
    },
  });

  return updated;
}

/**
 * Simulates +21 days elapsed on a Case, triggering the 7-day stall ("7 din se ruka hai").
 */
export async function triggerPlus21DaysCaseStall(caseId = DEMO_CASE_ID) {
  const nextCheckAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const updated = await updateOneDocument(
    Case,
    { caseId },
    {
      status: 'STALLED',
      stallDetails: {
        stalled: true,
        daysElapsed: 21,
        stalledDays: 7,
        reason: '7 din se ruka hai (No officer movement for 7 days after Day 14)',
      },
      nextCheckAt,
      history: [
        {
          step: 12,
          status: 'SUBMITTED',
          note: `Submitted to pension portal (${DEMO_APP_ID})`,
          actor: 'AGENT',
          at: new Date('2026-10-01T10:00:00Z'),
        },
        {
          step: 14,
          status: 'QUERY_RAISED',
          note: 'Day 10: Office query raised - life certificate purana hai',
          actor: 'OFFICER',
          at: new Date('2026-10-11T10:00:00Z'),
        },
        {
          step: 13,
          status: 'TRACKING',
          note: 'Renewed life certificate uploaded; returned to TRACKING',
          actor: 'CITIZEN',
          at: new Date('2026-10-12T10:00:00Z'),
        },
        {
          step: 15,
          status: 'STALLED',
          note: '+21 din elapsed: 7 din se ruka hai at Ward Verification Desk',
          actor: 'SYSTEM',
          at: new Date('2026-10-22T10:00:00Z'),
        },
      ],
    }
  );

  await saveDocument(AuditLog, {
    actor: 'SYSTEM',
    action: 'CASE_STALL_DETECTED_21_DAYS',
    caseId,
    timestamp: new Date(),
    maskedPayload: {
      daysElapsed: 21,
      stalledDays: 7,
      reason: '7 din se ruka hai',
    },
  });

  return updated;
}

/**
 * Seeds the database with:
 *   1. Demo user Ramabai Kulkarni (Marathi, citizen)
 *   2. Encrypted Profile (Layer 1) with saveProfileConsent = true
 *   3. Encrypted VaultDocs (Layer 2) for Pension documents
 *   4. All 3 validated ServiceCatalogs (pension, scholarship, ration_card)
 *   5. Mock portal Case (Layer 3, CASE-DEMO-001) with Day-10 query & +21-day stall history
 *   6. AuditLog records with masked payloads
 */
export async function seedDatabase(uri = process.env.MONGODB_URI) {
  const connectionInfo = await connectDatabase(uri);

  // 1. Validate & seed all 3 service catalogs
  const catalogs = loadAllCatalogs();
  const seededCatalogs = [];
  for (const cat of catalogs) {
    const savedCat = await saveDocument(ServiceCatalog, {
      serviceId: cat.id,
      code: cat.code,
      department: cat.department,
      name: cat.name,
      description: cat.description,
      fields: cat.fields,
      documents: cat.documents,
      steps: cat.steps,
      portal: cat.portal,
      tracking: cat.tracking,
      office_call: cat.office_call,
      updatedAt: new Date(),
    });
    seededCatalogs.push(savedCat);
  }

  // 2. Seed Demo Citizen User: Ramabai Kulkarni
  const ramabaiUser = await saveDocument(User, {
    phone: '9876543210',
    phoneMasked: 'XXXXXX3210',
    language: 'mr-IN',
    role: 'citizen',
  });

  // 3. Seed Data Layer 1: Encrypted Citizen Profile (with explicit consent)
  const ramabaiProfile = await createEncryptedProfile({
    userId: ramabaiUser._id,
    consentGiven: true,
    consentAt: new Date('2026-10-01T09:30:00Z'),
    fullName: 'Ramabai Kulkarni',
    dob: '1958-04-12',
    age: 68,
    gender: 'Female',
    maritalStatus: 'Widow',
    address: 'Ward 4, Shaniwar Peth, Pune - 411030',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '411030',
    casteCategory: 'General',
    annualFamilyIncome: 24000,
    aadhaar: '712345674821',
    mobile: '9876543210',
    bankAccount: '309876549012',
    ifsc: 'SBIN0004821',
  });

  // 4. Seed Data Layer 2: Document Vault (VaultDoc)
  const vaultDocPayloads = [
    {
      type: 'aadhaar_card',
      status: 'VERIFIED',
      issuedAt: new Date('2019-06-15T00:00:00Z'),
      maxAgeDays: null,
      maskedSummary: maskAadhaar('712345674821'),
      metadata: {
        aadhaar_masked: maskAadhaar('712345674821'),
        holderName: 'Ramabai Kulkarni',
      },
    },
    {
      type: 'age_proof',
      status: 'VERIFIED',
      issuedAt: new Date('1975-05-01T00:00:00Z'),
      maxAgeDays: null,
      maskedSummary: 'DOB: 12-04-1958 (Age 68)',
      metadata: {
        dob: '1958-04-12',
        age_years: 68,
      },
    },
    {
      type: 'bank_passbook',
      status: 'VERIFIED',
      issuedAt: new Date('2022-01-10T00:00:00Z'),
      maxAgeDays: null,
      maskedSummary: `${maskBankAccount('309876549012')} (SBIN0004821)`,
      metadata: {
        bank_account_masked: maskBankAccount('309876549012'),
        ifsc: 'SBIN0004821',
      },
    },
    {
      type: 'death_certificate_husband',
      status: 'VERIFIED',
      issuedAt: new Date('2021-08-19T00:00:00Z'),
      maxAgeDays: null,
      maskedSummary: 'PMC-DC-2021-4412',
      metadata: {
        certificateNo: 'PMC-DC-2021-4412',
      },
    },
    {
      type: 'life_certificate',
      status: 'VERIFIED',
      issuedAt: new Date('2026-09-25T00:00:00Z'),
      maxAgeDays: 365,
      maskedSummary: 'JP-2026-9910',
      metadata: {
        life_certificate_id: 'JP-2026-9910',
      },
    },
  ];

  const seededVaultDocs = [];
  for (const item of vaultDocPayloads) {
    const vDoc = await saveDocument(VaultDoc, {
      userId: ramabaiUser._id,
      caseId: DEMO_CASE_ID,
      type: item.type,
      status: item.status,
      issuedAt: item.issuedAt,
      maxAgeDays: item.maxAgeDays,
      encryptedMetadata: encryptSensitiveValue(item.metadata),
      maskedSummary: item.maskedSummary,
      uploadedAt: new Date('2026-10-01T09:45:00Z'),
    });
    seededVaultDocs.push(vDoc);
  }

  // 5. Auto-fill draft fields for Pension service using Profile + VaultDocs + Citizen Answer
  const pensionCatalog = catalogs.find((c) => c.id === 'pension');
  const { draftFields } = autoFillDraftFields({
    catalog: pensionCatalog,
    profile: ramabaiProfile,
    vaultDocs: seededVaultDocs,
    citizenAnswers: { pension_subtype: 'old_age_pension' },
  });

  // 6. Seed Data Layer 3: Application/Case (CASE-DEMO-001) with Day-10 query & +21-day stall
  const demoCase = await saveDocument(Case, {
    caseId: DEMO_CASE_ID,
    userId: ramabaiUser._id,
    service: 'pension',
    status: 'STALLED',
    consent: {
      caseConsent: true,
      caseConsentAt: new Date('2026-10-01T09:30:00Z'),
      saveProfileConsent: true,
      saveProfileConsentAt: new Date('2026-10-01T09:31:00Z'),
    },
    approval: {
      given: true,
      at: new Date('2026-10-01T09:55:00Z'),
      byPhysicalButton: true,
    },
    draftFields,
    appId: DEMO_APP_ID,
    refNo: DEMO_REF_NO,
    queryDetails: {
      active: false,
      raisedOnDay: 10,
      message: 'Office ne ek sawal poocha: life certificate purana hai',
      documentKey: 'life_certificate',
      resolvedAt: new Date('2026-10-12T10:00:00Z'),
    },
    stallDetails: {
      stalled: true,
      daysElapsed: 21,
      stalledDays: 7,
      reason: '7 din se ruka hai',
    },
    nextCheckAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    history: [
      { step: 1, status: 'LANGUAGE_SELECTED', note: 'Selected Marathi (mr-IN)', actor: 'CITIZEN' },
      { step: 2, status: 'INTAKE', note: 'Meri pension band ho gayi', actor: 'CITIZEN' },
      { step: 3, status: 'CLARIFYING', note: 'Answered: Old Age Pension', actor: 'CITIZEN' },
      { step: 4, status: 'SERVICE_CONFIRMED', note: 'Confirmed pension restart service', actor: 'CITIZEN' },
      { step: 6, status: 'CONSENTED', note: 'Gate 1 Consent agreed', actor: 'CITIZEN' },
      { step: 7, status: 'PROFILE_SAVE_CONSENT', note: 'Agreed to save profile for next time', actor: 'CITIZEN' },
      { step: 9, status: 'DOCS_READY', note: 'All 5 pension documents verified', actor: 'AGENT' },
      { step: 10, status: 'FORM_FILLED', note: 'Draft form filled from Profile + Document Vault', actor: 'AGENT' },
      { step: 11, status: 'APPROVED', note: 'Gate 2 Physical approval button pressed', actor: 'CITIZEN' },
      { step: 12, status: 'SUBMITTED', note: `Application submitted (${DEMO_APP_ID})`, actor: 'AGENT' },
      { step: 13, status: 'TRACKING', note: 'Tracking started on pension portal', actor: 'AGENT' },
      { step: 14, status: 'QUERY_RAISED', note: 'Day 10: life certificate purana hai', actor: 'OFFICER' },
      { step: 15, status: 'STALLED', note: '+21 din: 7 din se ruka hai', actor: 'SYSTEM' },
    ],
    createdAt: new Date(),
  });

  // 7. Seed AuditLog with automatically masked payload
  const seedAudit = await saveDocument(AuditLog, {
    actor: 'SYSTEM',
    action: 'SEED_RAMABAI_DEMO_CASE',
    caseId: DEMO_CASE_ID,
    userId: String(ramabaiUser._id),
    timestamp: new Date(),
    maskedPayload: {
      citizenName: 'Ramabai Kulkarni',
      aadhaar: '712345674821',
      phone: '9876543210',
      bankAccount: '309876549012',
      appId: DEMO_APP_ID,
      refNo: DEMO_REF_NO,
    },
  });

  const collections = await listCreatedCollections();

  return {
    mode: connectionInfo.mode,
    collections,
    user: ramabaiUser,
    profile: ramabaiProfile,
    vaultDocs: seededVaultDocs,
    catalogs: seededCatalogs,
    demoCase,
    auditLog: seedAudit,
  };
}

