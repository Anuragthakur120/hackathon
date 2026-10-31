import mongoose from 'mongoose';
import {
  encryptSensitiveValue,
  decryptSensitiveValue,
  maskAadhaar,
  maskPhone,
  maskBankAccount,
  maskAuditPayload,
} from '../crypto.js';
import { ALLOWED_FIELD_SOURCES, ALLOWED_SERVICE_IDS } from '../validator.js';

export const CASE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days = 2,592,000 seconds

/**
 * The 16-step citizen journey statuses (+ operational states CALLED, DOCS_UPLOADED, CANCELLED).
 */
export const CASE_16_STEP_STATUSES = Object.freeze([
  'LANGUAGE_SELECTED', // Step 1
  'INTAKE',            // Step 2
  'CLARIFYING',        // Step 3
  'SERVICE_CONFIRMED', // Step 4
  'CONSENT_PENDING',   // Step 5 (Gate 1 prompt)
  'CONSENTED',         // Step 6 (Gate 1 agreed)
  'PROFILE_SAVE_CONSENT', // Step 7
  'DOCS_CHECKLIST',    // Step 8
  'DOCS_READY',        // Step 9
  'FORM_FILLED',       // Step 10 (DRAFT only)
  'APPROVED',          // Step 11 (Gate 2 physical approval)
  'SUBMITTED',         // Step 12 (Application ID PEN-2026-88213)
  'TRACKING',          // Step 13
  'QUERY_RAISED',      // Step 14 (Day 10 office query)
  'STALLED',           // Step 15 (+21 days / stalled 7 days)
  'CLOSED',            // Step 16 (Pension restarted)
]);

export const ALL_CASE_STATUSES = Object.freeze([
  ...CASE_16_STEP_STATUSES,
  'DOCS_UPLOADED',
  'CALLED',
  'CANCELLED',
]);

const POST_APPROVAL_STATUSES = new Set([
  'SUBMITTED',
  'TRACKING',
  'QUERY_RAISED',
  'STALLED',
  'CALLED',
  'CLOSED',
]);

const EncryptedPayloadSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    ciphertext: { type: String, required: true },
  },
  { _id: false }
);

// ============================================================================
// 1. User Schema
// ============================================================================
export const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    phoneMasked: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ['mr-IN', 'hi-IN', 'en-IN'],
      default: 'mr-IN',
      required: true,
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      default: 'citizen',
      required: true,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { collection: 'users' }
);

UserSchema.index({ phone: 1 }, { unique: true, name: 'user_phone_unique' });

UserSchema.pre('validate', function preValidateUser(next) {
  if (this.phone && !this.phoneMasked) {
    this.phoneMasked = maskPhone(this.phone);
  }
  next();
});

// ============================================================================
// 2. Data Layer 1: Profile Schema (saved ONLY with consent; sensitive encrypted)
// ============================================================================
export const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    consentGiven: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v) => v === true,
        message: 'Profile can only be saved when consentGiven is explicitly true',
      },
    },
    consentAt: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    dob: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['Female', 'Male', 'Other'], required: true },
    maritalStatus: { type: String },
    address: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, default: 'Maharashtra' },
    pincode: { type: String },
    casteCategory: { type: String, default: 'General' },
    annualFamilyIncome: { type: Number },
    ifsc: { type: String },

    // Sensitive fields stored encrypted at rest + last-4 masked display
    aadhaarEncrypted: { type: EncryptedPayloadSchema, required: true },
    aadhaarMasked: { type: String, required: true },
    mobileEncrypted: { type: EncryptedPayloadSchema, required: true },
    mobileMasked: { type: String, required: true },
    bankAccountEncrypted: { type: EncryptedPayloadSchema, required: true },
    bankAccountMasked: { type: String, required: true },

    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: 'profiles' }
);

ProfileSchema.index({ userId: 1 }, { unique: true, name: 'profile_user_unique' });

// ============================================================================
// 3. Data Layer 2: VaultDoc Schema (Document Vault: encrypted metadata, type, status)
// ============================================================================
export const VaultDocSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caseId: {
      type: String,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'UPLOADED',
        'VERIFIED',
        'REJECTED_BLURRY',
        'REJECTED_EXPIRED',
      ],
      default: 'VERIFIED',
      required: true,
    },
    issuedAt: {
      type: Date,
    },
    maxAgeDays: {
      type: Number,
      default: null,
    },
    encryptedMetadata: {
      type: EncryptedPayloadSchema,
      required: true,
    },
    maskedSummary: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  { collection: 'vaultdocs' }
);

