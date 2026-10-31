import { decryptSensitiveValue } from './crypto.js';

/**
 * Trust hierarchy for auto-filling service form fields:
 * Higher-trust sources are evaluated first so the citizen is only asked
 * for what is genuinely missing.
 */
export const AUTOFILL_SOURCE_PRIORITY = Object.freeze([
  'PROFILE',
  'DOCUMENT',
  'DERIVED',
  'DEFAULT',
  'ASK_CITIZEN',
  'PORTAL_GENERATED',
]);

/**
 * Evaluates a conditional document's `required_if` rule against current form values.
 * Example: { field: "caste_category", operator: "not_equals", value: "General" }
 */
export function isDocumentRequired(docDef, fieldValues = {}) {
  if (docDef.mandatory) {
    return true;
  }
  if (!docDef.required_if) {
    return false;
  }
  const { field, operator, value } = docDef.required_if;
  const actual = fieldValues[field];
  if (actual === undefined || actual === null) {
    return false;
  }

  switch (operator) {
    case 'equals':
      return actual === value;
    case 'not_equals':
      return actual !== value;
    case 'less_than':
      return Number(actual) < Number(value);
    case 'greater_than':
      return Number(actual) > Number(value);
    case 'in':
      return Array.isArray(value) && value.includes(actual);
    default:
      return false;
  }
}

/**
 * Checks whether a VaultDoc exceeds the catalog's `max_age_days` limit
 * (e.g., life_certificate or income_certificate older than 365 days).
 */
export function evaluateDocumentFreshness(
  docDef,
  vaultDoc,
  referenceDate = new Date()
) {
  if (!vaultDoc) {
    return { valid: false, reason: 'MISSING_DOCUMENT', ageDays: null };
  }
  if (vaultDoc.status === 'REJECTED_BLURRY') {
    return { valid: false, reason: 'REJECTED_BLURRY', ageDays: null };
  }
  if (vaultDoc.status === 'REJECTED_EXPIRED') {
    return { valid: false, reason: 'REJECTED_EXPIRED', ageDays: null };
  }

  const maxAgeDays = docDef?.max_age_days ?? vaultDoc.maxAgeDays ?? null;
  if (maxAgeDays && vaultDoc.issuedAt) {
    const issuedMs = new Date(vaultDoc.issuedAt).getTime();
    const refMs = new Date(referenceDate).getTime();
    const ageDays = Math.floor((refMs - issuedMs) / (1000 * 60 * 60 * 24));
    if (ageDays > maxAgeDays) {
      return {
        valid: false,
        reason: 'EXPIRED_MAX_AGE_DAYS',
        ageDays,
        maxAgeDays,
      };
    }
    return { valid: true, reason: 'FRESH', ageDays, maxAgeDays };
  }

  return { valid: true, reason: 'VERIFIED', ageDays: 0, maxAgeDays };
}

/**
 * Computes derived field values (e.g., age_years from dob, card_category from annual_family_income).
 */
function computeDerivedValue(fieldDef, resolvedMap, profile) {
  if (fieldDef.key === 'age_years') {
    if (profile?.age !== undefined && profile?.age !== null) {
      return profile.age;
    }
    const dobStr = resolvedMap.dob || profile?.dob;
    if (dobStr) {
      const birthYear = Number(String(dobStr).slice(0, 4));
      if (!Number.isNaN(birthYear) && birthYear > 1900) {
        return 2026 - birthYear;
      }
    }
  }
  if (fieldDef.key === 'card_category') {
    const income = Number(
      resolvedMap.annual_family_income ?? profile?.annualFamilyIncome ?? 0
    );
    if (income > 0 && income <= 15000) return 'AAY';
    if (income > 15000 && income <= 59000) return 'PHH';
    return 'NPHH';
  }
  return undefined;
}

/**
 * Auto-fills a service catalog's fields using the 3 data layers in strict trust order:
 *   1. PROFILE (saved citizen profile)
 *   2. DOCUMENT (verified VaultDoc metadata)
 *   3. DERIVED (computed from higher-trust fields)
 *   4. DEFAULT (catalog default_value)
 *   5. ASK_CITIZEN (citizen answers — only asked when still missing)
 *
 * Returns { draftFields, missingCitizenQuestions, resolvedMap }.
 */
