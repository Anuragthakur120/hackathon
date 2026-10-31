# `@nagarsathi/backend` — Express API Server, Citizen Auth, Privacy, Audit, Case Engine & Playwright Portal Robot

Node.js + Express backend for **NagarSathi (CITY-02)** integrated with `@nagarsathi/database`.

---

## 1. Module B1 Features (Auth, Privacy, Audit & Base API)

1. **Phone + OTP Auth & `httpOnly` JWT Cookie (`src/auth.js`, `src/routes/coreRoutes.js`)**:
   - `POST /auth/otp` & `POST /auth/verify`: Issues OTP (`MOCK_OTP=123456` when `OTP_MODE=mock`), sets `HS256` JWT in `httpOnly` cookie `ns_token` (`role: 'citizen'`), and enforces cross-user isolation (`403 CROSS_USER_ACCESS_DENIED`).
2. **Privacy & Encryption Helpers (`src/privacy.js`)**:
   - Last-4 masking (`XXXX-XXXX-4821`, `XXXXXX3210`, `XXXXXXXX9012`), `AES-256-GCM` encryption (`encryptWithEnvKey`/`decryptWithEnvKey`), `maskForLlm` scrubber, and masking request logger.
3. **Background Audit Log Middleware (`src/auditMiddleware.js`)**:
   - Non-blocking background `AuditLog` persistence (`enqueueAuditLog`, `auditLogMiddleware`, `flushPendingAudits`).

---

## 2. Module B2 Features (16-Step Case State Machine, Guards & Portal Adapter)

1. **16-Step Case State Machine (`src/caseMachine.js`)**:
   - Enforces legal transitions across `INTAKE -> CLARIFYING -> SERVICE_CONFIRMED -> CONSENTED -> DOCS_COLLECTING -> DOCS_READY -> FORM_FILLED -> APPROVED -> SUBMITTED -> TRACKING -> QUERY_RAISED -> STALLED -> CALLED -> TRACKING -> CLOSED`.
   - Rejects illegal transitions with HTTP `409 ILLEGAL_CASE_TRANSITION` and writes a background `AuditLog` entry on every transition.
2. **Gate 1 (Consent) & `requireConsent(scope)` Middleware (`src/consentMiddleware.js`, `src/routes/caseRoutes.js`)**:
   - Records `GATE1_PERMISSIONS` (`canDo` / `cannotDo`), halts and deletes uncommitted cases when Consent is `NO`, stores `saveProfileConsent` independently, and guards `upload`, `fill`, `submit`, and `call` with `403 CONSENT_REQUIRED` + audit entry.
3. **Gate 2 (Physical Approval) (`src/portalAdapter.js`, `src/routes/caseRoutes.js`)**:
   - `submitCaseToPortal()` throws `APPROVAL_REQUIRED` (`403`) unless `case.approval.given === true && case.approval.byPhysicalButton === true` and `approval.at >= draftUpdatedAt`.

---

## 3. Module B3 Features (Mock Government Portal + Playwright Portal Robot)

1. **Standalone Server-Rendered Mock Government Portal (`mock-portal/app.js`, `mock-portal/server.js`, `PORTAL_PORT=4000`)**:
   - Plain HTML forms (no React) matching D1 catalog selectors:
     - `/portal/login` and `/portal` dashboard
     - `/portal/pension/apply` (3 pages: applicant details, bank & life certificate, uploads & review)
     - `/portal/scholarship/apply` (1 sectioned page with all 14 fields + 5 document uploads)
     - `/portal/ration-card/apply` (1 page with all 11 fields + 3 document uploads)
     - Realistic dropdowns (`<select>`), mandatory confirm declaration checkbox (`#chk-confirm-declaration`), optional `?slow=1` delay, `#application-id-result` receipt (`PEN-`/`SCH-`/`RAT-2026-88213`), and `/portal/status/:appId`.
   - Admin endpoints (behind `DEMO_MODE=true`): `/portal/admin/advance-clock`, `/portal/admin/status` (`Pending -> Under review -> Query raised -> Approved`), `/portal/admin/raise-query`, `/portal/admin/approve`, `/portal/admin/set-fail`, and `/portal/admin/reset`.
2. **Playwright Portal Robot (`src/portal-agent/robot.js`)**:
   - Implements the B2 Portal Adapter interface (`fillDraft`, `submit`, `getStatus`), supports `HEADED=true`, reads selectors from the D1 catalog, fills all pages as a **DRAFT** (`FORM_FILLED`), and writes step screenshots into `backend/storage/screenshots/` (gitignored) with sanitized filenames.
   - Types values from the database by code; secrets never enter logs, screenshot filenames, or LLM payloads.
   - Missing selector fallback (`llmSelectorFallback`) sends **only** screenshot filename and field `KEYS` (never values).
   - Retries 3 times with backoff (`dobara koshish 1/3 -> 3/3`) on selector/portal failures.
   - Invalidates Gate 2 approval whenever the draft is edited after approval (`PATCH /cases/:caseId/draft` or `draftUpdatedAt > approval.at`).
