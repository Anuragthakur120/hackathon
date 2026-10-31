import express from 'express';
import {
  Case,
  Profile,
  VaultDoc,
  saveDocument,
  findDocuments,
  findOneDocument,
  deleteDocuments,
  loadCatalog,
  autoFillDraftFields,
  seedDatabase,
  DEMO_CASE_ID,
  DEMO_APP_ID,
  DEMO_REF_NO,
} from '@nagarsathi/database';
import { requireCitizenAuth, assertSameCitizen } from '../auth.js';
import { maskForLlm, sanitizeForApiResponse } from '../privacy.js';
import { enqueueAuditLog } from '../auditMiddleware.js';
import {
  GATE1_PERMISSIONS,
  transitionCase,
} from '../caseMachine.js';
import {
  defaultPortalAdapter,
  withPortalRetry,
  submitCaseToPortal,
} from '../portalAdapter.js';
import { requireConsent } from '../consentMiddleware.js';

function detectServiceFromTranscript(transcript = '') {
  const lower = String(transcript).toLowerCase();
  if (lower.includes('pension') || lower.includes('पेन्शन') || lower.includes('पेंशन')) {
    return { serviceId: 'pension', confidence: 0.96 };
  }
  if (
    lower.includes('scholarship') ||
    lower.includes('शिष्यवृत्ती') ||
    lower.includes('छात्रवृत्ति')
  ) {
    return { serviceId: 'scholarship', confidence: 0.94 };
  }
  if (lower.includes('ration') || lower.includes('रेशन') || lower.includes('राशन')) {
    return { serviceId: 'ration_card', confidence: 0.93 };
  }
  return { serviceId: 'pension', confidence: 0.4 };
}

async function persistCaseUpdate(nextCaseObj) {
  return saveDocument(Case, nextCaseObj);
}

