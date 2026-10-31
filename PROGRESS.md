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

### Verification Checklist (B1)
- [x] **All B1 checks & push**: PASS (`90bf34e`, tag `B1-passed`)

---

## Module B2: Backend Case State Machine, Guards & Mock Portal

### What Was Built
- **16-Step Case State Machine (`backend/src/caseMachine.js`)**:
  - Enforces legal transitions across `INTAKE -> SERVICE_CONFIRMED -> CONSENTED -> DOCS_COLLECTING -> DOCS_READY -> FORM_FILLED -> APPROVED -> SUBMITTED -> TRACKING -> QUERY_RAISED -> STALLED -> CALLED -> TRACKING -> CLOSED`.
  - Rejects illegal transitions (`409 ILLEGAL_CASE_TRANSITION`) and logs an `AuditLog` entry on every transition.
- **Gate 1 (Consent) & `requireConsent(scope)` Middleware (`backend/src/consentMiddleware.js`, `backend/src/routes/caseRoutes.js`)**:
  - Records `GATE1_PERMISSIONS` (`canDo` / `cannotDo`).
  - Consent `NO` halts the flow and deletes the uncommitted case so nothing is saved.
  - Separate `saveProfileConsent` stored independently from `caseConsent`.
  - `requireConsent(scope)` blocks `upload`, `fill`, `submit`, and `call` with `403 CONSENT_REQUIRED` + audit entry when consent is missing.
- **Gate 2 (Approval) & Portal Adapter + Retry x3 (`backend/src/portalAdapter.js`, `backend/src/routes/caseRoutes.js`)**:
  - `submitCaseToPortal()` throws `APPROVAL_REQUIRED` unless `case.approval.given === true && case.approval.byPhysicalButton === true` (voice-only approval is never enough).
  - `InMemoryPortalAdapter` implements `fillDraft`, `submit` (`PEN-2026-88213`), and `getStatus` (Day-10 query, +21-day stall, failure injection) wrapped in `withPortalRetry` (3 retries: `dobara koshish 1/3`, `2/3`, `3/3`).
  - Time-skip endpoint (`POST /demo/skip-days` behind `DEMO_MODE` env flag) advances +21 days to trigger `STALLED`, and tracker scheduling sets `nextCheckAt` (+3 days) and loops back to `TRACKING` until `CLOSED`.

### Verification Checklist (B2)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src --max-warnings=0`)
- [x] **Regression (F1–F5, D1, B1) + B2 unit/API tests (`npm run test`)**: PASS (22 frontend + 5 database + 9 backend = 36/36 tests passed)
- [x] **Build validation (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
