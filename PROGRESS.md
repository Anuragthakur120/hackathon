# NagarSathi (CITY-02) — Progress Log

This file tracks module-by-module progress, verification checklists, architectural decisions, and known limitations.

---

## Module M0: Repo Setup

### What Was Built
- Created the 4 top-level npm workspace packages:
  - `/frontend` (`@nagarsathi/frontend`) with `README.md` and `package.json`
  - `/backend` (`@nagarsathi/backend`) with `README.md` and `package.json`
  - `/models` (`@nagarsathi/models`) with `README.md` and `package.json`
  - `/database` (`@nagarsathi/database`) with `README.md` and `package.json`
- Created root files (`README.md`, `.gitignore`, `.env.example`, `package.json`, `package-lock.json`, `PROGRESS.md`, and `scripts/`).

### Verification Checklist (M0)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS
- [x] **Test all workspaces (`npm run test`)**: PASS
- [x] **Build all workspaces (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
- [x] **Folder tree compliance**: PASS
- [x] **`.env` ignored by `.gitignore` while `.env.example` is tracked**: PASS
- [x] **`scripts/check-and-push.sh M0` execution & remote HEAD verification**: PASS (`6b0de58`)

---

## Module F1: Frontend Shell + Language + Mock Layer

### What Was Built
- **Vite + React + React Router (`/frontend`)**:
  - Configured `frontend/vite.config.js` with `/api` and `/socket.io` proxy to `http://localhost:5000` so `httpOnly` session cookies work seamlessly.
  - Built accessible, high-contrast mobile-first styles (`frontend/src/styles.css`) with `min-height: 56px` touch targets and `min-height: 92px` language picker buttons.
- **Multilingual i18n (`frontend/src/i18n/{mr,hi,en}.json`)**:
  - Full Marathi (`mr-IN`, default), Hindi (`hi-IN`), and English (`en-IN`) dictionaries with 100% key parity verified by unit test.
- **Screen 1 — Language Picker (`frontend/src/screens/LanguagePickerScreen.jsx`)**:
  - Three large native-script buttons (`मराठी`, `हिंदी`, `English`).
  - Stores chosen language in `localStorage` (`nagarsathi_lang`) and React context (`AppContext.jsx`), updating `<html lang>` and passing language into every mock/real API call.
- **API Contract & Mock Layer (`frontend/src/api/CONTRACT.md`, `mockApi.js`, `realApi.js`, `index.js`)**:
  - Documented full REST contract (auth OTP/verify, cases, answer, confirm-service, consent, documents, fill-draft, approve, submit, case status, call start/turn/end, profile get/patch/delete, delete-all-my-data, letter explain, demo skip-days/raise-query/approve/reset).
  - Every `mockApi` method returns `{ display, speech, data }` in the active language, masks Aadhaar (`XXXX-XXXX-4821`) and bank account (`XXXXXXXX9012`), returns `PEN-2026-88213` on submit, and `REF-5521` on office call completion.
- **Client-Side Case State Machine (`frontend/src/state/caseMachine.js`)**:
  - Implements all statuses (`INTAKE`, `SERVICE_CONFIRMED`, `CONSENTED`, `DOCS_COLLECTING`, `DOCS_READY`, `FORM_FILLED`, `APPROVED`, `SUBMITTED`, `TRACKING`, `QUERY_RAISED`, `STALLED`, `CALLED`, `CLOSED`).
  - **Hard Safety Guard**: Refuses transition to `SUBMITTED` (`APPROVAL_REQUIRED` / `HARD_SAFETY_GUARD`) unless `approval.given === true`.
- **App Layout (`frontend/src/components/AppLayout.jsx` & `ErrorBoundary.jsx`)**:
  - Header with language switcher, 3-phase progress indicator (`Samajhna` / `Karna` / `Peecha karna`), error boundary, and persistent footer `"Prototype. Mock portal. Demo data only."`.

### Verification Checklist (F1)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS
- [x] **Unit & component tests (`npm run test`)**: PASS (5/5 tests in `f1.test.jsx`, including hard safety guard blocking submit without approval and i18n parity)
- [x] **Production build (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
- [x] **UI smoke check & screenshot evidence**: PASS

### Architectural Decisions & Notes
- Selected React Context (`AppContext.jsx`) for zero-boilerplate state management paired with pure state transitions in `caseMachine.js`.
- Enforced the approval guard at both the pure state machine level (`canTransition` / `transitionCaseState`) and `mockApi.submitApplication`.

### Known Limitations
- Voice STT/TTS and microphone controls are intentionally excluded in F1 per module rules and will be added in F2.