export function autoFillDraftFields({
  catalog,
  profile = null,
  vaultDocs = [],
  citizenAnswers = {},
}) {
  const docMap = new Map();
  for (const doc of vaultDocs) {
    if (doc.status === 'VERIFIED') {
      const decrypted = decryptSensitiveValue(doc.encryptedMetadata) || {};
      docMap.set(doc.type, { ...doc, decrypted });
    }
  }

  const resolvedMap = {};
  const draftFields = [];
  const missingCitizenQuestions = [];

  // Pass 1: Resolve PROFILE and DOCUMENT fields first (highest trust)
  for (const fieldDef of catalog.fields) {
    if (fieldDef.source === 'PORTAL_GENERATED') {
      continue;
    }

    let value;
    let usedSource = fieldDef.source;

    // 1. Try PROFILE first if available
    const profileKey = fieldDef.profile_key || fieldDef.key;
    const camelProfileKey = profileKey.replace(/_([a-z])/g, (_, ch) =>
      ch.toUpperCase()
    );
    if (profile) {
      if (fieldDef.key === 'aadhaar_masked' && profile.aadhaarMasked) {
        value = profile.aadhaarMasked;
        usedSource = fieldDef.source === 'DOCUMENT' ? 'DOCUMENT' : 'PROFILE';
      } else if (fieldDef.key === 'mobile' && profile.mobileMasked) {
        value = profile.mobileMasked;
        usedSource = 'PROFILE';
      } else if (fieldDef.key === 'bank_account_masked' && profile.bankAccountMasked) {
        value = profile.bankAccountMasked;
        usedSource = fieldDef.source === 'DOCUMENT' ? 'DOCUMENT' : 'PROFILE';
      } else if (profile[profileKey] !== undefined && profile[profileKey] !== null) {
        value = profile[profileKey];
        usedSource = 'PROFILE';
      } else if (
        profile[camelProfileKey] !== undefined &&
        profile[camelProfileKey] !== null
      ) {
        value = profile[camelProfileKey];
        usedSource = 'PROFILE';
      }
    }

    // 2. Try DOCUMENT if field comes from a verified VaultDoc or wasn't in PROFILE
    if ((value === undefined || fieldDef.source === 'DOCUMENT') && fieldDef.document_key) {
      const vDoc = docMap.get(fieldDef.document_key);
      if (vDoc) {
        const dec = vDoc.decrypted || {};
        if (dec[fieldDef.key] !== undefined) {
          value = dec[fieldDef.key];
          usedSource = 'DOCUMENT';
        } else if (vDoc.maskedSummary && fieldDef.sensitive) {
          value = vDoc.maskedSummary;
          usedSource = 'DOCUMENT';
        }
      }
    }

    // 3. Try DERIVED
    if (value === undefined && fieldDef.source === 'DERIVED') {
      value = computeDerivedValue(fieldDef, resolvedMap, profile);
      usedSource = 'DERIVED';
    }

    // 4. Try DEFAULT
    if (value === undefined && fieldDef.source === 'DEFAULT' && fieldDef.default_value !== undefined) {
      value = fieldDef.default_value;
      usedSource = 'DEFAULT';
    }

    // 5. Try ASK_CITIZEN (citizen answers)
    if (value === undefined && citizenAnswers[fieldDef.key] !== undefined) {
      value = citizenAnswers[fieldDef.key];
      usedSource = 'ASK_CITIZEN';
    }

    if (value !== undefined && value !== null && value !== '') {
      resolvedMap[fieldDef.key] = value;
      draftFields.push({
        key: fieldDef.key,
        value,
        maskedValue: String(value),
        source: usedSource,
        sensitive: Boolean(fieldDef.sensitive),
      });
    } else if (fieldDef.required) {
      missingCitizenQuestions.push({
        key: fieldDef.key,
        label: fieldDef.label,
        source: 'ASK_CITIZEN',
      });
    }
  }

  return {
    draftFields,
    missingCitizenQuestions,
    resolvedMap,
  };
}

