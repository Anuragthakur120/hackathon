import express from 'express';
import {
  Case,
  Profile,
  VaultDoc,
  saveDocument,
  findDocuments,
  findOneDocument,
  loadCatalog,
  autoFillDraftFields,
  DEMO_CASE_ID,
  DEMO_APP_ID,
  DEMO_REF_NO,
} from '@nagarsathi/database';
import {
  SUPPORTED_LANGUAGES,
  requireValidLanguage,
  defaultAgentAdapter,
  DEFAULT_DRAFT,
} from '../agentAdapter.js';
import {
  AUTH_COOKIE_NAME,
  parseCookieHeader,
  verifyCitizenJwt,
} from '../auth.js';
import { transitionCase } from '../caseMachine.js';
import {
  defaultPortalAdapter,
  withPortalRetry,
  submitCaseToPortal,
} from '../portalAdapter.js';

let unknownIntakeAttempts = 0;

export function resetUnknownIntakeAttempts() {
  unknownIntakeAttempts = 0;
}

/**
 * Extracts optional authenticated citizen from cookie or Authorization header without rejecting
 * unauthenticated agent adapter calls, while preserving user context when logged in.
 */
function attachOptionalCitizen(req, _res, next) {
  try {
    const cookies = parseCookieHeader(req.headers?.cookie || '');
    let token = cookies[AUTH_COOKIE_NAME];
    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice('Bearer '.length).trim();
    }
    if (token) {
      const decoded = verifyCitizenJwt(token);
      if (decoded.role === 'citizen') {
        req.user = {
          id: String(decoded.sub),
          phoneMasked: decoded.phoneMasked,
          role: decoded.role,
          language: decoded.language || 'mr-IN',
        };
      }
    }
  } catch {
    // Ignore invalid optional token
  }
  return next();
}

/**
 * Middleware enforcing that the chosen language (`language` or `lang`) is explicitly passed
 * on every `/agents/*` call.
 */
export function requireLanguageMiddleware(req, res, next) {
  const rawLang =
    req.body?.language ??
    req.body?.lang ??
    req.query?.language ??
    req.query?.lang ??
    req.headers?.['x-nagarsathi-lang'];

  try {
    req.agentLanguage = requireValidLanguage(rawLang);
    return next();
  } catch (err) {
    return res.status(400).json({
      error: err.code || 'LANGUAGE_REQUIRED',
      code: err.code || 'LANGUAGE_REQUIRED',
      display: 'कृपया भाषा निवडा (mr-IN, hi-IN, किंवा en-IN आवश्यक आहे).',
      speech: 'कृपया प्रथम भाषा निवडा.',
      data: {
        supportedLanguages: SUPPORTED_LANGUAGES,
      },
    });
  }
}

