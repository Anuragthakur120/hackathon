import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  Scheme,
  Notification,
  SupportTicket,
  Case,
  VaultDoc,
  User,
  Conversation,
  findDocuments,
  findOneDocument,
  saveDocument,
  updateOneDocument,
  deleteDocuments,
  encryptSensitiveValue,
  decryptSensitiveValue,
  SCHEMES_DATA,
} from '@nagarsathi/database';
import { requireCitizenAuth } from '../auth.js';
import { maskForLlm } from '../privacy.js';
import { defaultAgentAdapter } from '../agentAdapter.js';
import { ensurePlatformSeeded } from './platformRoutes.js';
import { toCitizenDto } from './coreRoutes.js';
import {
  detectIntent,
  extractFormField,
  getCopy,
  getSuggestions,
  humanizeDocKey,
  normalizeAssistantLanguage,
} from '../assistantEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../storage/uploads');

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const SUBMITTED_STATUSES = ['SUBMITTED', 'TRACKING', 'QUERY_RAISED', 'STALLED', 'CALLED', 'CLOSED'];
const TRACKING_STATUSES = ['TRACKING', 'QUERY_RAISED', 'STALLED', 'CALLED', 'CLOSED'];
const OPEN_DRAFT_STATUSES = ['INTAKE', 'SERVICE_CONFIRMED', 'CONSENTED', 'DOCS_READY', 'FORM_FILLED'];

const STATUS_LABELS = {
  'en-IN': {
    SUBMITTED: 'Submitted',
    TRACKING: 'Under department review',
    QUERY_RAISED: 'Query raised by the office',
    STALLED: 'Delayed',
    CALLED: 'Office contacted',
    CLOSED: 'Completed',
    FORM_FILLED: 'Draft saved',
    SERVICE_CONFIRMED: 'Draft started',
  },
  'hi-IN': {
    SUBMITTED: 'जमा किया गया',
    TRACKING: 'विभाग की समीक्षा में',
    QUERY_RAISED: 'कार्यालय ने प्रश्न उठाया',
    STALLED: 'विलंबित',
    CALLED: 'कार्यालय से संपर्क किया गया',
    CLOSED: 'पूर्ण',
    FORM_FILLED: 'ड्राफ्ट सहेजा गया',
    SERVICE_CONFIRMED: 'ड्राफ्ट शुरू हुआ',
  },
  'mr-IN': {
    SUBMITTED: 'सादर केले',
    TRACKING: 'विभागाच्या पुनरावलोकनात',
    QUERY_RAISED: 'कार्यालयाने प्रश्न उपस्थित केला',
    STALLED: 'विलंब',
    CALLED: 'कार्यालयाशी संपर्क केला',
    CLOSED: 'पूर्ण',
    FORM_FILLED: 'मसुदा जतन केला',
    SERVICE_CONFIRMED: 'मसुदा सुरू केला',
  },
};

function send(res, status, display, data = {}, speech) {
  return res.status(status).json({ display, speech: speech || display, data });
}

function fail(res, status, code, display, data = {}) {
  return res.status(status).json({ error: code, code, display, speech: display, data });
}

function langKey(lang) {
  return String(lang || 'en-IN').slice(0, 2);
}

function pickLocalized(obj, lang) {
  if (!obj || typeof obj !== 'object') return obj || '';
  return obj[langKey(lang)] || obj.en || '';
}

async function loadSchemes() {
  await ensurePlatformSeeded();
  const rows = await findDocuments(Scheme);
  return rows && rows.length ? rows : SCHEMES_DATA;
}

async function findScheme(id) {
  if (!id) return null;
  const schemes = await loadSchemes();
  return schemes.find((s) => s.schemeId === id || s.code === id) || null;
}

async function notify(userId, { title, message, type = 'STATUS_UPDATE', link = '/applications' }) {
  return saveDocument(Notification, {
    notificationId: `NOTIF-${crypto.randomUUID()}`,
    userId: String(userId),
    title,
    message,
    type,
    link,
    read: false,
    createdAt: new Date(),
  });
}

async function findOwnedCase(userId, id) {
  const byCase = await findOneDocument(Case, { caseId: id, userId });
  if (byCase) return byCase;
  return findOneDocument(Case, { appId: id, userId });
}