VaultDocSchema.index(
  { userId: 1, type: 1 },
  { name: 'vaultdoc_user_type_idx' }
);
VaultDocSchema.index({ caseId: 1 }, { name: 'vaultdoc_case_idx' });

// ============================================================================
// 4. Data Layer 3: Case Schema (16-step statuses, history, approval, TTL 30 days)
// ============================================================================
const CaseHistoryItemSchema = new mongoose.Schema(
  {
    step: { type: Number },
    status: { type: String, enum: ALL_CASE_STATUSES, required: true },
    note: { type: String },
    actor: {
      type: String,
      enum: ['CITIZEN', 'AGENT', 'OFFICER', 'SYSTEM'],
      default: 'AGENT',
    },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const DraftFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed },
    maskedValue: { type: String },
    source: {
      type: String,
      enum: ALLOWED_FIELD_SOURCES,
      required: true,
    },
    sensitive: { type: Boolean, default: false },
  },
  { _id: false }
);

export const CaseSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: String,
      enum: ALLOWED_SERVICE_IDS,
      required: true,
    },
    status: {
      type: String,
      enum: ALL_CASE_STATUSES,
      default: 'INTAKE',
      required: true,
    },
    history: {
      type: [CaseHistoryItemSchema],
      default: [],
    },
    consent: {
      caseConsent: { type: Boolean, default: false },
      caseConsentAt: { type: Date, default: null },
      saveProfileConsent: { type: Boolean, default: false },
      saveProfileConsentAt: { type: Date, default: null },
    },
    approval: {
      given: { type: Boolean, default: false },
      at: { type: Date, default: null },
      byPhysicalButton: { type: Boolean, default: false },
    },
    draftFields: {
      type: [DraftFieldSchema],
      default: [],
    },
    appId: {
      type: String,
      default: null,
    },
    refNo: {
      type: String,
      default: null,
    },
    queryDetails: {
      active: { type: Boolean, default: false },
      raisedOnDay: { type: Number, default: null },
      message: { type: String, default: null },
      documentKey: { type: String, default: null },
      resolvedAt: { type: Date, default: null },
    },
    stallDetails: {
      stalled: { type: Boolean, default: false },
      daysElapsed: { type: Number, default: 0 },
      stalledDays: { type: Number, default: 0 },
      reason: { type: String, default: null },
    },
    nextCheckAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  { collection: 'cases' }
);

// 30-day TTL index on Case (auto-deletes 30 days after createdAt)
CaseSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: CASE_TTL_SECONDS, name: 'case_ttl_30_days' }
);
CaseSchema.index({ caseId: 1 }, { unique: true, name: 'case_id_unique' });
CaseSchema.index({ userId: 1, status: 1 }, { name: 'case_user_status_idx' });
CaseSchema.index({ service: 1, status: 1 }, { name: 'case_service_status_idx' });

CaseSchema.pre('validate', function preValidateCase(next) {
  if (POST_APPROVAL_STATUSES.has(this.status)) {
    if (!this.consent?.caseConsent) {
      return next(
        new Error(
          `Safety Gate 1 Violation: Case cannot transition to ${this.status} without consent.caseConsent === true`
        )
      );
    }
    if (!this.approval?.given) {
      return next(
        new Error(
          `Safety Gate 2 Violation: Case cannot transition to ${this.status} without approval.given === true`
        )
      );
    }
  }
  next();
});

// ============================================================================
// 5. AuditLog Schema (actor, action, caseId, timestamp, masked payload)
// ============================================================================
export const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: String,
      enum: ['CITIZEN', 'AGENT', 'OFFICER', 'SYSTEM'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    caseId: {
      type: String,
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
    maskedPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { collection: 'auditlogs' }
);

AuditLogSchema.index(
  { caseId: 1, timestamp: -1 },
  { name: 'audit_case_time_idx' }
);
AuditLogSchema.index(
  { userId: 1, timestamp: -1 },
  { name: 'audit_user_time_idx' }
);

AuditLogSchema.pre('validate', function preValidateAudit(next) {
  this.maskedPayload = maskAuditPayload(this.maskedPayload || {});
  next();
});

// ============================================================================
// 6. ServiceCatalog Schema
// ============================================================================
export const ServiceCatalogSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      enum: ALLOWED_SERVICE_IDS,
      required: true,
    },
    code: { type: String, required: true },
    department: { type: mongoose.Schema.Types.Mixed, required: true },
    name: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: mongoose.Schema.Types.Mixed, required: true },
    fields: { type: [mongoose.Schema.Types.Mixed], required: true },
    documents: { type: [mongoose.Schema.Types.Mixed], required: true },
    steps: { type: [mongoose.Schema.Types.Mixed], required: true },
    portal: { type: mongoose.Schema.Types.Mixed, required: true },
    tracking: { type: mongoose.Schema.Types.Mixed, required: true },
    office_call: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: 'servicecatalogs' }
);

