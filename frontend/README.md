# @nagarsathi/frontend

Voice-first, multilingual (`mr-IN`, `hi-IN`, `en-IN`) React + Vite frontend for NagarSathi (CITY-02).

## Module F1 Features
- **Vite + React + React Router**: Mobile-first, high-contrast accessible shell (`min-height: 56px` touch targets, `min-height: 92px` language picker buttons) with `/api` and `/socket.io` dev proxy to `http://localhost:5000`.
- **i18n (`src/i18n/{mr,hi,en}.json`)**: Full Marathi (`mr-IN`, default), Hindi (`hi-IN`), and English (`en-IN`) dictionaries with 100% key parity.
- **Screen 1 (`LanguagePickerScreen.jsx`)**: Three huge native-script buttons (`मराठी`, `हिंदी`, `English`) that persist the chosen language (`localStorage`) and pass it to every screen and API call.
- **Mock & Real API Layer (`src/api/`)**: Implements `CONTRACT.md` with `{ display, speech, data }` envelopes, `PEN-2026-88213` submission ID, `REF-5521` call reference, and masked PII (`XXXX-XXXX-4821`, `XXXXXXXX9012`).
- **Client-Side Case State Machine (`src/state/caseMachine.js`)**: Enforces the 16-step case lifecycle and blocks transition to `SUBMITTED` unless `approval.given === true`.
- **App Layout**: Header language switcher, 3-phase progress indicator (`Samajhna` / `Karna` / `Peecha karna`), error boundary, and persistent footer `"Prototype. Mock portal. Demo data only."`.
