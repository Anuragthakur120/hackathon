import { Case, findOneDocument } from '@nagarsathi/database';
import { assertSameCitizen } from './auth.js';
import { enqueueAuditLog } from './auditMiddleware.js';

/**
 * Middleware factory `requireConsent(scope)` that guards sensitive case actions:
 *   - 'upload' (documents upload / checklist verification)
 *   - 'fill'   (draft form filling)
 *   - 'submit' (portal submission)
 *   - 'call'   (simulated office call on stall)
 *   - 'save_profile' (saving profile for next time)
 *
 * Returns HTTP 403 plus writes an AuditLog entry when consent is missing.
 */
export function requireConsent(scope) {
  return async function consentGuardMiddleware(req, res, next) {
    try {
      const caseId =
        req.params?.caseId || req.params?.id || req.body?.caseId || null;

      if (!caseId) {
        return res.status(400).json({
          error: 'CASE_ID_REQUIRED',
          display: 'प्रकरण क्रमांक (caseId) आवश्यक आहे.',
          speech: 'प्रकरण क्रमांक आवश्यक आहे.',
          data: { scope },
        });
      }

      const caseDoc = await findOneDocument(Case, { caseId });
      if (!caseDoc) {
        return res.status(404).json({
          error: 'CASE_NOT_FOUND',
          display: 'प्रकरण सापडले नाही.',
          speech: 'प्रकरण सापडले नाही.',
          data: { caseId, scope },
        });
      }

      if (!assertSameCitizen(req, res, caseDoc.userId)) {
        enqueueAuditLog({
          actor: 'CITIZEN',
          action: 'CROSS_USER_CASE_ACCESS_DENIED',
          caseId,
          userId: req.user?.id,
          payload: { scope, attemptedCaseId: caseId },
        });
        return;
      }

      const hasConsent =
        scope === 'save_profile'
          ? caseDoc.consent?.saveProfileConsent === true
          : caseDoc.consent?.caseConsent === true;

      if (!hasConsent) {
        enqueueAuditLog({
          actor: 'CITIZEN',
          action: 'CONSENT_GUARD_BLOCKED',
          caseId,
          userId: req.user?.id,
          payload: {
            scope,
            status: caseDoc.status,
            caseConsent: Boolean(caseDoc.consent?.caseConsent),
            saveProfileConsent: Boolean(caseDoc.consent?.saveProfileConsent),
          },
        });

        return res.status(403).json({
          error: 'CONSENT_REQUIRED',
          display: `गेट १ संमतीशिवाय "${scope}" ही कृती करता येत नाही.`,
          speech: 'तुमच्या संमतीशिवाय ही कृती केली जाणार नाही.',
          data: {
            caseId,
            scope,
            consentRequired: true,
          },
        });
      }

      req.caseDoc = caseDoc;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