async function nextTrackingId() {
  const year = new Date().getFullYear();
  const prefix = `NGS-${year}-`;
  const all = (await findDocuments(Case)) || [];
  let max = 0;
  for (const c of all) {
    if (typeof c.appId === 'string' && c.appId.startsWith(prefix)) {
      max = Math.max(max, Number(c.appId.slice(prefix.length)) || 0);
    }
  }
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

function applicationDto(c, scheme) {
  const lang = 'en-IN';
  const submitted = SUBMITTED_STATUSES.includes(c.status);
  const history = Array.isArray(c.history) ? c.history : [];
  const last = history.length ? history[history.length - 1].at : c.createdAt;
  return {
    id: c.caseId,
    caseId: c.caseId,
    applicationId: c.appId || null,
    trackingId: c.appId || null,
    schemeId: c.schemeId || c.service,
    service: c.service,
    schemeName: c.schemeName || pickLocalized(scheme?.name, lang) || humanizeDocKey(c.service),
    department: pickLocalized(scheme?.department, lang) || '',
    status: c.status,
    isDraft: !submitted,
    submissionDate: c.submittedAt || null,
    createdAt: c.createdAt,
    lastUpdatedDate: last,
    referenceNumber: c.refNo || null,
    stalled: Boolean(c.stallDetails?.stalled),
    queryActive: Boolean(c.queryDetails?.active),
    formData: c.formData || {},
  };
}

function buildTimeline(c) {
  const history = Array.isArray(c.history) ? c.history : [];
  const at = (statuses) => {
    const hit = [...history].reverse().find((h) => statuses.includes(h.status));
    return hit ? hit.at : null;
  };
  const status = c.status;
  const stages = [
    {
      stage: 'STARTED',
      title: 'Application started',
      description: 'Draft created and saved to your account',
      reached: true,
      timestamp: c.createdAt,
    },
    {
      stage: 'CONSENTED',
      title: 'Consent given',
      description: 'You allowed NagarSathi to process this application',
      reached: Boolean(c.consent?.caseConsent),
      timestamp: c.consent?.caseConsentAt || at(['CONSENTED']),
    },
    {
      stage: 'APPROVED',
      title: 'Citizen approval',
      description: 'You reviewed the draft and confirmed submission',
      reached: Boolean(c.approval?.given),
      timestamp: c.approval?.at || at(['APPROVED']),
    },
    {
      stage: 'SUBMITTED',
      title: 'Submitted',
      description: c.appId ? `Tracking ID: ${c.appId}` : 'Submitted to the department',
      reached: SUBMITTED_STATUSES.includes(status),
      timestamp: c.submittedAt || at(['SUBMITTED']),
    },
    {
      stage: 'TRACKING',
      title: 'Under department review',
      description: 'The department is processing your application',
      reached: TRACKING_STATUSES.includes(status),
      timestamp: at(['TRACKING']),
    },
  ];
  if (c.queryDetails?.active || at(['QUERY_RAISED'])) {
    stages.push({
      stage: 'QUERY_RAISED',
      title: 'Office query raised',
      description: c.queryDetails?.message || 'The office needs more information',
      reached: true,
      timestamp: at(['QUERY_RAISED']),
      attention: Boolean(c.queryDetails?.active),
    });
  }
  if (c.stallDetails?.stalled || at(['STALLED'])) {
    stages.push({
      stage: 'STALLED',
      title: 'Delay detected',
      description: c.stallDetails?.reason || 'Processing is taking longer than expected',
      reached: true,
      timestamp: at(['STALLED']),
      attention: Boolean(c.stallDetails?.stalled),
    });
  }
  stages.push({
    stage: 'CLOSED',
    title: 'Completed',
    description: 'Application processing finished',
    reached: status === 'CLOSED',
    timestamp: at(['CLOSED']),
  });

  let currentAssigned = false;
  return stages.map((s) => {
    let state = 'PENDING';
    if (s.attention) state = 'ACTION_REQUIRED';
    else if (s.reached) state = 'COMPLETED';
    return { ...s, status: state };
  }).map((s, idx, arr) => {
    if (!currentAssigned && s.status === 'PENDING') {
      currentAssigned = true;
      return { ...s, status: 'CURRENT' };
    }
    if (idx === arr.length - 1 && !currentAssigned && s.status === 'COMPLETED') return s;
    return s;
  });
}

function nextActionFor(c) {
  if (!SUBMITTED_STATUSES.includes(c.status)) {
    if (!c.consent?.caseConsent) return 'Review and give consent to continue your application';
    return 'Complete the form, verify your documents, and confirm submission';
  }
  if (c.queryDetails?.active) return c.queryDetails?.message || 'Respond to the office query';
  if (c.stallDetails?.stalled) return 'Your application is delayed. Ask the assistant to contact the office';
  if (c.status === 'CLOSED') return 'No action needed. Your application is complete';
  return 'No action needed. We will notify you when the status changes';
}

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

function docDto(d) {
  return {
    id: String(d._id),
    type: d.type,
    category: d.category,
    status: d.status,
    fileName: d.fileName,
    fileSize: d.fileSize,
    mimeType: d.mimeType,
    maskedSummary: d.maskedSummary,
    uploadedAt: d.uploadedAt,
    verification: d.verification
      ? {
          method: d.verification.method,
          checkedAt: d.verification.checkedAt,
          reason: d.verification.reason,
          reviewRequired: Boolean(d.verification.reviewRequired),
          checks: d.verification.checks || [],
        }
      : null,
  };
}

function decodeUpload(body) {
  const fileName = String(body?.fileName || body?.name || '').trim();
  if (!fileName || fileName.length > 120 || /[\\/]/.test(fileName)) {
    return { error: 'INVALID_FILE_NAME', display: 'A valid file name is required.' };
  }
  let mimeType = body?.mimeType;
  if (!mimeType) {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else mimeType = 'application/pdf';
  }
  if (!ALLOWED_MIME.includes(mimeType)) {
    return { error: 'UNSUPPORTED_FILE_TYPE', display: 'Only PDF, JPG and PNG files are allowed.' };
  }
  const content = body?.contentBase64 || body?.fileContentBase64 || body?.content;
  const raw = String(content || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(raw, 'base64');
  if (!buffer.length) {
    return { error: 'EMPTY_FILE', display: 'The uploaded file is empty.' };
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { error: 'FILE_TOO_LARGE', display: 'File is larger than 5 MB.' };
  }
  return { name: fileName, mimeType, buffer };
}

function storeEncryptedFile(userId, buffer) {
  const dir = path.join(UPLOAD_DIR, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  const key = `${crypto.randomUUID()}.enc.json`;
  const payload = encryptSensitiveValue(buffer.toString('base64'));
  fs.writeFileSync(path.join(dir, key), JSON.stringify(payload), { mode: 0o600 });
  return key;
}

function readEncryptedFile(userId, storageKey) {
  if (!storageKey || /[\\/]/.test(storageKey)) return null;
  const file = path.join(UPLOAD_DIR, String(userId), storageKey);
  if (!fs.existsSync(file)) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    const b64 = decryptSensitiveValue(payload);
    return b64 ? Buffer.from(b64, 'base64') : null;
  } catch {
    return null;
  }
}

function removeEncryptedFile(userId, storageKey) {
  if (!storageKey || /[\\/]/.test(storageKey)) return;
  const file = path.join(UPLOAD_DIR, String(userId), storageKey);
  try {
    fs.rmSync(file, { force: true });
  } catch {
    // File already gone; nothing to clean up.
  }
}

function magicMatches(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const head = buffer.subarray(0, 5).toString('latin1');
    return head.startsWith('%PDF') || head.startsWith('PDF_');
  }
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return false;
}

/**
 * Runs the configured verification checks for one document.
 * OCR / AI content analysis is not configured in this deployment, so only structural checks
 * run. A passing result is "automated checks passed", never an official authentication.
 */
async function verifyDocument(doc, userId) {
  const checks = [];
  const buffer = readEncryptedFile(userId, doc.storageKey);

  checks.push({
    id: 'file_readable',
    label: 'Stored file can be read',
    passed: Boolean(buffer && buffer.length),
  });
  if (!buffer) {
    return {
      status: 'REUPLOAD_REQUIRED',
      reason: 'The stored file could not be read. Please upload it again.',
      checks,
      reviewRequired: false,
    };
  }

  const typeOk = magicMatches(buffer, doc.mimeType);
  checks.push({ id: 'file_signature', label: 'File content matches its type', passed: typeOk });

  const sizeOk = buffer.length >= 1024;
  checks.push({ id: 'file_size', label: 'File is not suspiciously small', passed: sizeOk });

  let resolutionOk = true;
  if (doc.mimeType === 'image/png' && typeOk && buffer.length >= 24) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    resolutionOk = width >= 200 && height >= 200;
    checks.push({
      id: 'image_resolution',
      label: 'Image resolution is readable (at least 200x200)',
      passed: resolutionOk,
      detail: `${width}x${height}`,
    });
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const siblings = (await findDocuments(VaultDoc, { userId })) || [];
  const duplicate = siblings.find(
    (s) => String(s._id) !== String(doc._id) && s.contentHash === hash && s.type !== doc.type
  );
  checks.push({
    id: 'not_reused_for_other_type',
    label: 'Same file is not used for a different document type',
    passed: !duplicate,
  });

  if (!typeOk) {
    return { status: 'REJECTED', reason: 'The file content does not match its declared type.', checks, reviewRequired: false };
  }
  if (duplicate) {
    return { status: 'REJECTED', reason: `This file was already uploaded as "${humanizeDocKey(duplicate.type)}".`, checks, reviewRequired: false };
  }
  if (!sizeOk || !resolutionOk) {
    return { status: 'REUPLOAD_REQUIRED', reason: 'The file looks empty or too low quality to read. Please upload a clearer copy.', checks, reviewRequired: false };
  }

  const humanReview = (process.env.DOC_REVIEW_MODE || 'auto') === 'human';
  if (humanReview) {
    return {
      status: 'UNDER_REVIEW',
      reason: 'Automated checks passed. An official reviewer must confirm this document.',
      checks,
      reviewRequired: true,
    };
  }
  return {
    status: 'VERIFIED',
    reason: 'Automated format and readability checks passed. This is not an official authentication by the issuing authority.',
    checks,
    reviewRequired: false,
  };
}

async function runVerification(userId, doc) {
  const result = await verifyDocument(doc, userId);
  const updated = await updateOneDocument(
    VaultDoc,
    { _id: doc._id, userId },
    {
      status: result.status,
      verification: {
        method: 'AUTOMATED_STRUCTURAL_CHECKS',
        checkedAt: new Date(),
        checks: result.checks,
        reason: result.reason,
        reviewRequired: result.reviewRequired,
      },
    }
  );
  const label = humanizeDocKey(doc.type);
  await notify(userId, {
    title: `Document ${result.status === 'VERIFIED' ? 'verified' : result.status === 'UNDER_REVIEW' ? 'under review' : 'needs attention'}: ${label}`,
    message: result.reason,
    type: 'DOCUMENT_ALERT',
    link: '/documents',
  });
  return updated || doc;
}

// ---------------------------------------------------------------------------
// Assistant orchestration
// ---------------------------------------------------------------------------

const AGENT_NAMES = {
  intake: 'Intake Agent',
  documents: 'Documents Agent',
  portal: 'Portal Agent',
  tracker: 'Tracker Agent',
  caller: 'Caller Agent',
  letter: 'Letter Agent',
};

const GREETING_WORDS = ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'नमस्ते', 'नमस्कार'];

