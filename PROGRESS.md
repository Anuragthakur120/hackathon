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

### Verification Checklist (B2)
- [x] **All B2 checks & push**: PASS (`4fba5ea`, tag `B2-passed`)

---

## Module B3: Mock Portal Website + Playwright Portal Robot

### What Was Built
- **Server-Rendered Mock Government Portal (`backend/mock-portal/app.js`, `backend/mock-portal/server.js`)**:
  - Standalone Express app (`PORTAL_PORT=4000`) serving server-rendered HTML for login (`/portal/login`), dashboard (`/portal`), and the 3 service applications matching D1 catalog selectors:
    - Pension (`/portal/pension/apply`: 3 pages + file uploads + review + `#chk-confirm-declaration` + `#btn-submit-pension-application`).
    - Scholarship (`/portal/scholarship/apply`: 1 sectioned page with all 14 fields + 5 uploads + `#btn-submit-scholarship-application`).
    - Ration Card (`/portal/ration-card/apply`: 1 page with all 11 fields + 3 uploads + `#btn-submit-ration-application`).
  - Status page (`/portal/status/:appId`) and `DEMO_MODE=true` admin endpoints (`/portal/admin/advance-clock`, `/portal/admin/status`, `/portal/admin/raise-query`, `/portal/admin/approve`, `/portal/admin/set-fail`, `/portal/admin/reset`).
- **Playwright Portal Robot (`backend/src/portal-agent/robot.js`)**:
  - Implements the B2 Portal Adapter interface (`fillDraft`, `submit`, `getStatus`), supports `HEADED` env switch, reads selectors from D1 catalogs, fills all pages as a DRAFT (`FORM_FILLED`), and writes step screenshots into `backend/storage/screenshots/` (gitignored).
  - Types values from the database by code; never sends values or secrets to logs, screenshot filenames, or LLM selector fallback payloads (which receive only `screenshotPath` and `fieldKeys`).
  - Enforces fresh Gate 2 approval on `submit()` (`approval.given === true && approval.at >= draftUpdatedAt`), invalidating approval whenever the draft is edited after approval (`PATCH /cases/:caseId/draft`), and reads the Application ID from `#application-id-result`.

### Verification Checklist (B3)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src mock-portal --max-warnings=0`)
- [x] **Regression (F1–F5, D1, B1, B2) + B3 unit/portal tests (`npm run test`)**: PASS (22 frontend + 5 database + 14 backend = 41/41 tests passed)
- [x] **Build validation (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