ServiceCatalogSchema.index(
  { serviceId: 1 },
  { unique: true, name: 'service_catalog_id_unique' }
);

// ============================================================================
// Mongoose Models + Dual-Mode Store (Live MongoDB OR Mongoose-Validated Memory Store)
// ============================================================================
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Profile =
  mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
export const VaultDoc =
  mongoose.models.VaultDoc || mongoose.model('VaultDoc', VaultDocSchema);
export const Case = mongoose.models.Case || mongoose.model('Case', CaseSchema);
export const AuditLog =
  mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const ServiceCatalog =
  mongoose.models.ServiceCatalog ||
  mongoose.model('ServiceCatalog', ServiceCatalogSchema);

export const ALL_MODELS = Object.freeze({
  User,
  Profile,
  VaultDoc,
  Case,
  AuditLog,
  ServiceCatalog,
});

// In-memory backing store when running without a live mongod TCP socket
const memoryCollections = new Map();
const memoryIndexes = new Map();
let activeMode = 'memory'; // 'mongo' | 'memory'

function matchesFilter(doc, filter = {}) {
  for (const [key, expected] of Object.entries(filter)) {
    const actual = doc[key];
    if (expected && typeof expected === 'object' && !(expected instanceof mongoose.Types.ObjectId) && !(expected instanceof Date)) {
      if ('$in' in expected && Array.isArray(expected.$in)) {
        if (!expected.$in.map(String).includes(String(actual))) return false;
        continue;
      }
    }
    if (String(actual) !== String(expected)) {
      return false;
    }
  }
  return true;
}

function initMemoryCollectionForModel(Model) {
  const collName = Model.collection.name;
  if (!memoryCollections.has(collName)) {
    memoryCollections.set(collName, []);
  }
  const indexList = [
    { v: 2, key: { _id: 1 }, name: '_id_' },
    ...Model.schema.indexes().map(([keySpec, options]) => ({
      v: 2,
      key: keySpec,
      name:
        options.name ||
        Object.entries(keySpec)
          .map(([k, v]) => `${k}_${v}`)
          .join('_'),
      ...(options.unique ? { unique: true } : {}),
      ...(options.expireAfterSeconds !== undefined
        ? { expireAfterSeconds: options.expireAfterSeconds }
        : {}),
    })),
  ];
  memoryIndexes.set(collName, indexList);
}

/**
 * Connects to MongoDB if a reachable URI is provided, or initializes the
 * Mongoose-validated in-memory collection engine when uri === 'memory' or local TCP is unreachable.
 */
export async function connectDatabase(uri = process.env.MONGODB_URI) {
  for (const Model of Object.values(ALL_MODELS)) {
    initMemoryCollectionForModel(Model);
  }

  if (!uri || uri === 'memory' || uri.startsWith('memory://')) {
    activeMode = 'memory';
    return { mode: 'memory', collections: Array.from(memoryCollections.keys()) };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500,
    });
    activeMode = 'mongo';
    for (const Model of Object.values(ALL_MODELS)) {
      await Model.createIndexes();
    }
    return {
      mode: 'mongo',
      collections: Object.values(ALL_MODELS).map((m) => m.collection.name),
    };
  } catch {
    activeMode = 'memory';
    return { mode: 'memory', collections: Array.from(memoryCollections.keys()) };
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  activeMode = 'memory';
}

export function clearMemoryDatabase() {
  memoryCollections.clear();
  memoryIndexes.clear();
  for (const Model of Object.values(ALL_MODELS)) {
    initMemoryCollectionForModel(Model);
  }
}

export function getDatabaseMode() {
  return activeMode;
}

/**
 * Validates a document using the real Mongoose Model (running pre-validate hooks,
 * required checks, enum checks, and custom validators) and persists it in either
 * MongoDB or the Mongoose memory collection.
 */
export async function saveDocument(Model, payload) {
  initMemoryCollectionForModel(Model);
  const doc = new Model(payload);
  await doc.validate();

  if (activeMode === 'mongo' && mongoose.connection.readyState === 1) {
    const saved = await doc.save();
    return saved.toObject();
  }

  const collName = Model.collection.name;
  const rows = memoryCollections.get(collName);
  const plain = doc.toObject();

  // Enforce unique indexes in memory mode
  const indexes = memoryIndexes.get(collName) || [];
  for (const idx of indexes) {
    if (idx.unique) {
      const idxKeys = Object.keys(idx.key);
      const existingIdx = rows.findIndex((r) =>
        idxKeys.every((k) => String(r[k]) === String(plain[k]))
      );
      if (existingIdx !== -1) {
        plain._id = rows[existingIdx]._id;
        rows[existingIdx] = plain;
        return plain;
      }
    }
  }

  rows.push(plain);
  return plain;
}

