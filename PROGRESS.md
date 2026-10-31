# NagarSathi (CITY-02) — Progress Log

This file tracks module-by-module progress, verification checklists, architectural decisions, and known limitations.

---

## Module M0: Repo Setup

### Verification Checklist (M0)
- [x] **All M0 checks & push**: PASS (`6b0de58`, tag `M0-passed`)

---

## Module F1: Frontend Shell + Language + Mock Layer

### Verification Checklist (F1)
- [x] **All F1 checks, UI screenshot & push**: PASS (`87b445b`, tag `F1-passed`)

---

## Module F2: Core Journey Screens (Steps 1–10, No Voice)

### Verification Checklist (F2)
- [x] **All F2 checks, UI screenshot & push**: PASS (`a058aba`, tag `F2-passed`)

---

## Module F3: Voice Assistant Layer

### Verification Checklist (F3)
- [x] **All F3 checks, UI screenshot & push**: PASS (`7164993`, tag `F3-passed`)

---

## Module F4: Tracking, Query, Time-Skip, Call, Help Centre & Letter Explainer UI (Steps 11–16)

### Verification Checklist (F4)
- [x] **All F4 checks, UI screenshot & push**: PASS (`1db4f8f`, tag `F4-passed`)

---

## Module F5: Frontend Final Check & Hardening

### Verification Checklist (F5)
- [x] **All F5 checks, UI screenshots & push**: PASS (`619ea57`, tag `F5-passed`)

---

## Module D1: Database (MongoDB + Mongoose, 3 Data Layers, Catalog JSONs, Auto-Fill & Seed)

### Verification Checklist (D1)
- [x] **All D1 checks & push**: PASS (`f3647d5`, tag `D1-passed`)

---

## Module B1: Backend Auth, Privacy & Base API

### What Was Built
- **Auth & Citizen Isolation (`backend/src/auth.js`, `backend/src/routes/coreRoutes.js`)**:
  - Phone + OTP login (`MOCK_OTP=123456` when `OTP_MODE=mock`), `HS256` JWT signed with `JWT_SECRET` in `httpOnly` cookie `ns_token`, `role=citizen`, and strict cross-user ownership checks (`403 CROSS_USER_ACCESS_DENIED`).
- **Privacy Helpers (`backend/src/privacy.js`)**:
  - Last-4 masking for Aadhaar (`XXXX-XXXX-4821`), phone (`XXXXXX3210`), and bank account (`XXXXXXXX9012`) in logs and API responses (`sanitizeForApiResponse`).
  - `AES-256-GCM` encryption (`encryptWithEnvKey` / `decryptWithEnvKey`), `maskForLlm` scrubber ensuring full Aadhaar/phone/bank numbers are never sent to the LLM, and masking request logger (`createRequestLogger`).
- **Background Audit Log Middleware (`backend/src/auditMiddleware.js`)**:
  - Non-blocking background `AuditLog` persistence (`enqueueAuditLog`, `auditLogMiddleware`, `flushPendingAudits`).
- **Core Routes & Middleware (`backend/src/routes/coreRoutes.js`, `backend/src/middleware.js`, `backend/src/app.js`)**:
  - `/auth`, `/profile` (with save-consent enforcement and `"delete-all-my-data"`), `/vault` (encrypted document upload), `/services` (validated catalogs), `/cases/:caseId`, and `/health`, plus CORS for `FRONTEND_ORIGIN`, rate limiting, and central error handling.

### Verification Checklist (B1)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src --max-warnings=0`)
- [x] **Regression (F1–F5, D1) + B1 unit/API tests (`npm run test`)**: PASS (22 frontend + 5 database + 4 backend = 31/31 tests passed)
- [x] **Build validation (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
