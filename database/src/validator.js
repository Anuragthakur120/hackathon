import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_DIR = path.resolve(__dirname, '../catalog');

export const ALLOWED_FIELD_SOURCES = Object.freeze([
  'PROFILE',
  'DOCUMENT',
  'ASK_CITIZEN',
  'DERIVED',
  'DEFAULT',
  'PORTAL_GENERATED',
]);

export const SUPPORTED_LANGUAGES = Object.freeze(['mr', 'hi', 'en']);

export const ALLOWED_SERVICE_IDS = Object.freeze([
  'pension',
  'scholarship',
  'ration_card',
]);

/**
 * Loads the JSON Schema definition from /database/catalog/schema.json.
 */
export function loadCatalogSchema() {
  const schemaPath = path.join(CATALOG_DIR, 'schema.json');
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function isLocalizedObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return SUPPORTED_LANGUAGES.every(
    (lang) => typeof obj[lang] === 'string' && obj[lang].trim().length > 0
  );
}

/**
 * Validates a service catalog JSON object against /database/catalog/schema.json rules.
 * Returns { valid: boolean, errors: string[] }.
 */
export function validateCatalog(catalog) {
  const schema = loadCatalogSchema();
  const errors = [];

  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    return { valid: false, errors: ['Catalog must be a non-null JSON object'] };
  }

  for (const reqKey of schema.required) {
    if (!(reqKey in catalog)) {
      errors.push(`Missing required top-level property: "${reqKey}"`);
    }
  }

  if (!ALLOWED_SERVICE_IDS.includes(catalog.id)) {
    errors.push(`Invalid catalog id "${catalog.id}". Expected one of: ${ALLOWED_SERVICE_IDS.join(', ')}`);
  }

  if (typeof catalog.code !== 'string' || catalog.code.trim().length < 3) {
    errors.push('Property "code" must be a string of length >= 3');
  }

  if (!isLocalizedObject(catalog.department)) {
    errors.push('Property "department" must contain non-empty mr, hi, and en strings');
  }
  if (!isLocalizedObject(catalog.name)) {
    errors.push('Property "name" must contain non-empty mr, hi, and en strings');
  }
  if (!isLocalizedObject(catalog.description)) {
    errors.push('Property "description" must contain non-empty mr, hi, and en strings');
  }

  // Validate fields[]
  const fieldKeys = new Set();
  if (!Array.isArray(catalog.fields) || catalog.fields.length < 5) {
    errors.push('Property "fields" must be an array with at least 5 fields');
  } else {
    catalog.fields.forEach((field, idx) => {
      if (!field.key || typeof field.key !== 'string') {
        errors.push(`fields[${idx}].key must be a non-empty string`);
      } else {
        fieldKeys.add(field.key);
      }
      if (!ALLOWED_FIELD_SOURCES.includes(field.source)) {
        errors.push(
          `fields[${idx}] (${field.key}): invalid source "${field.source}". Allowed: ${ALLOWED_FIELD_SOURCES.join(', ')}`
        );
      }
      if (!isLocalizedObject(field.label)) {
        errors.push(
          `fields[${idx}] (${field.key}): label must have non-empty mr, hi, and en strings`
        );
      }
      if (typeof field.sensitive !== 'boolean') {
        errors.push(`fields[${idx}] (${field.key}): "sensitive" must be a boolean`);
      }
      if (typeof field.required !== 'boolean') {
        errors.push(`fields[${idx}] (${field.key}): "required" must be a boolean`);
      }
    });
  }

  // Validate documents[]
  const documentKeys = new Set();
  if (!Array.isArray(catalog.documents) || catalog.documents.length < 2) {
    errors.push('Property "documents" must be an array with at least 2 documents');
  } else {
    catalog.documents.forEach((doc, idx) => {
      if (!doc.key || typeof doc.key !== 'string') {
        errors.push(`documents[${idx}].key must be a non-empty string`);
      } else {
        documentKeys.add(doc.key);
      }
      if (!isLocalizedObject(doc.label)) {
        errors.push(
          `documents[${idx}] (${doc.key}): label must have non-empty mr, hi, and en strings`
        );
      }
      if (typeof doc.mandatory !== 'boolean') {
        errors.push(`documents[${idx}] (${doc.key}): "mandatory" must be a boolean`);
      }
      if (doc.max_age_days !== undefined) {
        if (!Number.isInteger(doc.max_age_days) || doc.max_age_days < 1) {
          errors.push(
            `documents[${idx}] (${doc.key}): "max_age_days" must be a positive integer`
          );
        }
      }
      if (doc.required_if !== undefined) {
        if (
          !doc.required_if ||
          typeof doc.required_if.field !== 'string' ||
          !['equals', 'not_equals', 'less_than', 'greater_than', 'in'].includes(
            doc.required_if.operator
          ) ||
          doc.required_if.value === undefined
        ) {
          errors.push(
            `documents[${idx}] (${doc.key}): "required_if" must have valid { field, operator, value }`
          );
        }
      }
    });
  }

  // Validate 16 steps[]
  if (!Array.isArray(catalog.steps) || catalog.steps.length !== 16) {
    errors.push('Property "steps" must contain all 16 citizen journey steps');
  } else {
    catalog.steps.forEach((stepObj, idx) => {
      if (stepObj.step !== idx + 1) {
        errors.push(`steps[${idx}].step must be ${idx + 1}`);
      }
      if (!isLocalizedObject(stepObj.label)) {
        errors.push(`steps[${idx}].label must contain non-empty mr, hi, and en strings`);
      }
    });
  }

  // Validate portal block
  const portal = catalog.portal;
  if (!portal || typeof portal !== 'object') {
    errors.push('Missing or invalid "portal" block');
  } else {
    if (typeof portal.start_path !== 'string' || !portal.start_path.startsWith('/')) {
      errors.push('portal.start_path must be a valid path starting with "/"');
    }
    if (!Array.isArray(portal.pages) || portal.pages.length < 1) {
      errors.push('portal.pages must be a non-empty array');
    } else {
      portal.pages.forEach((page, pIdx) => {
        if (!page.page_id || !Array.isArray(page.fields) || page.fields.length < 1) {
          errors.push(`portal.pages[${pIdx}] must have page_id and non-empty fields[]`);
        } else {
          page.fields.forEach((pf, fIdx) => {
            if (!pf.key || !pf.selector || !ALLOWED_FIELD_SOURCES.includes(pf.source)) {
              errors.push(
                `portal.pages[${pIdx}].fields[${fIdx}] must have valid key, selector, and source`
              );
            }
            if (!fieldKeys.has(pf.key)) {
              errors.push(
                `portal.pages[${pIdx}].fields[${fIdx}].key "${pf.key}" does not exist in catalog.fields`
              );
            }
          });
        }
      });
    }
    if (!portal.uploads || typeof portal.uploads !== 'object' || Object.keys(portal.uploads).length < 1) {
      errors.push('portal.uploads must be a non-empty mapping of { selector: documentKey }');
    } else {
      for (const [selector, docKey] of Object.entries(portal.uploads)) {
        if (!selector.startsWith('#') && !selector.startsWith('.') && !selector.startsWith('[')) {
          errors.push(`portal.uploads selector "${selector}" must be a valid CSS selector`);
        }
        if (!documentKeys.has(docKey)) {
          errors.push(`portal.uploads target document "${docKey}" is not defined in catalog.documents`);
        }
      }
    }
    if (typeof portal.submit_selector !== 'string' || !portal.submit_selector) {
      errors.push('portal.submit_selector must be a non-empty string');
    }
    if (typeof portal.result_selector !== 'string' || !portal.result_selector) {
      errors.push('portal.result_selector must be a non-empty string');
    }
  }

  // Validate tracking block
  if (
    !catalog.tracking ||
    catalog.tracking.stall_after_days !== 7 ||
    typeof catalog.tracking.check_every_hours !== 'number'
  ) {
    errors.push('tracking block must define stall_after_days=7 and numeric check_every_hours');
  }

  // Validate office_call block
  const oc = catalog.office_call;
  if (!oc || typeof oc !== 'object') {
    errors.push('Missing "office_call" block');
  } else {
    if (typeof oc.department !== 'string' || !oc.department.trim()) {
      errors.push('office_call.department must be a non-empty string');
    }
    if (
      !Array.isArray(oc.may_say) ||
      !oc.may_say.includes('application_id') ||
      !oc.may_say.includes('name')
    ) {
      errors.push('office_call.may_say must include ["application_id", "name"]');
    }
    const requiredNeverSay = ['aadhaar', 'otp', 'password', 'account_number'];
    if (
      !Array.isArray(oc.never_say) ||
      !requiredNeverSay.every((item) => oc.never_say.includes(item))
    ) {
      errors.push(
        `office_call.never_say must include [${requiredNeverSay.join(', ')}]`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Loads and validates a single catalog JSON file by service id ('pension' | 'scholarship' | 'ration_card').
 */
export function loadCatalog(serviceId) {
  const filePath = path.join(CATALOG_DIR, `${serviceId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Catalog file not found for service "${serviceId}" at ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const result = validateCatalog(parsed);
  if (!result.valid) {
    throw new Error(
      `Invalid catalog "${serviceId}.json": ${result.errors.join('; ')}`
    );
  }
  return parsed;
}

/**
 * Loads and validates all 3 service catalogs from /database/catalog/*.json.
 */
export function loadAllCatalogs() {
  return ALLOWED_SERVICE_IDS.map((id) => loadCatalog(id));
}

