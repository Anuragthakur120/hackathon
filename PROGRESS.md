# NagarSathi (CITY-02) — Progress Log

This file tracks module-by-module progress, verification checklists, architectural decisions, and known limitations.

---

## Module M0: Repo Setup

### What Was Built
- Created the 4 top-level npm workspace packages (`/frontend`, `/backend`, `/models`, `/database`) and root workspace setup (`README.md`, `.gitignore`, `.env.example`, `package.json`, `package-lock.json`, `PROGRESS.md`, `scripts/`).

### Verification Checklist (M0)
- [x] **All M0 checks & push**: PASS (`6b0de58`, tag `M0-passed`)

---

## Module F1: Frontend Shell + Language + Mock Layer

### What Was Built
- Vite + React + React Router mobile-first shell, `mr-IN`/`hi-IN`/`en-IN` i18n dictionaries, `LanguagePickerScreen`, `CONTRACT.md`, `mockApi.js`, `realApi.js`, `caseMachine.js` with `SUBMITTED` approval guard, `AppLayout`, and `ErrorBoundary`.

### Verification Checklist (F1)
- [x] **All F1 checks, UI screenshot & push**: PASS (`87b445b`, tag `F1-passed`)

---

## Module F2: Core Journey Screens (Steps 1–10, No Voice)

### What Was Built
- **Screen 2 — Conversation & Intake (`WorkflowShellScreen.jsx`)**:
  - Big mic button placeholder (wired in F3), text box fallback, and message bubbles showing `display` text with a speaker (`🔊`) button on every message.
  - Intake flow: `"Meri pension band ho gayi"` triggers clarifying question (`"Kaunsi pension?"`) with two big answer buttons (`Old-Age Pension` / `Widow-Disability Pension`), followed by Citizen Confirm (`"Aapko pension chalu karwani hai, sahi?"`) with big Yes/No buttons -> `SERVICE_CONFIRMED`.
  - Unknown service / low confidence path: asks citizen to clarify once, then displays the **Madad Kendra** help card.
- **Screen 3 — Consent Screen = Gate 1 (`SERVICE_CONFIRMED` -> `CONSENTED` or Halted)**:
  - Distinct Gate 1 styling (`--ns-gate1-bg`, `--ns-gate1-border`) with clear lists of what NagarSathi **CAN DO** (fill draft, track case, call office) and **CANNOT DO** (submit without approval, pay money, share data).
  - Big Green Tick (`✓` Agree) and Red Cross (`✗` No). Clicking NO stops the flow immediately with nothing saved.
  - Separate post-consent question (`"Agli baar ke liye data save karun?"`) explaining 30-day automatic case deletion vs. user-controlled saved profile.
- **Screen 4 — Documents Checklist & Bad-Document Loop (`DOCS_COLLECTING` -> `DOCS_READY`)**:
  - Ticked checklist with masked values, `<input type="file" accept="image/*" capture="environment" />` (`"Photo kheencho"`), and bad-document loop (`"Photo dhundhli hai, dobara"` -> `"Life certificate purana hai"` -> `DOCS_READY`).
- **Screen 5 — Draft Form Summary & Gate 2 (`FORM_FILLED` -> `APPROVED` -> `SUBMITTED` or Halted)**:
  - Displays `DRAFT ONLY` badge and all 6 field source tags (`PROFILE`, `DOCUMENT`, `ASK_CITIZEN`, `DERIVED`, `DEFAULT`, `PORTAL_GENERATED`) with masked Aadhaar (`XXXX-XXXX-4821`), phone (`XXXXXX3210`), and bank account (`XXXXXXXX9012`).
  - Distinct Gate 2 approval box (`"Submit karo"` / `"Badlo"`). Clicking NO halts submission with nothing submitted.
- **Screen 10 — Submitted Screen (`SUBMITTED`)**:
  - Displays official Application ID `PEN-2026-88213` prominently.
- **Status Chip & Human-Control Labels**:
  - Every step shows the current status chip and human-control badge (`Citizen Confirm`, `Gate 1: Consent`, `Gate 2: Final Approval`).

### Verification Checklist (F2)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src --max-warnings=0`)
- [x] **Regression + F2 unit & component tests (`npm run test`)**: PASS (9/9 tests across `f1.test.jsx` and `f2.test.jsx`)
- [x] **Production build (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
- [x] **UI smoke check & screenshot evidence**: PASS

### Architectural Decisions & Notes
- Kept all F2 journey state self-contained in `WorkflowShellScreen.jsx` + `mockApi.js` while preserving the developer quick-action bar so both guided citizen flows and direct state jumps work seamlessly.

### Known Limitations
- Microphone STT and speaker TTS playback buttons are placeholders in F2 and will be wired to Web Speech API in F3.
