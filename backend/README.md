# `@nagarsathi/backend` — Express API Server, Citizen Auth, Privacy, Audit & 16-Step Case Engine

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
   - Records `GATE1_PERMISSIONS` (`canDo` / `cannotDo`).
   - If citizen answers `NO` (`given: false`), halts the flow (`CANCELLED`) and deletes the uncommitted case so nothing is saved.
   - Stores `"save profile for next time"` (`saveProfileConsent`) independently from `caseConsent`.
   - `requireConsent(scope)` guards `upload`, `fill`, `submit`, and `call` — returning `403 CONSENT_REQUIRED` plus an `AuditLog` entry when consent is missing.
3. **Gate 2 (Physical Approval) (`src/portalAdapter.js`, `src/routes/caseRoutes.js`)**:
   - `submitCaseToPortal()` throws `APPROVAL_REQUIRED` (`403`) unless `case.approval.given === true && case.approval.byPhysicalButton === true`.
   - Voice-only approval (`source: 'voice'` / `byPhysicalButton: false`) is never sufficient to transition to `APPROVED` or `SUBMITTED`.
4. **Portal Adapter & Retry x3 Wrapper (`src/portalAdapter.js`)**:
   - `InMemoryPortalAdapter` implements `fillDraft`, `submit` (returns `PEN-2026-88213`), and `getStatus` (Day-10 query, +21-day stall, failure injection).
   - `withPortalRetry` retries portal calls 3 times (`dobara koshish 1/3`, `2/3`, `3/3`) before returning a clear `503` message with the draft intact.
5. **Demo Time-Skip (`+21 din`) & Tracker Loopback (`src/routes/caseRoutes.js`)**:
   - `POST /demo/skip-days` (behind `DEMO_MODE` env flag) advances 21 days and triggers `STALLED` (`7 din se ruka hai`).
   - After simulated office call (`REF-5521`) or query document resubmission, sets `nextCheckAt` (+3 days) and loops back to `TRACKING` until approved (`CLOSED`).
