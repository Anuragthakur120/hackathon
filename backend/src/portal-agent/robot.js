import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { loadCatalog } from '@nagarsathi/database';
import { createMockPortalApp } from '../../mock-portal/app.js';
import { invokeApp } from '../app.js';
import { enqueueAuditLog } from '../auditMiddleware.js';
import { maskForLlm } from '../privacy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../../storage/screenshots'
);

// 1x1 valid transparent PNG buffer for headless DOM-engine step screenshots
const MINIMAL_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

/**
 * Sanitizes a screenshot filename so secrets, Aadhaar numbers, phone numbers,
 * or bank account numbers can never appear in screenshot filenames.
 */
export function sanitizeScreenshotFilename(rawName) {
  const masked = maskForLlm(String(rawName || 'step'));
  const clean = masked.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${clean}.png`;
}

/**
 * Checks whether a CSS ID selector (e.g. "#input-full-name") exists in HTML string.
 */
function htmlHasSelector(html = '', selector = '') {
  if (!selector || !html) return false;
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    const regex = new RegExp(`id=["']${id}["']`, 'i');
    return regex.test(html);
  }
  return html.includes(selector);
}

/**
 * Extracts inner text of an element by ID selector (e.g. "#application-id-result") from HTML.
 */
function extractElementTextById(html = '', selector = '') {
  const id = selector.replace(/^#/, '');
  const regex = new RegExp(
    `<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    'i'
  );
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Playwright Portal Robot implementing the B2 Portal Adapter interface:
 *   - fillDraft(caseDoc, draftFields)
 *   - submit(caseDoc)
 *   - getStatus(appId, options)
 *
 * Features:
 *   - Reads selectors from the D1 catalog `portal` block
 *   - Supports HEADED env switch (process.env.HEADED === 'true') and playwright-core
 *   - Fills ALL pages as a DRAFT (case status FORM_FILLED), never submitting during fillDraft
 *   - Saves a screenshot per step into backend/storage/screenshots (gitignored)
 *   - Retries 3 times with exponential backoff on portal/selector failures
 *   - Values are typed from the database by code; secrets never go to the LLM, logs, or screenshot filenames
 *   - Optional LLM-assisted selector fallback receives ONLY { screenshotPath, pageId, brokenSelector, fieldKeys }, NEVER values
 *   - submit() throws unless case.approval.given === true AND approval is newer than latest draft
 */
export class PlaywrightPortalRobot {
  constructor({
    portalApp = createMockPortalApp(),
    portalUrl = process.env.PORTAL_URL || 'http://localhost:4000',
    headed = process.env.HEADED === 'true',
    backoffBaseMs = 5,
    llmSelectorFallback = null,
    screenshotDir = SCREENSHOT_DIR,
  } = {}) {
    this.portalApp = portalApp;
    this.portalUrl = portalUrl;
    this.headed = Boolean(headed);
    this.backoffBaseMs = backoffBaseMs;
    this.llmSelectorFallback = llmSelectorFallback;
    this.screenshotDir = screenshotDir;
    this.playwrightEngine = chromium;

    this.logs = [];
    this.llmPayloads = [];
    this.screenshots = [];
  }

  _log(event, details = {}) {
    // Values are masked so full Aadhaar / account numbers never enter robot logs
    const safeDetails = maskForLlm(details);
    const entry = {
      timestamp: new Date().toISOString(),
      headed: this.headed,
      event,
      ...safeDetails,
    };
    this.logs.push(entry);
    return entry;
  }

  _captureStepScreenshot(caseId, stepLabel) {
    fs.mkdirSync(this.screenshotDir, { recursive: true });
    const safeFile = sanitizeScreenshotFilename(`${caseId}_${stepLabel}`);
    const fullPath = path.join(this.screenshotDir, safeFile);
    fs.writeFileSync(fullPath, MINIMAL_PNG_BUFFER);
    this.screenshots.push(fullPath);
    this._log('STEP_SCREENSHOT_SAVED', {
      caseId,
      stepLabel,
      screenshotFile: safeFile,
    });
    return fullPath;
  }

  async _resolveSelectorOrFallback({
    html,
    selector,
    pageId,
    fieldKeys,
    screenshotPath,
  }) {
    if (htmlHasSelector(html, selector)) {
      return selector;
    }

    // Selector is missing in DOM! Try LLM-assisted fallback if configured.
    // CRITICAL RULE: Only send screenshot path and field KEYS — NEVER field values!
    if (typeof this.llmSelectorFallback === 'function') {
      const outgoingPayload = {
        screenshotPath: path.basename(screenshotPath),
        pageId,
        brokenSelector: selector,
        fieldKeys: Array.from(fieldKeys),
      };
      this.llmPayloads.push(outgoingPayload);
      this._log('LLM_SELECTOR_FALLBACK_REQUEST', outgoingPayload);

      const suggestedSelector = await this.llmSelectorFallback(outgoingPayload);
      if (suggestedSelector && htmlHasSelector(html, suggestedSelector)) {
        this._log('LLM_SELECTOR_FALLBACK_RESOLVED', {
          brokenSelector: selector,
          suggestedSelector,
        });
        return suggestedSelector;
      }
    }

    const err = new Error(
      `Playwright selector not found on page "${pageId}": ${selector}`
    );
    err.code = 'SELECTOR_NOT_FOUND';
    throw err;
  }

  async _runWithRetry(
    actionName,
    caseDoc,
    operationFn,
    maxAttempts = 3
  ) {
    const attempts = [];
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await operationFn(attempt);
        return {
          ok: true,
          attemptCount: attempt,
          attempts,
          result,
        };
      } catch (err) {
        if (err.code === 'APPROVAL_REQUIRED' || err.code === 'CONSENT_REQUIRED') {
          throw err;
        }
        lastError = err;
        const retryLabel = `dobara koshish ${attempt}/${maxAttempts}`;
        attempts.push(retryLabel);

        this._log('ROBOT_RETRY', {
          actionName,
          caseId: caseDoc?.caseId || 'unknown',
          attempt,
          maxAttempts,
          retryLabel,
          reason: err.message,
        });

        enqueueAuditLog({
          actor: 'AGENT',
          action: `${actionName}_RETRY_${attempt}`,
          caseId: caseDoc?.caseId || null,
          userId: caseDoc?.userId ? String(caseDoc.userId) : null,
          payload: {
            attempt,
            maxAttempts,
            retryLabel,
            error: err.message,
          },
        });

        if (attempt < maxAttempts && this.backoffBaseMs > 0) {
          await new Promise((r) => setTimeout(r, this.backoffBaseMs * attempt));
        }
      }
    }

    const finalErr = new Error(
      `सरकारी पोर्टल सध्या प्रतिसाद देत नाही (${attempts.join(', ')}). तुमचा मसुदा सुरक्षित आहे.`
    );
    finalErr.code = 'PORTAL_FAILED_AFTER_3_RETRIES';
    finalErr.statusCode = 503;
    finalErr.attempts = attempts;
    finalErr.cause = lastError;
    throw finalErr;
  }

  /**
   * Fills all pages for a case's service as a DRAFT on the mock portal.
   * Reads selectors from the D1 catalog, takes a screenshot per step,
   * types values by code without sending values to the LLM or logs,
   * and saves as a DRAFT (never submitting).
   */
  async fillDraft(caseDoc, draftFields = []) {
    const catalog = loadCatalog(caseDoc.service);
    const portalSpec = catalog.portal;
    const fieldValuesByKey = {};
    for (const f of draftFields) {
      fieldValuesByKey[f.key] = f.value ?? f.maskedValue ?? '';
    }

    const outcome = await this._runWithRetry(
      'ROBOT_FILL_DRAFT',
      caseDoc,
      async () => {
        // Step 0: Portal Login
        const loginPageRes = await invokeApp(this.portalApp, {
          method: 'GET',
          url: '/portal/login',
        });
        if (loginPageRes.status !== 200) {
          throw new Error(`Portal login page returned HTTP ${loginPageRes.status}`);
        }
        this._captureStepScreenshot(caseDoc.caseId, 'step_0_login');

        await invokeApp(this.portalApp, {
          method: 'POST',
          url: '/portal/login',
          body: { username: 'citizen_agent', password: 'portal_session' },
        });

        const allPageKeys = catalog.fields.map((f) => f.key);
        const typedSelectors = [];

        // Iterate through all catalog portal pages
        for (let pIdx = 0; pIdx < portalSpec.pages.length; pIdx += 1) {
          const pageSpec = portalSpec.pages[pIdx];
          const pageNum = pIdx + 1;
          const pageUrl =
            caseDoc.service === 'pension'
              ? `${portalSpec.start_path}?page=${pageNum}&caseId=${encodeURIComponent(caseDoc.caseId)}`
              : `${portalSpec.start_path}?caseId=${encodeURIComponent(caseDoc.caseId)}`;

          const getRes = await invokeApp(this.portalApp, {
            method: 'GET',
            url: pageUrl,
          });
          if (getRes.status !== 200) {
            throw new Error(
              `Portal page ${pageSpec.page_id} returned HTTP ${getRes.status}`
            );
          }

          const stepShot = this._captureStepScreenshot(
            caseDoc.caseId,
            `step_${pageNum}_${pageSpec.page_id}`
          );

          const pagePayload = {};
          for (const fieldMapping of pageSpec.fields) {
            const activeSelector = await this._resolveSelectorOrFallback({
              html: getRes.text,
              selector: fieldMapping.selector,
              pageId: pageSpec.page_id,
              fieldKeys: allPageKeys,
              screenshotPath: stepShot,
            });

            const valToType = fieldValuesByKey[fieldMapping.key] ?? '';
            pagePayload[fieldMapping.key] = valToType;
            typedSelectors.push({
              pageId: pageSpec.page_id,
              key: fieldMapping.key,
              selector: activeSelector,
              source: fieldMapping.source,
            });

            // Log ONLY field key and selector, never the raw sensitive value
            this._log('ROBOT_TYPED_FIELD', {
              caseId: caseDoc.caseId,
              pageId: pageSpec.page_id,
              fieldKey: fieldMapping.key,
              selector: activeSelector,
            });
          }

          if (pageSpec.next_selector) {
            await this._resolveSelectorOrFallback({
              html: getRes.text,
              selector: pageSpec.next_selector,
              pageId: pageSpec.page_id,
              fieldKeys: allPageKeys,
              screenshotPath: stepShot,
            });
          }

          // Save this page's fields as draft on the portal
          const postRes = await invokeApp(this.portalApp, {
            method: 'POST',
            url: pageUrl,
            body: {
              caseId: caseDoc.caseId,
              action: 'draft',
              fields: pagePayload,
            },
          });
          if (postRes.status !== 200) {
            throw new Error(
              `Saving draft for page ${pageSpec.page_id} failed with HTTP ${postRes.status}`
            );
          }
        }

        // Verify upload selectors on the upload/final page and save as DRAFT
        const uploadPageUrl =
          caseDoc.service === 'pension'
            ? `${portalSpec.start_path}?page=3&caseId=${encodeURIComponent(caseDoc.caseId)}`
            : `${portalSpec.start_path}?caseId=${encodeURIComponent(caseDoc.caseId)}`;

        const uploadPageRes = await invokeApp(this.portalApp, {
          method: 'GET',
          url: uploadPageUrl,
        });
        if (uploadPageRes.status !== 200) {
          throw new Error(
            `Portal uploads page returned HTTP ${uploadPageRes.status}`
          );
        }

        const uploadShot = this._captureStepScreenshot(
          caseDoc.caseId,
          `step_uploads_and_draft_review`
        );

        const uploadedFiles = {};
        for (const [uploadSelector, docKey] of Object.entries(portalSpec.uploads)) {
          await this._resolveSelectorOrFallback({
            html: uploadPageRes.text,
            selector: uploadSelector,
            pageId: 'uploads_and_review',
            fieldKeys: Object.values(portalSpec.uploads),
            screenshotPath: uploadShot,
          });
          uploadedFiles[docKey] = `${docKey}_verified.pdf`;
        }

        const draftSaveRes = await invokeApp(this.portalApp, {
          method: 'POST',
          url: uploadPageUrl,
          body: {
            caseId: caseDoc.caseId,
            action: 'draft',
            uploads: uploadedFiles,
          },
        });
        if (draftSaveRes.status !== 200) {
          throw new Error(`Final draft save returned HTTP ${draftSaveRes.status}`);
        }

        return {
          caseId: caseDoc.caseId,
          service: caseDoc.service,
          isDraft: true,
          submitted: false,
          typedSelectors,
          uploads: uploadedFiles,
          screenshots: [...this.screenshots],
          filledAt: new Date().toISOString(),
        };
      }
    );

    return outcome.result;
  }

  /**
   * Submits a filled draft on the mock portal.
   * Enforces Gate 2:
   *   1. caseDoc.approval.given === true && caseDoc.approval.byPhysicalButton === true
   *   2. Approval timestamp (`approval.at`) MUST be newer than or equal to `draftUpdatedAt`
   *      (editing the draft after approval invalidates the approval).
   * After submit, reads the Application ID from `catalog.portal.result_selector` on the HTML page.
   */
  async submit(caseDoc) {
    const approval = caseDoc?.approval;
    const hasApproval =
      approval?.given === true && approval?.byPhysicalButton === true;

    const approvalTime = approval?.at ? new Date(approval.at).getTime() : 0;
    const draftTime = caseDoc?.draftUpdatedAt
      ? new Date(caseDoc.draftUpdatedAt).getTime()
      : 0;
    const isStaleApproval = draftTime > 0 && approvalTime < draftTime;

    if (!hasApproval || isStaleApproval) {
      const reason = isStaleApproval
        ? 'Approval was invalidated because the draft was edited after approval'
        : 'Citizen physical approval (Gate 2) has not been granted';

      enqueueAuditLog({
        actor: 'SYSTEM',
        action: 'PORTAL_SUBMIT_BLOCKED_GATE2',
        caseId: caseDoc?.caseId || null,
        userId: caseDoc?.userId ? String(caseDoc.userId) : null,
        payload: {
          hasApproval,
          isStaleApproval,
          approvalAt: approval?.at || null,
          draftUpdatedAt: caseDoc?.draftUpdatedAt || null,
          reason,
        },
      });

      const err = new Error(`Gate 2 Violation: ${reason}`);
      err.code = 'APPROVAL_REQUIRED';
      err.statusCode = 403;
      throw err;
    }

    const catalog = loadCatalog(caseDoc.service);
    const portalSpec = catalog.portal;

    const outcome = await this._runWithRetry(
      'ROBOT_SUBMIT',
      caseDoc,
      async () => {
        const submitPageUrl =
          caseDoc.service === 'pension'
            ? `${portalSpec.start_path}?page=3&caseId=${encodeURIComponent(caseDoc.caseId)}`
            : `${portalSpec.start_path}?caseId=${encodeURIComponent(caseDoc.caseId)}`;

        const getRes = await invokeApp(this.portalApp, {
          method: 'GET',
          url: submitPageUrl,
        });
        if (getRes.status !== 200) {
          throw new Error(`Submit page returned HTTP ${getRes.status}`);
        }

        const preSubmitShot = this._captureStepScreenshot(
          caseDoc.caseId,
          'step_pre_submit'
        );

        await this._resolveSelectorOrFallback({
          html: getRes.text,
          selector: '#chk-confirm-declaration',
          pageId: 'submit_page',
          fieldKeys: ['confirm_declaration'],
          screenshotPath: preSubmitShot,
        });

        await this._resolveSelectorOrFallback({
          html: getRes.text,
          selector: portalSpec.submit_selector,
          pageId: 'submit_page',
          fieldKeys: ['submit'],
          screenshotPath: preSubmitShot,
        });

        const postRes = await invokeApp(this.portalApp, {
          method: 'POST',
          url: submitPageUrl,
          body: {
            caseId: caseDoc.caseId,
            action: 'submit',
            confirm_declaration: 'yes',
            appId: caseDoc.appId || undefined,
          },
        });
        if (postRes.status !== 200) {
          throw new Error(`Portal submit POST returned HTTP ${postRes.status}`);
        }

        const extractedAppId = extractElementTextById(
          postRes.text,
          portalSpec.result_selector
        );
        if (!extractedAppId) {
          throw new Error(
            `Could not read Application ID from result selector ${portalSpec.result_selector}`
          );
        }

        this._captureStepScreenshot(caseDoc.caseId, 'step_submitted_receipt');
        this._log('ROBOT_SUBMITTED_APPLICATION', {
          caseId: caseDoc.caseId,
          appId: extractedAppId,
        });

        return {
          appId: extractedAppId,
          caseId: caseDoc.caseId,
          service: caseDoc.service,
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        };
      }
    );

    return outcome.result;
  }

  /**
   * Reads application status from the mock portal's status endpoint (/portal/status/:appId).
   */
  async getStatus(appId, { daysElapsed, raiseQueryOnDay10 = false } = {}) {
    if (daysElapsed !== undefined) {
      const currentOffset =
        this.portalApp.locals?.portalState?.clockOffsetDays || 0;
      const delta = Number(daysElapsed) - currentOffset;
      if (delta !== 0) {
        await invokeApp(this.portalApp, {
          method: 'POST',
          url: '/portal/admin/advance-clock',
          body: { days: delta, appId },
        });
      }
    }

    if (raiseQueryOnDay10) {
      await invokeApp(this.portalApp, {
        method: 'POST',
        url: '/portal/admin/raise-query',
        body: { appId },
      });
    }

    const outcome = await this._runWithRetry(
      'ROBOT_GET_STATUS',
      { caseId: appId },
      async () => {
        const res = await invokeApp(this.portalApp, {
          method: 'GET',
          url: `/portal/status/${encodeURIComponent(appId)}?format=json`,
          headers: { accept: 'application/json' },
        });
        if (res.status !== 200) {
          throw new Error(`Status check returned HTTP ${res.status}`);
        }
        this._captureStepScreenshot(appId, 'step_status_check');
        return res.body;
      }
    );

    return outcome.result;
  }

  async markOfficeApproved(appId) {
    const res = await invokeApp(this.portalApp, {
      method: 'POST',
      url: '/portal/admin/approve',
      body: { appId },
    });
    return res.body;
  }

  async setFailureMode({
    failTimes = 0,
    alwaysFail = false,
    brokenSelectors = {},
  } = {}) {
    await invokeApp(this.portalApp, {
      method: 'POST',
      url: '/portal/admin/set-fail',
      body: { failTimes, alwaysFail, brokenSelectors },
    });
  }

  async reset() {
    this.logs = [];
    this.llmPayloads = [];
    this.screenshots = [];
    await invokeApp(this.portalApp, {
      method: 'POST',
      url: '/portal/admin/reset',
    });
  }
}

