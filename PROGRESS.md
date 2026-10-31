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

### What Was Built
- **Screen (6) Status Tracking Timeline (`WorkflowShellScreen.jsx`)**:
  - 6-stage visual timeline (`SUBMITTED`, `TRACKING`, `QUERY_RAISED`, `STALLED`, `CALLED`, `CLOSED`) with large icons (`📤`, `🔍`, `❓`, `⏳`, `📞`, `✅`) and localized labels.
  - **Day-10 Query-Raised Toggle**: Simulates office query (`"Office ne ek sawal poocha"` / `"life certificate purana hai"`), lets the citizen capture/resubmit a renewed document via camera input, and loops back to `TRACKING`.
  - **`+21 din` Time-Skip Control**: Simulates 21 days elapsed and transitions to `STALLED` displaying `"7 din se ruka hai"`.
- **Screen (7) Simulated Office Call (`STALLED` -> `CALLED` -> `TRACKING` -> `CLOSED`)**:
  - Interactive Caller Agent vs. Office Officer screen where the judge can type or speak the officer's reply.
  - Extracts reference number `REF-5521`, displays `"3 din mein dekhenge, REF-5521"`, loops back to `TRACKING`, and transitions to `CLOSED` (`"Pension phir chalu ho gayi"`).
- **Screen (8) Help Centre ("Madad Kendra")**:
  - Simple step-by-step instructions, `"Sunao"` (`🔊`) button, and a big call button (`tel:1800111555`).
- **Letter Explainer UI ("Ye chitthi samjhao")**:
  - Camera capture input + button that calls `explainLetter`, renders the plain-language explanation, and speaks it aloud via `speak.js` and `"Sunao"`.
- **Failure UI & 360px Mobile Polish**:
  - Portal failure retry simulation showing `"dobara koshish 1/3"`, `"2/3"`, `"3/3"` followed by a clear spoken/displayed assurance that the draft is safe.
  - Responsive CSS media query (`@media (max-width: 420px)`) verified at `360px` viewport width.

### Verification Checklist (F4)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src --max-warnings=0`)
- [x] **Regression + F4 unit & component tests (`npm run test`)**: PASS (18/18 tests across `f1.test.jsx`, `f2.test.jsx`, `f3.test.jsx`, and `f4.test.jsx`)
- [x] **Production build (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
- [x] **UI smoke check & 360px mobile screenshot evidence**: PASS