export async function findDocuments(Model, filter = {}) {
  initMemoryCollectionForModel(Model);
  if (activeMode === 'mongo' && mongoose.connection.readyState === 1) {
    return Model.find(filter).lean();
  }
  const rows = memoryCollections.get(Model.collection.name) || [];
  return rows.filter((r) => matchesFilter(r, filter));
}

export async function findOneDocument(Model, filter = {}) {
  const docs = await findDocuments(Model, filter);
  return docs[0] || null;
}

export async function updateOneDocument(Model, filter, updatePatch) {
  initMemoryCollectionForModel(Model);
  if (activeMode === 'mongo' && mongoose.connection.readyState === 1) {
    const existing = await Model.findOne(filter);
    if (!existing) return null;
    Object.assign(existing, updatePatch);
    await existing.validate();
    const saved = await existing.save();
    return saved.toObject();
  }

  const rows = memoryCollections.get(Model.collection.name) || [];
  const idx = rows.findIndex((r) => matchesFilter(r, filter));
  if (idx === -1) return null;

  const merged = { ...rows[idx], ...updatePatch };
  const validatedDoc = new Model(merged);
  await validatedDoc.validate();
  const plain = validatedDoc.toObject();
  rows[idx] = plain;
  return plain;
}

export async function deleteDocuments(Model, filter = {}) {
  initMemoryCollectionForModel(Model);
  if (activeMode === 'mongo' && mongoose.connection.readyState === 1) {
    const res = await Model.deleteMany(filter);
    return res.deletedCount || 0;
  }
  const collName = Model.collection.name;
  const rows = memoryCollections.get(collName) || [];
  const kept = [];
  let deletedCount = 0;
  for (const r of rows) {
    if (matchesFilter(r, filter)) {
      deletedCount += 1;
    } else {
      kept.push(r);
    }
  }
  memoryCollections.set(collName, kept);
  return deletedCount;
}

export async function getCollectionIndexes(Model) {
  initMemoryCollectionForModel(Model);
  if (activeMode === 'mongo' && mongoose.connection.readyState === 1) {
    return Model.collection.indexes();
  }
  return memoryIndexes.get(Model.collection.name) || [];
}

export async function listCreatedCollections() {
  if (activeMode === 'mongo' && mongoose.connection.readyState === 1) {
    const cols = await mongoose.connection.db.listCollections().toArray();
    return cols.map((c) => c.name).sort();
  }
  for (const Model of Object.values(ALL_MODELS)) {
    initMemoryCollectionForModel(Model);
  }
  return Array.from(memoryCollections.keys()).sort();
}

/**
 * Helper to create a Profile with automatic encryption of Aadhaar, mobile, and bankAccount.
 */
export async function createEncryptedProfile({
  userId,
  consentGiven,
  consentAt = new Date(),
  fullName,
  dob,
  age,
  gender,
  maritalStatus,
  address,
  district,
  state = 'Maharashtra',
  pincode,
  casteCategory = 'General',
  annualFamilyIncome,
  aadhaar,
  mobile,
  bankAccount,
  ifsc,
}) {
  return saveDocument(Profile, {
    userId,
    consentGiven,
    consentAt,
    fullName,
    dob,
    age,
    gender,
    maritalStatus,
    address,
    district,
    state,
    pincode,
    casteCategory,
    annualFamilyIncome,
    ifsc,
    aadhaarEncrypted: encryptSensitiveValue(aadhaar),
    aadhaarMasked: maskAadhaar(aadhaar),
    mobileEncrypted: encryptSensitiveValue(mobile),
    mobileMasked: maskPhone(mobile),
    bankAccountEncrypted: encryptSensitiveValue(bankAccount),
    bankAccountMasked: maskBankAccount(bankAccount),
  });
}

/**
 * Decrypts the sensitive fields of a Profile document for authorized internal form-filling.
 */
export function decryptProfileSensitiveFields(profileDoc) {
  if (!profileDoc) return null;
  return {
    ...profileDoc,
    aadhaarDecrypted: decryptSensitiveValue(profileDoc.aadhaarEncrypted),
    mobileDecrypted: decryptSensitiveValue(profileDoc.mobileEncrypted),
    bankAccountDecrypted: decryptSensitiveValue(profileDoc.bankAccountEncrypted),
  };
}

