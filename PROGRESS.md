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

### Verification Checklist (B4)
- [x] **All B4 checks & push**: PASS (`7311030`, tag `B4-passed`)

---

## Module A1: Models (Claude Agents, Unified Wrapper, Redaction, Caller Guard & Evals)

### What Was Built
- **Six Agent Prompts (`models/prompts/*.md`)**:
  - Created `intake.md`, `documents.md`, `portal.md`, `tracker.md`, `caller.md`, and `letter.md` enforcing multilingual (`mr-IN`, `hi-IN`, `en-IN`) JSON responses (`{ display, speech, data }`), spoken-sentence rules (10–12 words per sentence, digit-by-digit IDs, zero symbols/URLs), and strict privacy rules.
- **Unified Claude Wrapper (`models/src/claudeWrapper.js`)**:
  - Uses `CLAUDE_MODEL` (default `claude-sonnet-5-5`) and `CLAUDE_MODEL_FAST` (default `claude-haiku-5-5` for live caller turns) with `ANTHROPIC_API_KEY`.
  - Redacts all incoming payloads via `redactPayload()` before constructing prompts, enforces JSON schema validation, retries once on invalid JSON, enforces request timeouts, and falls back gracefully on API error.
  - Supports deterministic offline fixtures when `MOCK_AI=true` (`models/src/mockFixtures.js`).
- **Security & Speech Guards (`models/src/redact.js`, `models/src/guards.js`)**:
  - `redact()` masks Aadhaar, phone, bank account, IFSC, and OTP sequences before any LLM call.
  - `validateSpeechField()` verifies sentence length, absence of symbols/URLs, and language script alignment.
  - `guardCallOutput()` blocks and logs any Aadhaar, OTP, password, or bank account number in Caller turns (even when prompted by an adversarial officer).
  - `verifyCatalogServiceId()` ensures only valid catalog service IDs (`pension`, `scholarship`, `ration_card`) are returned, converting unknown IDs to `"unknown"`.
- **Multilingual Evals (`models/evals/dataset.js`, `models/evals/run-evals.js`) & Backend Wiring (`backend/src/agentAdapter.js`)**:
  - 18 eval scenarios (6 agents x 3 languages) passing 100% under `MOCK_AI=true`.
  - Connected `backend/src/agentAdapter.js` directly to `@nagarsathi/models`.

### Verification Checklist (A1)
- [x] **All A1 checks & push**: PASS (`cd57eda`, tag `A1-passed`)

---

## Module I1: End-to-End Integration (All 4 Folders)

### What Was Built
- **Complete 16-Step Marathi (`mr-IN`) E2E Integration (`backend/src/test/i1.e2e.test.js`)**:
  - Connects `@nagarsathi/frontend`, `@nagarsathi/backend`, `@nagarsathi/models`, `@nagarsathi/database`, and `PlaywrightPortalRobot` (supporting `HEADED=true` visible browser form filling) across all 16 steps for Ramabai Kulkarni (`PEN-2026-88213`, Day-10 query `life certificate purana hai`, `+21 din` stall `7 din se ruka hai`, simulated office call `REF-5521`, loop back to `TRACKING`, and `CLOSED`: `Pension phir chalu ho gayi`).
- **Second-Service Scholarship Auto-Fill (`~80%` = `11/14` fields) & Exact Missing Questions Assertion**:
  - Added `/services/:serviceId/autofill-preview` in `backend/src/routes/coreRoutes.js` and camelCase profile mapping in `database/src/autofill.js`.
  - Verifies that after Ramabai's Pension journey with `saveProfileConsent: true`, 11 of 14 Scholarship fields (`78.6%`) are auto-filled from `Profile` + `VaultDoc` and ONLY the exact 3 genuinely new questions `['course_name', 'institute_name', 'previous_year_marks_pct']` are asked.
- **All Failure Paths & Safety Invariants Verified**:
  - Consent NO (halts & deletes uncommitted case), Approval NO / Voice-Only / Draft Edit after approval (invalidates approval, blocks `submit()`), Portal fail x3 (`503 PORTAL_FAILED_AFTER_3_RETRIES` with `draftSafe: true`), Voice fail fallback to text box, Unknown service -> retry once -> Madad Kendra, Bad document loop (blurry + expired -> fresh), and Caller guard (`guardCallOutput`) blocking adversarial officer prompts.
- **Seeded Demo Reset (`npm run demo:reset`) & Standalone E2E Runner (`npm run test:e2e`)**:
  - Added `scripts/demo-reset.mjs` and `scripts/run-e2e.mjs`.

### Verification Checklist (I1)
- [x] **Seeded demo reset (`npm run demo:reset`)**: PASS
- [x] **End-to-end test suite (`npm run test:e2e` & `HEADED=true`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS
- [x] **All unit & integration tests (`npm run test`)**: PASS (23 frontend + 19 backend + 5 models + 5 database = 52/52 tests passed)
- [x] **Build validation (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
