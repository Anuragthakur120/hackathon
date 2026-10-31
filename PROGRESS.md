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

### Verification Checklist (B3)
- [x] **All B3 checks & push**: PASS (`70f1fe2`, tag `B3-passed`)

---

## Module B4: Backend Agent Routes + Connect Frontend

### What Was Built
- **Thin `/models` Agent Adapter (`backend/src/agentAdapter.js`)**:
  - Implements deterministic multilingual stubs (`mr-IN`, `hi-IN`, `en-IN`) returning `{ display, speech, data }` for `intake`, `documents`, `portal`, `tracker`, `caller`, and `letter`, ready to delegate to `/models`.
  - Enforces `requireValidLanguage` on every call (`400 LANGUAGE_REQUIRED` if missing or invalid) and masks PII via `maskForLlm`.
- **Backend Agent Routes (`backend/src/routes/agentRoutes.js`)**:
  - Mounts `POST /agents/intake`, `POST /agents/documents`, `POST /agents/portal`, `POST /agents/tracker`, `POST /agents/caller`, and `POST /agents/letter` (under `/` and `/api/agents/*`) guarded by `requireLanguageMiddleware` and integrated with database `Case` state transitions.
- **Frontend Real API Client (`frontend/src/api/realApi.js`, `frontend/src/api/index.js`)**:
  - Implements all 24 methods matching `mockApi.js` signatures, switchable via `VITE_API_MODE=real` (`setApiModeOverride('real')`), handling `httpOnly` cookies/CORS (`credentials: 'include'`), loading/error state observables (`getRealApiNetworkState`, `subscribeRealApiNetworkState`), and chosen language headers/payloads.

### Verification Checklist (B4)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS
- [x] **Regression + B4 backend & full-stack frontend tests (`npm run test`)**: PASS (23 frontend + 17 backend + 5 database = 45/45 tests passed)
- [x] **Build validation (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
