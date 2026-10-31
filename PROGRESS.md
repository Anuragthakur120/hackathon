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

### What Was Built
- **Accessibility Hardening (`AppLayout.jsx`, `WorkflowShellScreen.jsx`, `styles.css`, `i18n/{mr,hi,en}.json`)**:
  - Added keyboard skip-to-main link (`#ns-main-content`) with visible high-contrast focus styling.
  - Added localized `aria-label` attributes in Marathi (`mr-IN`), Hindi (`hi-IN`), and English (`en-IN`) across landmarks, navigation, progress bars, voice guide banner, persona card, and interactive controls.
  - Enforced touch targets `>= 56px` across all buttons (`button.ns-btn`).
- **i18n Key Parity Test (`f5.test.jsx`)**:
  - Automated test that fails if any key is missing or empty in `mr.json`, `hi.json`, or `en.json`.
- **API Mode Switch & Real API Stub Parity (`api/index.js`, `api/realApi.js`)**:
  - Added `selectApi(mode)` and `getApiMode(mode)` helpers and aligned every method name and parameter signature in `realApi.js` with `mockApi.js`.
  - Added an automated source scan in `f5.test.jsx` verifying zero hardcoded secrets in `/frontend/src`.
- **360px Mobile & 1280px Desktop Verification + All 5 Failure Paths (`f5.test.jsx`)**:
  - Verified full 16-step mock demo plus all 5 failure paths (`consent NO`, `approval NO`, `portal fail x3`, `voice fail`, `unknown service` -> Madad Kendra) at both `360px` and `1280px` viewport widths.
- **Documentation (`frontend/README.md`)**:
  - Documented how to run, environment variables, Marathi (`mr-IN`) voice test instructions on Android Chrome and laptop Chrome, and the exact table of fixed sentences requiring `.mp3` recordings (`welcome`, `consent`, `approval`).

### Verification Checklist (F5)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src --max-warnings=0`)
- [x] **Regression + F5 unit & E2E tests (`npm run test`)**: PASS (22/22 tests across `f1.test.jsx`, `f2.test.jsx`, `f3.test.jsx`, `f4.test.jsx`, and `f5.test.jsx`)
- [x] **Production build (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
- [x] **UI smoke check & 360px + 1280px screenshots**: PASS