async function buildAssistantReply({ user, language, text, context, agentAdapter }) {
  const copy = getCopy(language);
  const lang = language;
  const lower = String(text).toLowerCase().trim();
  const { intent, serviceId } = detectIntent(text);
  const scheme = await findScheme(serviceId || context?.schemeId || null);
  const schemeName = scheme ? pickLocalized(scheme.name, lang) : '';
  const effectiveServiceId = scheme?.schemeId || serviceId || null;

  const getContextualActions = () => {
    if (effectiveServiceId === 'income_certificate' || /income|उत्पन्न|दाखला|आय/i.test(lower)) {
      return [
        { label: 'Apply for Income Certificate', query: 'How to apply for Tahsildar Income Certificate?' },
        { label: 'Required Documents for Income Certificate', query: 'What documents are required for Income Certificate?' },
        { label: 'Income Certificate Eligibility', query: 'Who is eligible for Tahsildar Income Certificate?' },
        { label: 'Check Income Certificate Status', query: 'What is the status of my income certificate application?' },
      ];
    }
    if (effectiveServiceId === 'scholarship' || /scholar|शिष्यवृत्ती|छात्रवृत्ति/i.test(lower)) {
      return [
        { label: 'Apply for MahaDBT Scholarship', query: 'Tell me how to apply for MahaDBT Scholarship' },
        { label: 'Scholarship Eligibility Criteria', query: 'What is the eligibility for scholarship?' },
        { label: 'Required Documents for Scholarship', query: 'What documents are needed for scholarship?' },
        { label: 'Check Scholarship Status', query: 'What is the status of my scholarship application?' },
      ];
    }
    if (effectiveServiceId === 'pension' || /pension|पेन्शन|पेंशन/i.test(lower)) {
      return [
        { label: 'Apply for Old Age Pension', query: 'How to apply for Old Age Pension Scheme?' },
        { label: 'Pension Eligibility & Age Limit', query: 'What is the eligibility for old age pension?' },
        { label: 'Required Documents for Pension', query: 'What documents are required for pension?' },
        { label: 'Digital Life Certificate (Jeevan Pramaan)', query: 'How to submit Jeevan Pramaan digital life certificate?' },
      ];
    }
    if (effectiveServiceId === 'ration_card' || /ration|राशन|रेशन/i.test(lower)) {
      return [
        { label: 'Ration Card Member Addition', query: 'How to add family member to ration card?' },
        { label: 'Required Documents for Ration Card', query: 'What documents are needed for ration card?' },
        { label: 'Check Ration Card Status', query: 'What is the status of my ration card application?' },
      ];
    }
    if (intent === 'status') {
      return [
        { label: 'Check Status', query: 'What is the status of my application?' },
        { label: 'Officer Verification Timeline (7-14 Days)', query: 'How long does physical verification take?' },
        { label: 'Escalation Reference', query: 'Tell me about escalation reference' },
      ];
    }
    return [
      { label: 'Check Status', query: 'What is the status of my application?' },
      { label: 'Apply Now', query: 'How do I apply?' },
      { label: 'Required Documents', query: 'What documents are required?' },
    ];
  };

  const base = { intent, serviceId: effectiveServiceId, suggestions: getSuggestions(lang) };
  const reply = (agent, display, extra = {}) => ({
    display,
    speech: display,
    data: {
      ...base,
      agent: { id: agent, name: AGENT_NAMES[agent] },
      action: { type: 'none' },
      status: 'ok',
      reply: display,
      message: display,
      suggestedActions: getContextualActions(),
      ...extra,
    },
  });

  if (GREETING_WORDS.includes(lower)) {
    return reply('intake', copy.greeting(user?.name || ''), { nextStep: { label: copy.nextStep.browse, to: '/schemes' } });
  }

  if (intent === 'status') {
    const cases = (await findDocuments(Case, { userId: user.id })) || [];
    const wanted = scheme ? cases.filter((c) => (c.schemeId || c.service) === scheme.schemeId) : cases;
    if (!wanted.length) {
      return reply('tracker', copy.noApplications, { nextStep: { label: copy.nextStep.browse, to: '/schemes' } });
    }
    const labels = STATUS_LABELS[lang] || STATUS_LABELS['en-IN'];
    const lines = wanted.slice(0, 3).map((c) => {
      const name = c.schemeName || humanizeDocKey(c.service);
      if (SUBMITTED_STATUSES.includes(c.status)) {
        return copy.statusLine(name, c.appId || c.caseId, labels[c.status] || c.status);
      }
      return copy.draftLine(name);
    });
    return reply('tracker', lines.join(' '), {
      applications: wanted.slice(0, 3).map((c) => ({ id: c.caseId, trackingId: c.appId || null, status: c.status })),
      nextStep: { label: copy.nextStep.track, to: '/applications' },
    });
  }

  if (!scheme && ['fill', 'documents', 'eligibility', 'apply', 'service_info'].includes(intent)) {
    return reply('intake', copy.unknown, { status: 'needs_service', nextStep: { label: copy.nextStep.browse, to: '/schemes' } });
  }

  if (intent === 'documents') {
    const docs = (scheme.requiredDocuments || []).map(humanizeDocKey);
    const owned = (await findDocuments(VaultDoc, { userId: user.id })) || [];
    const verified = new Set(owned.filter((d) => d.status === 'VERIFIED').map((d) => d.type));
    const missing = (scheme.requiredDocuments || []).filter((k) => !verified.has(k)).map(humanizeDocKey);
    const tail = missing.length ? ` (${missing.length}/${docs.length}: ${missing.join(', ')})` : '';
    return reply('documents', `${copy.docsList(schemeName, docs.join(', '))}${tail}`, {
      requiredDocuments: scheme.requiredDocuments,
      missingDocuments: scheme.requiredDocuments.filter((k) => !verified.has(k)),
      nextStep: { label: copy.nextStep.documents, to: '/documents' },
    });
  }

  if (intent === 'eligibility') {
    const criteria = pickLocalized(scheme.eligibilityCriteria?.criteriaText, lang);
    return reply('intake', `${copy.eligibility(schemeName, criteria)} ${copy.eligibilityNote}`, {
      nextStep: { label: copy.nextStep.apply, to: `/apply/${scheme.schemeId}` },
    });
  }

  if (intent === 'fill') {
    return reply('portal', copy.fillStart(schemeName), {
      action: { type: 'start_form', to: `/apply/${scheme.schemeId}?voice=1`, schemeId: scheme.schemeId },
      nextStep: { label: copy.nextStep.apply, to: `/apply/${scheme.schemeId}?voice=1` },
    });
  }

  if (intent === 'apply') {
    const steps = (scheme.applicationProcess || []).join(' ');
    return reply('portal', `${copy.applySteps(schemeName, steps)} ${copy.applyCta}`, {
      action: { type: 'offer_apply', to: `/apply/${scheme.schemeId}`, schemeId: scheme.schemeId },
      nextStep: { label: copy.nextStep.apply, to: `/apply/${scheme.schemeId}` },
    });
  }

  if (intent === 'service_info') {
    return reply('intake', copy.schemeIntro(schemeName, pickLocalized(scheme.benefits, lang)), {
      nextStep: { label: copy.nextStep.apply, to: `/apply/${scheme.schemeId}` },
    });
  }

  // Unknown intent: ask the existing Intake agent only when a real model is configured, because the
  // offline fixture classifier would otherwise label every sentence as pension.
  const attempts = Number(context?.unknownAttempts || 1);
  if (process.env.ANTHROPIC_API_KEY && process.env.MOCK_AI !== 'true') {
    try {
      const out = await agentAdapter.intake({
        language: lang,
        action: 'classify',
        transcript: maskForLlm(text),
        unknownAttempts: attempts,
      });
      const catalogId = out?.data?.service?.catalogId;
      const classified = await findScheme(catalogId);
      if (classified) {
        const name = pickLocalized(classified.name, lang);
        return reply('intake', copy.schemeIntro(name, pickLocalized(classified.benefits, lang)), {
          serviceId: classified.schemeId,
          nextStep: { label: copy.nextStep.apply, to: `/apply/${classified.schemeId}` },
        });
      }
    } catch (err) {
      return reply('intake', copy.unknown, { status: 'agent_unavailable', agentError: err.code || 'AGENT_ERROR' });
    }
  }
  if (attempts >= 2) {
    return reply('intake', copy.madad, { status: 'madad_kendra', nextStep: { label: copy.nextStep.madad, to: '/support' } });
  }
  return reply('intake', copy.unknown, { status: 'needs_service', unknownAttempts: attempts + 1 });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function createCitizenRouter({ agentAdapter = defaultAgentAdapter } = {}) {
  const router = express.Router();
  const protectedPaths = [
    '/dashboard',
    '/applications',
    '/documents',
    '/notifications',
    '/support',
    '/me',
  ];
  for (const p of protectedPaths) {
    router.use(p, requireCitizenAuth);
  }

  // ---- Dashboard ---------------------------------------------------------
  router.get('/dashboard/stats', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const user = await findOneDocument(User, { _id: userId });
      if (!user) return fail(res, 401, 'USER_NOT_FOUND', 'Please log in again.');

      const cases = (await findDocuments(Case, { userId })) || [];
      const notifs = (await findDocuments(Notification, { userId })) || [];
      const docs = (await findDocuments(VaultDoc, { userId })) || [];
      const tickets = (await findDocuments(SupportTicket, { userId })) || [];
      const schemes = await loadSchemes();

      const submitted = cases.filter((c) => SUBMITTED_STATUSES.includes(c.status));
      const sortByRecent = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
      const activity = [];
      for (const c of cases) {
        for (const h of c.history || []) {
          activity.push({
            caseId: c.caseId,
            title: h.note || `Status: ${h.status}`,
            status: h.status,
            at: h.at,
          });
        }
      }
      activity.sort((a, b) => new Date(b.at) - new Date(a.at));

      const filledProfile = [user.name, user.email, user.address, user.state, user.district].filter(Boolean).length;
      const featured = schemes.filter((s) => s.isActive !== false).slice(0, 4);

      return send(res, 200, 'Dashboard statistics', {
        stats: {
          totalApplications: submitted.length,
          approved: submitted.filter((c) => c.status === 'CLOSED').length,
          approvedApplications: submitted.filter((c) => c.status === 'CLOSED').length,
          pending: submitted.filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED').length,
          pendingApplications: submitted.filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED').length,
          rejected: 0,
          rejectedApplications: 0,
          draftApplications: cases.length - submitted.length,
          drafts: cases.length - submitted.length,
          documentsCount: docs.length,
          documentsUploaded: docs.length,
          supportTickets: tickets.length,
          unreadNotifications: notifs.filter((n) => !n.read).length,
          eligibleSchemesCount: schemes.length,
          profileCompletion: Math.round((filledProfile / 5) * 100),
        },
        citizen: toCitizenDto(user),
        recentApplications: [...cases].sort(sortByRecent).slice(0, 5).map((c) => applicationDto(c, null)),
        recentNotifications: [...notifs].sort(sortByRecent).slice(0, 5),
        recentActivity: activity.slice(0, 8),
        featuredSchemes: featured,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/dashboard/eligible-schemes', async (req, res, next) => {
    try {
      const user = await findOneDocument(User, { _id: req.user.id });
      const schemes = (await loadSchemes()).filter((s) => s.isActive !== false);
      const state = String(user?.state || '').toLowerCase();
      const matched = state
        ? schemes.filter((s) => {
            const st = String(s.eligibilityCriteria?.state || '').toLowerCase();
            return !st || st.includes('all india') || st.includes(state);
          })
        : schemes;
      return send(res, 200, 'Schemes you may be eligible for', {
        basis: state ? 'profile_state' : 'all_active_schemes',
        schemes: matched.slice(0, 6),
      });
    } catch (err) {
      return next(err);
    }
  });

  // ---- Profile -----------------------------------------------------------
  router.get('/me/profile', async (req, res, next) => {
    try {
      const user = await findOneDocument(User, { _id: req.user.id });
      if (!user) return fail(res, 401, 'USER_NOT_FOUND', 'Please log in again.');
      return send(res, 200, 'Profile', { profile: toCitizenDto(user) });
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/me/profile', async (req, res, next) => {
    try {
      const allowed = ['name', 'email', 'address', 'state', 'district', 'language'];
      const patch = {};
      for (const key of allowed) {
        if (req.body?.[key] === undefined) continue;
        const value = String(req.body[key]).trim();
        if (value.length > 200) return fail(res, 400, 'VALUE_TOO_LONG', `${key} is too long.`);
        patch[key] = value;
      }
      if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) {
        return fail(res, 400, 'INVALID_EMAIL', 'Please enter a valid email address.');
      }
      if (patch.language && !['mr-IN', 'hi-IN', 'en-IN', 'gu-IN', 'bn-IN', 'ta-IN', 'te-IN'].includes(patch.language)) {
        return fail(res, 400, 'INVALID_LANGUAGE', 'Unsupported language.');
      }
      const current = await findOneDocument(User, { _id: req.user.id });
      if (!current) return fail(res, 401, 'USER_NOT_FOUND', 'Please log in again.');
      const merged = { ...current, ...patch };
      patch.profileCompleted = Math.round(
        ([merged.name, merged.email, merged.address, merged.state, merged.district].filter(Boolean).length / 5) * 100
      );
      const updated = await updateOneDocument(User, { _id: req.user.id }, patch);
      return send(res, 200, 'Profile updated', { profile: toCitizenDto(updated) });
    } catch (err) {
      return next(err);
    }
  });

  // ---- Applications ------------------------------------------------------
  router.get('/applications', async (req, res, next) => {
    try {
      const cases = (await findDocuments(Case, { userId: req.user.id })) || [];
      const schemes = await loadSchemes();
      const applications = cases
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((c) => applicationDto(c, schemes.find((s) => s.schemeId === (c.schemeId || c.service))));
      return send(res, 200, `${applications.length} applications`, { total: applications.length, applications });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/applications', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const scheme = await findScheme(String(req.body?.schemeId || ''));
      if (!scheme) return fail(res, 404, 'SCHEME_NOT_FOUND', 'Scheme not found.');

      const existing = (await findDocuments(Case, { userId })) || [];
      const open = existing.find(
        (c) => (c.schemeId || c.service) === scheme.schemeId && OPEN_DRAFT_STATUSES.includes(c.status)
      );
      if (open) {
        return send(res, 200, 'Existing draft resumed', { application: applicationDto(open, scheme), resumed: true });
      }

      const caseDoc = await saveDocument(Case, {
        caseId: `CASE-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        userId,
        service: scheme.schemeId,
        schemeId: scheme.schemeId,
        schemeName: pickLocalized(scheme.name, 'en-IN'),
        status: 'SERVICE_CONFIRMED',
        formData: {},
        history: [
          { step: 4, status: 'SERVICE_CONFIRMED', note: 'Application draft started', actor: 'CITIZEN', at: new Date() },
        ],
        createdAt: new Date(),
      });
      req.auditMeta = { actor: 'CITIZEN', action: 'APPLICATION_DRAFT_CREATED', caseId: caseDoc.caseId, userId };
      return send(res, 201, 'Draft created', { application: applicationDto(caseDoc, scheme), resumed: false });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/applications/:id', async (req, res, next) => {
    try {
      const c = await findOwnedCase(req.user.id, req.params.id);
      if (!c) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found.');
      const scheme = await findScheme(c.schemeId || c.service);
      return send(res, 200, 'Application', { application: applicationDto(c, scheme) });
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/applications/:id', async (req, res, next) => {
    try {
      const c = await findOwnedCase(req.user.id, req.params.id);
      if (!c) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found.');
      if (SUBMITTED_STATUSES.includes(c.status)) {
        return fail(res, 409, 'ALREADY_SUBMITTED', 'A submitted application cannot be edited.');
      }
      const incoming = req.body?.formData;
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
        return fail(res, 400, 'INVALID_FORM_DATA', 'formData must be an object.');
      }
      const clean = {};
      for (const [k, v] of Object.entries(incoming)) {
        if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) continue;
        if (typeof v === 'object' && v !== null) continue;
        const text = String(v ?? '').trim();
        if (text.length > 300) return fail(res, 400, 'VALUE_TOO_LONG', `${k} is too long.`);
        clean[k] = text;
      }
      const patch = {
        formData: { ...(c.formData || {}), ...clean },
        status: 'FORM_FILLED',
        history: [
          ...(c.history || []),
          { step: 10, status: 'FORM_FILLED', note: 'Draft saved', actor: 'CITIZEN', at: new Date() },
        ].slice(-50),
      };
      const updated = await updateOneDocument(Case, { caseId: c.caseId, userId: req.user.id }, patch);
      return send(res, 200, 'Draft saved', { application: applicationDto(updated, null) });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/applications/:id/submit', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const c = await findOwnedCase(userId, req.params.id);
      if (!c) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found.');
      if (SUBMITTED_STATUSES.includes(c.status)) {
        return fail(res, 409, 'ALREADY_SUBMITTED', 'This application has already been submitted.', {
          trackingId: c.appId,
        });
      }

      // Gate 1: consent. Gate 2: explicit button approval; voice can never approve.
      if (req.body?.consentGiven !== true && !c.consent?.caseConsent) {
        return fail(res, 403, 'CONSENT_REQUIRED', 'Consent is required before submission.');
      }
      if (req.body?.approvalConfirmed !== true || req.body?.approvalSource !== 'button') {
        return fail(res, 403, 'APPROVAL_REQUIRED', 'You must confirm submission with the Submit button. Voice cannot approve.');
      }

      const scheme = await findScheme(c.schemeId || c.service);
      if (!scheme) return fail(res, 404, 'SCHEME_NOT_FOUND', 'Scheme not found.');

      const form = c.formData || {};
      const missingFields = ['fullName', 'dob', 'state', 'district', 'address'].filter((k) => !String(form[k] || '').trim());
      if (missingFields.length) {
        return fail(res, 422, 'MISSING_FIELDS', 'Please complete all required fields.', { missingFields });
      }

      const owned = (await findDocuments(VaultDoc, { userId })) || [];
      const verifiedTypes = new Set(owned.filter((d) => d.status === 'VERIFIED').map((d) => d.type));
      const missingDocuments = (scheme.requiredDocuments || []).filter((k) => !verifiedTypes.has(k));
      if (missingDocuments.length) {
        return fail(res, 422, 'DOCUMENTS_NOT_VERIFIED', 'All mandatory documents must be uploaded and verified.', {
          missingDocuments,
        });
      }

      const trackingId = await nextTrackingId();
      const now = new Date();
      const history = [
        ...(c.history || []),
        { step: 6, status: 'CONSENTED', note: 'Consent recorded', actor: 'CITIZEN', at: now },
        { step: 11, status: 'APPROVED', note: 'Citizen approved submission with button', actor: 'CITIZEN', at: now },
        { step: 12, status: 'SUBMITTED', note: `Submitted. Tracking ID ${trackingId}`, actor: 'SYSTEM', at: now },
      ].slice(-50);

      const updated = await updateOneDocument(
        Case,
        { caseId: c.caseId, userId },
        {
          status: 'SUBMITTED',
          appId: trackingId,
          submittedAt: now,
          consent: { ...(c.consent || {}), caseConsent: true, caseConsentAt: now },
          approval: { given: true, at: now, byPhysicalButton: true },
          history,
        }
      );

      const schemeName = pickLocalized(scheme.name, 'en-IN');
      await notify(userId, {
        title: 'Application Submitted Successfully',
        message: `Your ${schemeName} application has been submitted successfully. Tracking ID: ${trackingId}. Status: Submitted.`,
        type: 'STATUS_UPDATE',
        link: `/applications/${trackingId}/tracking`,
      });

      req.auditMeta = {
        actor: 'CITIZEN',
        action: 'APPLICATION_SUBMITTED',
        caseId: c.caseId,
        userId,
        extra: { trackingId, schemeId: scheme.schemeId },
      };
      return send(res, 201, `Application submitted. Tracking ID: ${trackingId}`, {
        applicationId: trackingId,
        trackingId,
        application: applicationDto(updated, scheme),
      });
    } catch (err) {
      return next(err);
    }
  });

  const trackingHandler = async (req, res, next) => {
    try {
      const c = await findOwnedCase(req.user.id, req.params.id);
      if (!c) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found.');
      const scheme = await findScheme(c.schemeId || c.service);
      const submitted = SUBMITTED_STATUSES.includes(c.status);
      const days = submitted && c.submittedAt ? Math.floor((Date.now() - new Date(c.submittedAt)) / 86400000) : 0;
      return send(res, 200, `Application ${c.appId || c.caseId}`, {
        caseId: c.caseId,
        applicationId: c.appId || null,
        trackingId: c.appId || null,
        referenceNumber: c.refNo || null,
        status: c.status,
        department: pickLocalized(scheme?.department, 'en-IN'),
        scheme: c.schemeId || c.service,
        schemeName: c.schemeName || pickLocalized(scheme?.name, 'en-IN'),
        daysElapsed: c.stallDetails?.daysElapsed || days,
        stalled: Boolean(c.stallDetails?.stalled),
        queryActive: Boolean(c.queryDetails?.active),
        queryMessage: c.queryDetails?.message || null,
        timeline: buildTimeline(c),
        activity: [...(c.history || [])].reverse(),
        nextAction: nextActionFor(c),
      });
    } catch (err) {
      return next(err);
    }
  };
  router.get('/applications/:id/tracking', trackingHandler);
  router.get('/applications/:id/timeline', trackingHandler);

  router.get('/applications/:id/activity', async (req, res, next) => {
    try {
      const c = await findOwnedCase(req.user.id, req.params.id);
      if (!c) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found.');
      return send(res, 200, 'Activity history', { activity: [...(c.history || [])].reverse() });
    } catch (err) {
      return next(err);
    }
  });

  // ---- Documents ---------------------------------------------------------
  router.get('/documents', async (req, res, next) => {
    try {
      const docs = (await findDocuments(VaultDoc, { userId: req.user.id })) || [];
      const safe = docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).map(docDto);
      return send(res, 200, `${safe.length} documents`, { total: safe.length, documents: safe });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/documents/upload', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const type = String(req.body?.type || '').trim();
      if (!/^[A-Za-z0-9_-]{2,60}$/.test(type)) {
        return fail(res, 400, 'INVALID_DOCUMENT_TYPE', 'A valid document type is required.');
      }
      const upload = decodeUpload(req.body);
      if (upload.error) return fail(res, upload.error === 'FILE_TOO_LARGE' ? 413 : 400, upload.error, upload.display);

      const storageKey = storeEncryptedFile(userId, upload.buffer);
      const hash = crypto.createHash('sha256').update(upload.buffer).digest('hex');
      const doc = await saveDocument(VaultDoc, {
        userId,
        type,
        status: 'PENDING_VERIFICATION',
        encryptedMetadata: encryptSensitiveValue({ type, fileName: upload.name }),
        maskedSummary: `${type}-${hash.slice(-4)}`,
        fileName: upload.name,
        fileSize: upload.buffer.length,
        mimeType: upload.mimeType,
        category: String(req.body?.category || 'Other').slice(0, 40),
        storageKey,
        contentHash: hash,
        uploadedAt: new Date(),
      });
      req.auditMeta = { actor: 'CITIZEN', action: 'DOCUMENT_UPLOADED', userId, extra: { type, size: upload.buffer.length } };
      return send(res, 201, 'Document uploaded. Verification is pending.', { document: docDto(doc) });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/documents/verify', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null;
      const docs = (await findDocuments(VaultDoc, { userId })) || [];
      const targets = docs.filter(
        (d) =>
          ['PENDING_VERIFICATION', 'UPLOADED', 'PENDING'].includes(d.status) &&
          (!ids || ids.includes(String(d._id)))
      );
      const results = [];
      for (const d of targets) {
        results.push(docDto(await runVerification(userId, d)));
      }
      req.auditMeta = { actor: 'CITIZEN', action: 'DOCUMENTS_VERIFIED', userId, extra: { count: results.length } };
      return send(res, 200, `${results.length} documents checked`, { checked: results.length, documents: results });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/documents/:id/verify', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const doc = await findOneDocument(VaultDoc, { _id: req.params.id, userId });
      if (!doc) return fail(res, 404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
      const updated = await runVerification(userId, doc);
      const dto = docDto(updated);
      return send(res, 200, 'Verification complete', {
        document: dto,
        verification: {
          status: updated.status,
          ...(dto.verification || {}),
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/documents/:id/reupload', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const doc = await findOneDocument(VaultDoc, { _id: req.params.id, userId });
      if (!doc) return fail(res, 404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
      const upload = decodeUpload(req.body);
      if (upload.error) return fail(res, upload.error === 'FILE_TOO_LARGE' ? 413 : 400, upload.error, upload.display);

      const storageKey = storeEncryptedFile(userId, upload.buffer);
      const hash = crypto.createHash('sha256').update(upload.buffer).digest('hex');
      removeEncryptedFile(userId, doc.storageKey);
      const updated = await updateOneDocument(
        VaultDoc,
        { _id: doc._id, userId },
        {
          status: 'PENDING_VERIFICATION',
          fileName: upload.name,
          fileSize: upload.buffer.length,
          mimeType: upload.mimeType,
          storageKey,
          contentHash: hash,
          maskedSummary: `${doc.type}-${hash.slice(-4)}`,
          encryptedMetadata: encryptSensitiveValue({ type: doc.type, fileName: upload.name }),
          verification: { method: null, checkedAt: null, checks: [], reason: null, reviewRequired: false },
          uploadedAt: new Date(),
        }
      );
      return send(res, 200, 'Document re-uploaded. Verification is pending.', { document: docDto(updated) });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/documents/:id/content', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const doc = await findOneDocument(VaultDoc, { _id: req.params.id, userId });
      if (!doc) return fail(res, 404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
      const buffer = readEncryptedFile(userId, doc.storageKey);
      if (!buffer) return fail(res, 404, 'FILE_UNAVAILABLE', 'The stored file is unavailable.');
      res.set('Cache-Control', 'no-store');
      return send(res, 200, 'Document content', {
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        contentBase64: buffer.toString('base64'),
      });
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/documents/:id', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const doc = await findOneDocument(VaultDoc, { _id: req.params.id, userId });
      if (!doc) return fail(res, 404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
      removeEncryptedFile(userId, doc.storageKey);
      await deleteDocuments(VaultDoc, { _id: doc._id, userId });
      return send(res, 200, 'Document deleted', { deleted: true });
    } catch (err) {
      return next(err);
    }
  });

  // ---- Notifications -----------------------------------------------------
  router.get('/notifications', async (req, res, next) => {
    try {
      const notifs = ((await findDocuments(Notification, { userId: req.user.id })) || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const unreadCount = notifs.filter((n) => !n.read).length;
      return send(res, 200, `${unreadCount} unread`, { unreadCount, total: notifs.length, notifications: notifs });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/notifications', async (req, res, next) => {
    try {
      const title = String(req.body?.title || '').trim().slice(0, 120);
      const message = String(req.body?.message || '').trim().slice(0, 500);
      if (!title || !message) return fail(res, 400, 'INVALID_NOTIFICATION', 'Title and message are required.');
      const created = await notify(req.user.id, { title, message, type: 'ANNOUNCEMENT', link: '/notifications' });
      return send(res, 201, 'Notification created', { notification: created });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/notifications/read-all', async (req, res, next) => {
    try {
      const all = (await findDocuments(Notification, { userId: req.user.id })) || [];
      for (const n of all) {
        await updateOneDocument(Notification, { notificationId: n.notificationId, userId: req.user.id }, { read: true });
      }
      return send(res, 200, 'All notifications marked as read', { success: true });
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/notifications/:id/read', async (req, res, next) => {
    try {
      const updated = await updateOneDocument(
        Notification,
        { notificationId: req.params.id, userId: req.user.id },
        { read: true }
      );
      if (!updated) return fail(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
      return send(res, 200, 'Marked as read', { read: true });
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/notifications/:id', async (req, res, next) => {
    try {
      const count = await deleteDocuments(Notification, { notificationId: req.params.id, userId: req.user.id });
      if (!count) return fail(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
      return send(res, 200, 'Notification deleted', { deleted: true });
    } catch (err) {
      return next(err);
    }
  });

  // ---- Support tickets ---------------------------------------------------
  router.get('/support/tickets', async (req, res, next) => {
    try {
      const tickets = ((await findDocuments(SupportTicket, { userId: req.user.id })) || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      return send(res, 200, `${tickets.length} tickets`, { tickets });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/support/tickets/:ticketId', async (req, res, next) => {
    try {
      const ticket = await findOneDocument(SupportTicket, { ticketId: req.params.ticketId, userId: req.user.id });
      if (!ticket) return fail(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found.');
      return send(res, 200, 'Ticket', { ticket });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/support/tickets', async (req, res, next) => {
    try {
      const subject = String(req.body?.subject || '').trim().slice(0, 150);
      const description = String(req.body?.description || '').trim().slice(0, 1500);
      if (!subject || !description) {
        return fail(res, 400, 'INVALID_TICKET', 'Subject and description are required.');
      }
      const categories = ['TECHNICAL', 'SCHEME_INQUIRY', 'APPLICATION_DELAY', 'DOCUMENT_VERIFICATION', 'COMPLAINT', 'OTHER'];
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      const category = categories.includes(req.body?.category) ? req.body.category : 'OTHER';
      const priority = priorities.includes(req.body?.priority) ? req.body.priority : 'MEDIUM';
      const ticket = await saveDocument(SupportTicket, {
        ticketId: `TKT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        userId: req.user.id,
        category,
        subject,
        description,
        priority,
        status: 'OPEN',
        responses: [],
      });
      return send(res, 201, `Ticket created: ${ticket.ticketId}`, { ticket });
    } catch (err) {
      return next(err);
    }
  });

  // ---- AI assistant ------------------------------------------------------
  router.post('/assistant/message', async (req, res, next) => {
    try {
      const language = normalizeAssistantLanguage(req.body?.language);
      if (!language) {
        return fail(res, 400, 'LANGUAGE_REQUIRED', 'Language must be one of en-IN, hi-IN, mr-IN.', {
          supportedLanguages: ['en-IN', 'hi-IN', 'mr-IN'],
        });
      }
      const text = String(req.body?.message || '').trim();
      if (!text || text.length > 1000) {
        return fail(res, 400, 'INVALID_MESSAGE', 'Message must be 1 to 1000 characters.');
      }
      const userId = req.user.id;
      const user = await findOneDocument(User, { _id: userId });
      if (!user) return fail(res, 401, 'USER_NOT_FOUND', 'Please log in again.');

      let conversation = req.body?.conversationId
        ? await findOneDocument(Conversation, { conversationId: String(req.body.conversationId), userId })
        : null;
      if (!conversation) {
        conversation = await saveDocument(Conversation, {
          conversationId: `CONV-${crypto.randomUUID()}`,
          userId,
          language,
          messages: [],
        });
      }

      const reply = await buildAssistantReply({
        user: { id: userId, name: user.name },
        language,
        text,
        context: req.body?.context || {},
        agentAdapter,
      });

      const now = new Date();
      await updateOneDocument(
        Conversation,
        { conversationId: conversation.conversationId, userId },
        {
          language,
          updatedAt: now,
          messages: [
            ...(conversation.messages || []),
            { sender: 'CITIZEN', display: maskForLlm(text), speech: '', data: {}, createdAt: now },
            { sender: 'AGENT', display: reply.display, speech: reply.speech, data: { agent: reply.data.agent, intent: reply.data.intent }, createdAt: now },
          ].slice(-200),
        }
      );

      req.auditMeta = {
        actor: 'AGENT',
        action: 'ASSISTANT_MESSAGE',
        userId,
        extra: { language, intent: reply.data.intent, agent: reply.data.agent?.id },
      };
      return res.status(200).json({
        ...reply,
        data: { ...reply.data, conversationId: conversation.conversationId, language },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/assistant/suggestions', (req, res) => {
    const language = normalizeAssistantLanguage(req.query?.language) || 'en-IN';
    return send(res, 200, 'Suggestions', { language, categories: getSuggestions(language) });
  });

  router.get('/assistant/history', async (req, res, next) => {
    try {
      const userId = req.user.id;
      if (req.query?.conversationId) {
        const conv = await findOneDocument(Conversation, { conversationId: String(req.query.conversationId), userId });
        if (!conv) return fail(res, 404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
        return send(res, 200, 'Conversation', { conversation: conv });
      }
      const all = ((await findDocuments(Conversation, { userId })) || [])
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 20)
        .map((c) => ({
          conversationId: c.conversationId,
          language: c.language,
          updatedAt: c.updatedAt,
          title: (c.messages || []).find((m) => m.sender === 'CITIZEN')?.display?.slice(0, 60) || 'Conversation',
          messageCount: (c.messages || []).length,
        }));
      return send(res, 200, `${all.length} conversations`, { conversations: all });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/assistant/extract-field', async (req, res, next) => {
    try {
      const language = normalizeAssistantLanguage(req.body?.language);
      if (!language) return fail(res, 400, 'LANGUAGE_REQUIRED', 'Language must be one of en-IN, hi-IN, mr-IN.');
      const copy = getCopy(language);
      const field = req.body?.field || req.body?.fieldName ? String(req.body?.field || req.body?.fieldName) : null;
      const result = extractFormField({ text: req.body?.text, field });
      const prompts = copy.askField;
      const labels = copy.labels;

      if (!result.ok) {
        const display = copy.clarify[result.reason] || copy.clarify.UNPARSEABLE;
        return send(res, 200, display, {
          ok: false,
          field: result.field || field,
          reason: result.reason,
          needsClarification: true,
          prompts,
          labels,
        });
      }
      const label = labels[result.field];
      return send(
        res,
        200,
        result.needsConfirmation ? copy.confirmField(label, result.value) : `${label}: ${result.value}`,
        {
          ok: true,
          field: result.field,
          value: result.value,
          extractedValue: result.value,
          label,
          needsConfirmation: result.needsConfirmation,
          requiresExplicitConfirmation: result.needsConfirmation,
          prompts,
          labels,
        }
      );
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