export function createCaseRouter({ portalAdapter = defaultPortalAdapter } = {}) {
  const router = express.Router();

  // ==========================================================================
  // 1. Create Case from Transcript (Step 2: INTAKE)
  // ==========================================================================
  router.post('/cases', requireCitizenAuth, async (req, res, next) => {
    try {
      const rawTranscript = req.body?.transcript || 'Meri pension band ho gayi';
      const safeTranscript = maskForLlm(rawTranscript);
      const language = req.body?.language || req.user.language || 'mr-IN';
      const { serviceId, confidence } = detectServiceFromTranscript(safeTranscript);

      const caseId =
        req.body?.caseId || `CASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const created = await saveDocument(Case, {
        caseId,
        userId: req.user.id,
        service: serviceId,
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
            note: `Intake transcript: ${safeTranscript}`,
            actor: 'CITIZEN',
            at: new Date(),
          },
        ],
        createdAt: new Date(),
      });

      const catalog = loadCatalog(serviceId);
      req.auditMeta = {
        actor: 'AGENT',
        action: 'CASE_CREATED_INTAKE',
        caseId,
        userId: req.user.id,
        extra: { serviceId, confidence, safeTranscript },
      };

      return res.status(201).json({
        display: `${catalog.name.mr} — कोणती पेन्शन? (वृद्धापकाळ की विधवा?)`,
        speech: 'तुमची कोणती पेन्शन आहे? वृद्धापकाळ की विधवा पेन्शन?',
        data: {
          caseId: created.caseId,
          status: created.status,
          service: {
            id: serviceId,
            name: catalog.name.en,
          },
          confidence,
          language,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 2. Clarifying Answer (Step 3: CLARIFYING)
  // ==========================================================================
  router.post('/cases/:caseId/answer', requireCitizenAuth, async (req, res, next) => {
    try {
      const caseDoc = await findOneDocument(Case, { caseId: req.params.caseId });
      if (!caseDoc) {
        return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
      }
      if (!assertSameCitizen(req, res, caseDoc.userId)) return;

      const answer = maskForLlm(req.body?.answer || 'old_age_pension');
      const fieldKey = req.body?.fieldId || 'pension_subtype';

      const existingDraft = (caseDoc.draftFields || []).filter(
        (f) => f.key !== fieldKey
      );
      existingDraft.push({
        key: fieldKey,
        value: answer,
        maskedValue: String(answer),
        source: 'ASK_CITIZEN',
        sensitive: false,
      });

      const transitioned = transitionCase(caseDoc, 'CLARIFYING', {
        actor: 'CITIZEN',
        note: `Answered ${fieldKey}=${answer}`,
        patch: { draftFields: existingDraft },
      });
      const saved = await persistCaseUpdate(transitioned);

      return res.status(200).json({
        display: 'तुम्हाला वृद्धापकाळ पेन्शन पुन्हा सुरू करायची आहे, बरोबर?',
        speech: 'तुम्हाला वृद्धापकाळ पेन्शन चालू करायची आहे, बरोबर का?',
        data: {
          caseId: saved.caseId,
          status: saved.status,
          updatedFields: { [fieldKey]: answer },
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // ==========================================================================
  // 3. Confirm Service (Step 4: SERVICE_CONFIRMED)
  // ==========================================================================
  router.post(
    '/cases/:caseId/confirm-service',
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const caseDoc = await findOneDocument(Case, { caseId: req.params.caseId });
        if (!caseDoc) {
          return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
        }
        if (!assertSameCitizen(req, res, caseDoc.userId)) return;

        const confirmed = req.body?.confirmed !== false;
        if (!confirmed) {
          const resetCase = transitionCase(caseDoc, 'INTAKE', {
            actor: 'CITIZEN',
            note: 'Citizen declined service match; returned to INTAKE',
          });
          const saved = await persistCaseUpdate(resetCase);
          return res.status(200).json({
            display: 'ठीक आहे, कृपया तुमची अडचण पुन्हा सांगा.',
            speech: 'कृपया तुमची समस्या पुन्हा सांगा.',
            data: { caseId: saved.caseId, status: saved.status },
          });
        }

        const nextCase = transitionCase(caseDoc, 'SERVICE_CONFIRMED', {
          actor: 'CITIZEN',
          note: 'Citizen confirmed service',
          patch: {
            service: req.body?.serviceId || caseDoc.service,
          },
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: 'सेवा निश्चित झाली. आता गेट १ संमती तपासा.',
          speech: 'सेवा निश्चित झाली आहे. कृपया संमती द्या.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
            serviceId: saved.service,
            permissions: GATE1_PERMISSIONS,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 4. Gate 1: Consent (Steps 5-7: CONSENTED or NO -> Halt & Save Nothing)
  // ==========================================================================
  router.post(
    '/cases/:caseId/consent',
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const caseDoc = await findOneDocument(Case, { caseId: req.params.caseId });
        if (!caseDoc) {
          return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
        }
        if (!assertSameCitizen(req, res, caseDoc.userId)) return;

        const given = Boolean(req.body?.given);
        const saveProfileConsent =
          req.body?.saveProfileConsent !== undefined
            ? Boolean(req.body.saveProfileConsent)
            : Boolean(caseDoc.consent?.saveProfileConsent);

        if (!given) {
          // Gate 1 = NO: Halt the flow and delete uncommitted case so nothing is saved!
          await deleteDocuments(Case, { caseId: caseDoc.caseId });

          enqueueAuditLog({
            actor: 'CITIZEN',
            action: 'GATE1_CONSENT_DECLINED_HALTED',
            caseId: caseDoc.caseId,
            userId: req.user.id,
            payload: {
              given: false,
              nothingSaved: true,
              permissions: GATE1_PERMISSIONS,
            },
          });

          return res.status(200).json({
            display:
              'तुम्ही संमती नाकारली आहे. प्रक्रिया थांबवली आहे आणि कोणतीही माहिती जतन केलेली नाही.',
            speech: 'प्रक्रिया थांबवली आहे. तुमचा कोणताही डेटा सेव्ह केलेला नाही.',
            data: {
              caseId: caseDoc.caseId,
              status: 'CANCELLED',
              halted: true,
              nothingSaved: true,
              consent: {
                caseConsent: false,
                saveProfileConsent: false,
              },
              permissions: GATE1_PERMISSIONS,
            },
          });
        }

        const now = new Date();
        const nextCase = transitionCase(caseDoc, 'CONSENTED', {
          actor: 'CITIZEN',
          note: `Gate 1 Consent agreed (CAN: ${GATE1_PERMISSIONS.canDo.join(',')}; CANNOT: ${GATE1_PERMISSIONS.cannotDo.join(',')})`,
          patch: {
            consent: {
              caseConsent: true,
              caseConsentAt: now,
              saveProfileConsent,
              saveProfileConsentAt: saveProfileConsent ? now : null,
            },
          },
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: 'गेट १ संमती नोंदवली आहे.',
          speech: 'तुमची संमती नोंदवली आहे.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
            consent: {
              given: true,
              caseConsent: saved.consent.caseConsent,
              saveProfileConsent: saved.consent.saveProfileConsent,
              timestamp: now.toISOString(),
            },
            permissions: GATE1_PERMISSIONS,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  // Separate "save profile for next time" preference endpoint
  router.post(
    '/cases/:caseId/save-profile-consent',
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const caseDoc = await findOneDocument(Case, { caseId: req.params.caseId });
        if (!caseDoc) {
          return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
        }
        if (!assertSameCitizen(req, res, caseDoc.userId)) return;

        const saveProfileConsent = Boolean(req.body?.saveProfileConsent);
        const now = new Date();

        const updatedConsent = {
          ...(caseDoc.consent || {}),
          saveProfileConsent,
          saveProfileConsentAt: saveProfileConsent ? now : null,
        };

        const saved = await persistCaseUpdate({
          ...caseDoc,
          consent: updatedConsent,
        });

        enqueueAuditLog({
          actor: 'CITIZEN',
          action: 'SAVE_PROFILE_CONSENT_UPDATED',
          caseId: saved.caseId,
          userId: req.user.id,
          payload: {
            caseConsent: saved.consent.caseConsent,
            saveProfileConsent: saved.consent.saveProfileConsent,
          },
        });

        return res.status(200).json({
          display: saveProfileConsent
            ? 'पुढील वेळेसाठी प्रोफाइल सेव्ह करण्याची संमती नोंदवली.'
            : 'प्रोफाइल सेव्ह केली जाणार नाही (केवळ ३० दिवसांनंतर केस आपोआप डिलीट होईल).',
          speech: saveProfileConsent
            ? 'प्रोफाइल सेव्ह केली जाईल.'
            : 'प्रोफाइल सेव्ह केली जाणार नाही.',
          data: {
            caseId: saved.caseId,
            consent: saved.consent,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 5. Documents Checklist & Upload (Steps 8-9: DOCS_COLLECTING -> DOCS_READY)
  //    Guarded by requireConsent('upload')
  // ==========================================================================
  router.post(
    '/cases/:caseId/documents',
    requireCitizenAuth,
    requireConsent('upload'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;

        // If citizen is resubmitting a document in response to a Day-10 QUERY_RAISED:
        // resolve query, set nextCheckAt (+3 days), and loop back to TRACKING!
        if (caseDoc.status === 'QUERY_RAISED') {
          const nextCheckAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
          const resumed = transitionCase(caseDoc, 'TRACKING', {
            actor: 'CITIZEN',
            note: 'Citizen uploaded renewed document for Day-10 query; looped back to TRACKING',
            patch: {
              queryDetails: {
                ...(caseDoc.queryDetails || {}),
                active: false,
                resolvedAt: new Date(),
              },
              nextCheckAt,
            },
          });
          const saved = await persistCaseUpdate(resumed);

          return res.status(200).json({
            display: 'नवीन कागदपत्र सादर केले. अर्ज पुन्हा ट्रॅकिंगमध्ये आहे.',
            speech: 'नवीन कागदपत्र अपलोड झाले आहे. आम्ही ३ दिवसांत पुन्हा तपासू.',
            data: {
              caseId: saved.caseId,
              status: saved.status,
              nextCheckAt: saved.nextCheckAt,
            },
          });
        }

        const markReady = Boolean(req.body?.markReady);
        let current = caseDoc;

        if (
          current.status === 'CONSENTED' ||
          current.status === 'PROFILE_SAVE_CONSENT' ||
          current.status === 'DOCS_CHECKLIST'
        ) {
          current = transitionCase(current, 'DOCS_COLLECTING', {
            actor: 'CITIZEN',
            note: 'Collecting & verifying citizen documents',
          });
        }

        if (markReady) {
          current = transitionCase(current, 'DOCS_READY', {
            actor: 'AGENT',
            note: 'All required documents verified and ready',
          });
        }

        const saved = await persistCaseUpdate(current);
        return res.status(200).json({
          display:
            saved.status === 'DOCS_READY'
              ? 'सर्व कागदपत्रे तयार आहेत.'
              : 'कागदपत्रे गोळा केली जात आहेत.',
          speech:
            saved.status === 'DOCS_READY'
              ? 'सर्व कागदपत्रे तपासली आहेत.'
              : 'कृपया उर्वरित कागदपत्रे अपलोड करा.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 6. Fill Draft Form (Step 10: FORM_FILLED — DRAFT ONLY)
  //    Guarded by requireConsent('fill') + Portal Retry x3
  // ==========================================================================
  router.post(
    '/cases/:caseId/fill-draft',
    requireCitizenAuth,
    requireConsent('fill'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;
        const catalog = loadCatalog(caseDoc.service);
        const profile = await findOneDocument(Profile, { userId: req.user.id });
        const vaultDocs = await findDocuments(VaultDoc, { userId: req.user.id });

        const existingAnswers = {};
        for (const f of caseDoc.draftFields || []) {
          if (f.source === 'ASK_CITIZEN') {
            existingAnswers[f.key] = f.value;
          }
        }

        const { draftFields } = autoFillDraftFields({
          catalog,
          profile,
          vaultDocs,
          citizenAnswers: {
            pension_subtype: 'old_age_pension',
            ...existingAnswers,
            ...(req.body?.citizenAnswers || {}),
          },
        });

        const portalOutcome = await withPortalRetry(
          () => portalAdapter.fillDraft(caseDoc, draftFields),
          {
            maxAttempts: 3,
            actionName: 'PORTAL_FILL_DRAFT',
            caseId: caseDoc.caseId,
            userId: req.user.id,
          }
        );

        const nextCase = transitionCase(caseDoc, 'FORM_FILLED', {
          actor: 'AGENT',
          note: 'Filled portal form as DRAFT (not submitted)',
          patch: {
            draftFields,
          },
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display:
            'मसुदा अर्ज (DRAFT) तयार आहे. तुमच्या मंजुरीशिवाय अर्ज सबमिट होणार नाही.',
          speech: 'ड्राफ्ट अर्ज तयार आहे. कृपया तपासून हिरवे बटण दाबा.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
            draft: {
              isDraft: true,
              serviceId: saved.service,
              fields: saved.draftFields,
              portalDraft: portalOutcome.result,
            },
          },
        });
      } catch (err) {
        if (err.code === 'PORTAL_FAILED_AFTER_3_RETRIES') {
          return res.status(503).json({
            error: err.code,
            display: err.message,
            speech:
              'सरकारी पोर्टल सध्या प्रतिसाद देत नाही. आम्ही ३ वेळा प्रयत्न केला. तुमचा मसुदा सुरक्षित आहे.',
            data: {
              caseId: req.caseDoc?.caseId,
              attempts: err.attempts,
              draftSafe: true,
            },
          });
        }
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 7. Gate 2: Approve Draft (Step 11: APPROVED or NO -> Halt at FORM_FILLED)
  //    Voice-only approval is NEVER enough; requires physical button confirmation.
  // ==========================================================================
  router.post(
    '/cases/:caseId/approve',
    requireCitizenAuth,
    requireConsent('fill'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;
        const given = Boolean(req.body?.given);
        const isVoiceOnly =
          req.body?.source === 'voice' || req.body?.byPhysicalButton === false;

        if (!given) {
          // Approval NO: Halt submission, keep in FORM_FILLED so citizen can edit
          const haltedCase = {
            ...caseDoc,
            status: 'FORM_FILLED',
            approval: {
              given: false,
              at: null,
              byPhysicalButton: false,
            },
          };
          const saved = await persistCaseUpdate(haltedCase);

          enqueueAuditLog({
            actor: 'CITIZEN',
            action: 'GATE2_APPROVAL_DECLINED_HALTED',
            caseId: saved.caseId,
            userId: req.user.id,
            payload: { given: false, status: saved.status },
          });

          return res.status(200).json({
            display:
              'तुम्ही बदल करण्याची विनंती केली आहे. अर्ज सबमिट केलेला नाही (मसुदा संपादनासाठी खुला आहे).',
            speech: 'अर्ज सबमिट केलेला नाही. तुम्ही माहिती बदलू शकता.',
            data: {
              caseId: saved.caseId,
              status: saved.status,
              halted: true,
              approval: saved.approval,
            },
          });
        }

        if (isVoiceOnly) {
          // Voice "haan" alone is NEVER enough to approve Gate 2!
          enqueueAuditLog({
            actor: 'CITIZEN',
            action: 'GATE2_VOICE_ONLY_INSUFFICIENT',
            caseId: caseDoc.caseId,
            userId: req.user.id,
            payload: { voiceOnly: true, requiresPhysicalButton: true },
          });

          return res.status(200).json({
            display:
              'तुम्ही आवाजाने "हो" म्हटले आहे. सुरक्षिततेसाठी कृपया स्क्रीनवरील हिरवे कन्फर्म बटण स्वतः दाबा.',
            speech:
              'तुम्ही हो म्हटले आहे. सबमिट करण्यासाठी कृपया हिरवे बटण दाबा.',
            data: {
              caseId: caseDoc.caseId,
              status: 'FORM_FILLED',
              voiceOnly: true,
              requiresPhysicalConfirm: true,
              approval: {
                given: false,
                at: null,
                byPhysicalButton: false,
              },
            },
          });
        }

        const now = new Date();
        const nextCase = transitionCase(caseDoc, 'APPROVED', {
          actor: 'CITIZEN',
          note: 'Gate 2 physical approval button confirmed by citizen',
          patch: {
            approval: {
              given: true,
              at: now,
              byPhysicalButton: true,
            },
          },
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: 'अंतिम मंजुरी (गेट २) मिळाली आहे. आता अर्ज सबमिट करू शकता.',
          speech: 'तुमची अंतिम मंजुरी मिळाली आहे.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
            approval: {
              given: true,
              byPhysicalButton: true,
              timestamp: now.toISOString(),
            },
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 8. Submit Application (Step 12: SUBMITTED)
  //    Guarded by requireConsent('submit') + Gate 2 physical approval check + Portal Retry x3
  // ==========================================================================
  router.post(
    '/cases/:caseId/submit',
    requireCitizenAuth,
    requireConsent('submit'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;

        // Enforces caseDoc.approval.given === true && byPhysicalButton === true
        const portalOutcome = await submitCaseToPortal(caseDoc, {
          portalAdapter,
        });
        const submission = portalOutcome.result;
        const nextCheckAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

        const nextCase = transitionCase(caseDoc, 'SUBMITTED', {
          actor: 'AGENT',
          note: `Submitted to portal; Application ID=${submission.appId}`,
          patch: {
            appId: submission.appId,
            nextCheckAt,
          },
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: `अर्ज यशस्वीरित्या सादर केला! अर्ज क्रमांक: ${saved.appId}`,
          speech: `तुमचा अर्ज जमा झाला आहे. अर्ज क्रमांक ${saved.appId}`,
          data: {
            caseId: saved.caseId,
            status: saved.status,
            applicationId: saved.appId,
            submittedAt: submission.submittedAt,
            nextCheckAt: saved.nextCheckAt,
          },
        });
      } catch (err) {
        if (err.code === 'APPROVAL_REQUIRED') {
          return res.status(403).json({
            error: 'APPROVAL_REQUIRED',
            display: 'नागरिकाच्या अंतिम मंजुरीशिवाय (गेट २) अर्ज सबमिट करता येत नाही.',
            speech: 'तुमच्या मंजुरीशिवाय अर्ज सबमिट केला जाणार नाही.',
            data: {
              caseId: req.caseDoc?.caseId,
              approved: false,
            },
          });
        }
        if (err.code === 'PORTAL_FAILED_AFTER_3_RETRIES') {
          return res.status(503).json({
            error: err.code,
            display: err.message,
            speech:
              'सरकारी पोर्टल सध्या प्रतिसाद देत नाही. आम्ही ३ वेळा प्रयत्न केला. तुमचा मसुदा सुरक्षित आहे.',
            data: {
              caseId: req.caseDoc?.caseId,
              attempts: err.attempts,
              draftSafe: true,
            },
          });
        }
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 9. Track Portal Status (Steps 13-16: TRACKING / QUERY_RAISED / STALLED / CLOSED)
  // ==========================================================================
  router.post(
    '/cases/:caseId/track',
    requireCitizenAuth,
    requireConsent('fill'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;
        const appId = caseDoc.appId || DEMO_APP_ID;

        const portalOutcome = await withPortalRetry(
          () =>
            portalAdapter.getStatus(appId, {
              daysElapsed: req.body?.daysElapsed,
              raiseQueryOnDay10: Boolean(req.body?.raiseQueryOnDay10),
            }),
          {
            maxAttempts: 3,
            actionName: 'PORTAL_GET_STATUS',
            caseId: caseDoc.caseId,
            userId: req.user.id,
          }
        );

        const portalStatus = portalOutcome.result;
        const targetStatus = portalStatus.status || 'TRACKING';
        const nextCheckAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const patch = { nextCheckAt };
        if (targetStatus === 'QUERY_RAISED' && portalStatus.query) {
          patch.queryDetails = {
            active: true,
            raisedOnDay: portalStatus.query.raisedOnDay || 10,
            message: portalStatus.query.message,
            documentKey: portalStatus.query.documentKey || 'life_certificate',
            resolvedAt: null,
          };
        }
        if (targetStatus === 'STALLED') {
          patch.stallDetails = {
            stalled: true,
            daysElapsed: portalStatus.daysElapsed || 21,
            stalledDays: portalStatus.stalledDays || 7,
            reason: portalStatus.reason || '7 din se ruka hai',
          };
        }

        const nextCase = transitionCase(caseDoc, targetStatus, {
          actor: 'AGENT',
          note: `Portal status synced: ${targetStatus}`,
          patch,
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: `अर्ज स्थिती: ${saved.status}`,
          speech: `अर्जाची सध्याची स्थिती ${saved.status} आहे.`,
          data: {
            caseId: saved.caseId,
            status: saved.status,
            applicationId: saved.appId,
            queryDetails: saved.queryDetails,
            stallDetails: saved.stallDetails,
            nextCheckAt: saved.nextCheckAt,
          },
        });
      } catch (err) {
        if (err.code === 'PORTAL_FAILED_AFTER_3_RETRIES') {
          return res.status(503).json({
            error: err.code,
            display: err.message,
            speech: 'पोर्टल स्थिती तपासताना ३ वेळा अडचण आली.',
            data: {
              caseId: req.caseDoc?.caseId,
              attempts: err.attempts,
            },
          });
        }
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 10. Simulated Office Call on Stall (Step 15: STALLED -> CALLED -> TRACKING)
  //     Guarded by requireConsent('call')
  // ==========================================================================
  router.post(
    '/cases/:caseId/call/start',
    requireCitizenAuth,
    requireConsent('call'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;
        const catalog = loadCatalog(caseDoc.service);

        enqueueAuditLog({
          actor: 'AGENT',
          action: 'OFFICE_CALL_STARTED',
          caseId: caseDoc.caseId,
          userId: req.user.id,
          payload: {
            department: catalog.office_call.department,
            may_say: catalog.office_call.may_say,
            never_say: catalog.office_call.never_say,
          },
        });

        return res.status(200).json({
          display: `कार्यालयाशी संपर्क सुरू: ${catalog.office_call.department}`,
          speech: 'आम्ही पेन्शन कार्यालयाशी फोनवर बोलत आहोत.',
          data: {
            caseId: caseDoc.caseId,
            callId: `CALL-${caseDoc.caseId}`,
            status: 'IN_PROGRESS',
            officeCallPolicy: catalog.office_call,
            turns: [
              {
                speaker: 'NAGARSATHI_AGENT',
                text: `Namaskar, calling regarding Application ID ${caseDoc.appId || DEMO_APP_ID} for Ramabai Kulkarni.`,
              },
            ],
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  router.post(
    '/cases/:caseId/call/turn',
    requireCitizenAuth,
    requireConsent('call'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;
        const officerUtterance = maskForLlm(
          req.body?.officerUtterance ||
            'Life certificate verified. Reference REF-5521 logged. Check in 3 days.'
        );

        return res.status(200).json({
          display: `अधिकारी उत्तर: ${officerUtterance}`,
          speech: officerUtterance,
          data: {
            caseId: caseDoc.caseId,
            turn: {
              speaker: 'OFFICE_OFFICER',
              text: officerUtterance,
            },
            completed: true,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  router.post(
    '/cases/:caseId/call/end',
    requireCitizenAuth,
    requireConsent('call'),
    async (req, res, next) => {
      try {
        const caseDoc = req.caseDoc;
        const referenceId = req.body?.referenceId || DEMO_REF_NO;
        const nextCheckAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        // Transition STALLED -> CALLED
        let updated = transitionCase(caseDoc, 'CALLED', {
          actor: 'AGENT',
          note: `Office call completed; extracted reference ${referenceId}`,
          patch: {
            refNo: referenceId,
            nextCheckAt,
            stallDetails: {
              ...(caseDoc.stallDetails || {}),
              stalled: false,
            },
          },
        });

        // If loopToTracking is requested (or via /case-updated), immediately loop CALLED -> TRACKING
        if (req.body?.loopToTracking === true) {
          updated = transitionCase(updated, 'TRACKING', {
            actor: 'SYSTEM',
            note: `Scheduled next check in 3 days (${referenceId}); looped back to TRACKING`,
            patch: { nextCheckAt },
          });
        }

        const saved = await persistCaseUpdate(updated);

        return res.status(200).json({
          display: `3 din mein dekhenge, ${referenceId}`,
          speech: `तीन दिवसांत पुन्हा तपासू, संदर्भ क्रमांक ${referenceId}`,
          data: {
            caseId: saved.caseId,
            status: saved.status,
            referenceId,
            nextCheckAt: saved.nextCheckAt,
            summary: `3 din mein dekhenge, ${referenceId}`,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  // Explicit state transition endpoint (verifies state machine guards & rejects illegal transitions)
  router.post(
    '/cases/:caseId/transition',
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const caseDoc = await findOneDocument(Case, { caseId: req.params.caseId });
        if (!caseDoc) {
          return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
        }
        if (!assertSameCitizen(req, res, caseDoc.userId)) return;

        const toStatus = req.body?.toStatus;
        const nextCase = transitionCase(caseDoc, toStatus, {
          actor: 'CITIZEN',
          note: req.body?.note || `Requested transition to ${toStatus}`,
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: `स्थिती बदलली: ${saved.status}`,
          speech: `स्थिती ${saved.status} झाली आहे.`,
          data: {
            case: sanitizeForApiResponse(saved),
          },
        });
      } catch (err) {
        if (err.code === 'ILLEGAL_CASE_TRANSITION') {
          return res.status(409).json({
            error: err.code,
            display: err.message,
            speech: 'हा टप्पा अद्याप पूर्ण करता येत नाही.',
            data: { allowed: false },
          });
        }
        return next(err);
      }
    }
  );

  // ==========================================================================
  // 11. Demo Controls (Behind DEMO_MODE env flag: +21 days stall, Day-10 query, approve, reset)
  // ==========================================================================
  function requireDemoMode(req, res, next) {
    if (process.env.DEMO_MODE === 'false') {
      return res.status(403).json({
        error: 'DEMO_MODE_DISABLED',
        display: 'डेमो मोड बंद आहे.',
        speech: 'डेमो मोड बंद आहे.',
        data: { allowed: false },
      });
    }
    return next();
  }

  router.post(
    '/demo/skip-days',
    requireDemoMode,
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const caseId = req.body?.caseId || DEMO_CASE_ID;
        const days = Number(req.body?.days || 21);
        const caseDoc = await findOneDocument(Case, { caseId });
        if (!caseDoc) {
          return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
        }
        if (!assertSameCitizen(req, res, caseDoc.userId)) return;

        const appId = caseDoc.appId || DEMO_APP_ID;
        const portalStatus = await portalAdapter.getStatus(appId, {
          daysElapsed: days,
        });

        const nextCheckAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const nextCase = transitionCase(caseDoc, 'STALLED', {
          actor: 'SYSTEM',
          note: `+${days} din time-skip: 7 din se ruka hai`,
          patch: {
            stallDetails: {
              stalled: true,
              daysElapsed: days,
              stalledDays: portalStatus.stalledDays || 7,
              reason: '7 din se ruka hai',
            },
            nextCheckAt,
          },
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: `7 din se ruka hai (+${days} din)`,
          speech: 'तुमचा अर्ज सात दिवसांपासून एकाच टेबलवर थांबला आहे.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
            daysSkipped: days,
            stalled: true,
            stallDetails: saved.stallDetails,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  router.post(
    '/demo/raise-query',
    requireDemoMode,
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const caseId = req.body?.caseId || DEMO_CASE_ID;
        const caseDoc = await findOneDocument(Case, { caseId });
        if (!caseDoc) {
          return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
        }
        if (!assertSameCitizen(req, res, caseDoc.userId)) return;

        const appId = caseDoc.appId || DEMO_APP_ID;
        const portalStatus = await portalAdapter.getStatus(appId, {
          daysElapsed: 10,
          raiseQueryOnDay10: true,
        });

        const nextCase = transitionCase(caseDoc, 'QUERY_RAISED', {
          actor: 'OFFICER',
          note: 'Day 10: Office ne ek sawal poocha - life certificate purana hai',
          patch: {
            queryDetails: {
              active: true,
              raisedOnDay: 10,
              message:
                req.body?.queryText ||
                portalStatus.query?.message ||
                'Office ne ek sawal poocha: life certificate purana hai',
              documentKey: 'life_certificate',
              resolvedAt: null,
            },
          },
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: saved.queryDetails.message,
          speech: 'कार्यालयाने एक प्रश्न विचारला आहे: हयातीचा दाखला जुना आहे.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
            query: saved.queryDetails,
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  router.post(
    '/demo/approve',
    requireDemoMode,
    requireCitizenAuth,
    async (req, res, next) => {
      try {
        const caseId = req.body?.caseId || DEMO_CASE_ID;
        const caseDoc = await findOneDocument(Case, { caseId });
        if (!caseDoc) {
          return res.status(404).json({ error: 'CASE_NOT_FOUND', data: null });
        }
        if (!assertSameCitizen(req, res, caseDoc.userId)) return;

        const appId = caseDoc.appId || DEMO_APP_ID;
        portalAdapter.markOfficeApproved(appId);

        const nextCase = transitionCase(caseDoc, 'CLOSED', {
          actor: 'OFFICER',
          note: 'Pension phir chalu ho gayi (Case CLOSED)',
        });
        const saved = await persistCaseUpdate(nextCase);

        return res.status(200).json({
          display: 'Pension phir chalu ho gayi! (पेन्शन पुन्हा सुरू झाली आहे)',
          speech: 'अभिनंदन रमाबाई! तुमची पेन्शन पुन्हा सुरू झाली आहे.',
          data: {
            caseId: saved.caseId,
            status: saved.status,
            applicationId: saved.appId || DEMO_APP_ID,
            referenceId: saved.refNo || DEMO_REF_NO,
            resolution: 'PENSION_RESTORED',
          },
        });
      } catch (err) {
        return next(err);
      }
    }
  );

  router.post('/demo/reset', requireDemoMode, async (_req, res, next) => {
    try {
      portalAdapter.reset();
      await seedDatabase('memory');
      return res.status(200).json({
        display: 'डेमो रिसेट झाला आहे.',
        speech: 'डेमो रिसेट झाला आहे.',
        data: {
          caseId: DEMO_CASE_ID,
          status: 'INTAKE',
          reset: true,
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