export function createAgentRouter({
  agentAdapter = defaultAgentAdapter,
  portalAdapter = defaultPortalAdapter,
} = {}) {
  const router = express.Router();

  router.use('/agents', attachOptionalCitizen, requireLanguageMiddleware);

  // ==========================================================================
  // 1. POST /agents/intake
  // ==========================================================================
  router.post('/agents/intake', async (req, res, next) => {
    try {
      const language = req.agentLanguage;
      const action = req.body?.action || 'classify';
      const transcript = req.body?.transcript || 'Meri pension band ho gayi';
      const lower = String(transcript).toLowerCase();
      const isUnknown =
        action === 'classify' &&
        (lower.includes('unknown') ||
          lower.includes('अस्पष्ट') ||
          lower.includes('xyz'));

      if (isUnknown) {
        unknownIntakeAttempts += 1;
      } else if (action === 'classify') {
        unknownIntakeAttempts = 0;
      }

      const caseId = req.body?.caseId || DEMO_CASE_ID;
      const response = await agentAdapter.intake({
        ...req.body,
        action,
        transcript,
        caseId,
        unknownAttempts: unknownIntakeAttempts,
        language,
      });

      if (req.user?.id && !isUnknown && action === 'classify') {
        await saveDocument(Case, {
          caseId,
          userId: req.user.id,
          service: 'pension',
          status: 'INTAKE',
          consent: {
            caseConsent: false,
            caseConsentAt: null,
            saveProfileConsent: false,
            saveProfileConsentAt: null,
          },
          approval: {
            given: false,
            at: null,
            byPhysicalButton: false,
          },
          draftFields: [],
          history: [
            {
              step: 2,
              status: 'INTAKE',
              note: `Agent intake: ${transcript}`,
              actor: 'AGENT',
              at: new Date(),
            },
          ],
          createdAt: new Date(),
        });
      }

      req.auditMeta = {
        actor: 'AGENT',
        action: `AGENT_INTAKE_${action.toUpperCase()}`,
        caseId,
        userId: req.user?.id || 'anonymous',
        extra: { language, action },
      };

      return res.status(200).json(response);
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 2. POST /agents/documents
  // ==========================================================================
  router.post('/agents/documents', async (req, res, next) => {
    try {
      const language = req.agentLanguage;
      const caseId = req.body?.caseId || DEMO_CASE_ID;
      const response = await agentAdapter.documents({
        ...req.body,
        caseId,
        language,
      });

      const caseDoc = await findOneDocument(Case, { caseId });
      if (caseDoc && caseDoc.consent?.caseConsent) {
        const targetStatus = response.data.status;
        if (
          (targetStatus === 'DOCS_COLLECTING' || targetStatus === 'DOCS_READY') &&
          caseDoc.status !== targetStatus
        ) {
          try {
            let current = caseDoc;
            if (
              targetStatus === 'DOCS_READY' &&
              current.status === 'CONSENTED'
            ) {
              current = transitionCase(current, 'DOCS_COLLECTING', {
                actor: 'AGENT',
                note: 'Collecting documents',
              });
            }
            current = transitionCase(current, targetStatus, {
              actor: 'AGENT',
              note: `Documents status: ${targetStatus}`,
            });
            await saveDocument(Case, current);
          } catch {
            // Leave DB case state if transition already applied
          }
        }
      }

      req.auditMeta = {
        actor: 'AGENT',
        action: 'AGENT_DOCUMENTS_CHECK',
        caseId,
        userId: req.user?.id || 'anonymous',
        extra: {
          language,
          status: response.data.status,
          issue: response.data.issue,
        },
      };

      return res.status(200).json(response);
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 3. POST /agents/portal
  // ==========================================================================
  router.post('/agents/portal', async (req, res, next) => {
    try {
      const language = req.agentLanguage;
      const action = req.body?.action || 'fillDraft';
      const caseId = req.body?.caseId || DEMO_CASE_ID;
      const caseDoc = await findOneDocument(Case, { caseId });

      if (action === 'submit') {
        let appId = req.body?.applicationId || DEMO_APP_ID;
        let submittedAt = new Date().toISOString();

        if (caseDoc) {
          const outcome = await submitCaseToPortal(caseDoc, { portalAdapter });
          appId = outcome.result.appId || DEMO_APP_ID;
          submittedAt = outcome.result.submittedAt || submittedAt;

          const nextCase = transitionCase(caseDoc, 'SUBMITTED', {
            actor: 'AGENT',
            note: `Submitted via /agents/portal; appId=${appId}`,
            patch: { appId },
          });
          await saveDocument(Case, nextCase);
        }

        const response = await agentAdapter.portal({
          ...req.body,
          action: 'submit',
          caseId,
          applicationId: appId,
          submittedAt,
          language,
        });

        req.auditMeta = {
          actor: 'AGENT',
          action: 'AGENT_PORTAL_SUBMIT',
          caseId,
          userId: req.user?.id || 'anonymous',
          extra: { language, applicationId: appId },
        };

        return res.status(200).json(response);
      }

      // action === 'fillDraft'
      let portalDraftResult = null;
      if (caseDoc && caseDoc.consent?.caseConsent) {
        const catalog = loadCatalog(caseDoc.service || 'pension');
        const profile = req.user?.id
          ? await findOneDocument(Profile, { userId: req.user.id })
          : null;
        const vaultDocs = req.user?.id
          ? await findDocuments(VaultDoc, { userId: req.user.id })
          : [];

        const { draftFields } = autoFillDraftFields({
          catalog,
          profile,
          vaultDocs,
          citizenAnswers: { pension_subtype: 'old_age_pension' },
        });

        const outcome = await withPortalRetry(
          () => portalAdapter.fillDraft(caseDoc, draftFields),
          {
            maxAttempts: 3,
            actionName: 'PORTAL_FILL_DRAFT',
            caseId,
            userId: req.user?.id || 'anonymous',
          }
        );
        portalDraftResult = outcome.result;

        let current = caseDoc;
        if (current.status === 'CONSENTED') {
          current = transitionCase(current, 'DOCS_COLLECTING', {
            actor: 'AGENT',
          });
        }
        if (current.status === 'DOCS_COLLECTING') {
          current = transitionCase(current, 'DOCS_READY', {
            actor: 'AGENT',
          });
        }
        if (
          current.status === 'DOCS_READY' ||
          current.status === 'FORM_FILLED'
        ) {
          current = transitionCase(current, 'FORM_FILLED', {
            actor: 'AGENT',
            note: 'Filled portal form as DRAFT',
            patch: {
              draftFields,
              draftUpdatedAt: new Date(),
              approval: { given: false, at: null, byPhysicalButton: false },
            },
          });
          await saveDocument(Case, current);
        }
      }

      const response = await agentAdapter.portal({
        ...req.body,
        action: 'fillDraft',
        caseId,
        draft: {
          ...DEFAULT_DRAFT,
          ...(portalDraftResult ? { portalDraft: portalDraftResult } : {}),
        },
        language,
      });

      req.auditMeta = {
        actor: 'AGENT',
        action: 'AGENT_PORTAL_FILL_DRAFT',
        caseId,
        userId: req.user?.id || 'anonymous',
        extra: { language, isDraft: true },
      };

      return res.status(200).json(response);
    } catch (err) {
      if (err.code === 'APPROVAL_REQUIRED') {
        return res.status(403).json({
          error: 'APPROVAL_REQUIRED',
          code: 'APPROVAL_REQUIRED',
          display:
            'नागरिकाच्या अंतिम मंजुरीशिवाय (गेट २) अर्ज सबमिट करता येत नाही.',
          speech: 'तुमच्या मंजुरीशिवाय अर्ज सबमिट केला जाणार नाही.',
          data: { approved: false },
        });
      }
      return next(err);
    }
  });

  // ==========================================================================
  // 4. POST /agents/tracker
  // ==========================================================================
  router.post('/agents/tracker', async (req, res, next) => {
    try {
      const language = req.agentLanguage;
      const caseId = req.body?.caseId || DEMO_CASE_ID;
      const response = await agentAdapter.tracker({
        ...req.body,
        caseId,
        language,
      });

      req.auditMeta = {
        actor: 'AGENT',
        action: 'AGENT_TRACKER_STATUS',
        caseId,
        userId: req.user?.id || 'anonymous',
        extra: { language, status: response.data.status },
      };

      return res.status(200).json(response);
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 5. POST /agents/caller
  // ==========================================================================
  router.post('/agents/caller', async (req, res, next) => {
    try {
      const language = req.agentLanguage;
      const action = req.body?.action || 'start';
      const caseId = req.body?.caseId || DEMO_CASE_ID;

      const response = await agentAdapter.caller({
        ...req.body,
        action,
        caseId,
        language,
      });

      if (action === 'end') {
        const caseDoc = await findOneDocument(Case, { caseId });
        if (caseDoc && caseDoc.status === 'STALLED') {
          const nextCheckAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          const updated = transitionCase(caseDoc, 'CALLED', {
            actor: 'AGENT',
            note: `Office call ended; ref=${response.data.referenceId || DEMO_REF_NO}`,
            patch: {
              refNo: response.data.referenceId || DEMO_REF_NO,
              nextCheckAt,
            },
          });
          await saveDocument(Case, updated);
        }
      }

      req.auditMeta = {
        actor: 'AGENT',
        action: `AGENT_CALLER_${action.toUpperCase()}`,
        caseId,
        userId: req.user?.id || 'anonymous',
        extra: { language, action },
      };

      return res.status(200).json(response);
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 6. POST /agents/letter (and alias POST /letters/explain)
  // ==========================================================================
  const handleLetterExplain = async (req, res, next) => {
    try {
      const language = req.agentLanguage;
      const response = await agentAdapter.letter({
        ...req.body,
        language,
      });

      req.auditMeta = {
        actor: 'AGENT',
        action: 'AGENT_LETTER_EXPLAIN',
        userId: req.user?.id || 'anonymous',
        extra: { language },
      };

      return res.status(200).json(response);
    } catch (err) {
      return next(err);
    }
  };

  router.post('/agents/letter', handleLetterExplain);
  router.post(
    '/letters/explain',
    attachOptionalCitizen,
    requireLanguageMiddleware,
    handleLetterExplain
  );

  return router;
}
