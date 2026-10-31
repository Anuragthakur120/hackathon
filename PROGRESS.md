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
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS
- [x] **Models evals in 3 languages (`npm run evals --workspace=@nagarsathi/models`)**: PASS (18/18 passed)
- [x] **All unit & integration tests (`npm run test`)**: PASS (23 frontend + 17 backend + 10 models + 5 database = 55/55 tests passed)
- [x] **Build validation (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
