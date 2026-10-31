# @nagarsathi/frontend

Voice-first, multilingual (`mr-IN`, `hi-IN`, `en-IN`) React + Vite frontend for NagarSathi (CITY-02).

## Module F1 & F2 Features
- **Vite + React + React Router**: Mobile-first, high-contrast accessible shell (`min-height: 56px` touch targets, `min-height: 92px` language picker buttons) with `/api` and `/socket.io` dev proxy to `http://localhost:5000`.
- **i18n (`src/i18n/{mr,hi,en}.json`)**: Full Marathi (`mr-IN`, default), Hindi (`hi-IN`), and English (`en-IN`) dictionaries with 100% key parity.
- **Screen 1 (`LanguagePickerScreen.jsx`)**: Three huge native-script buttons (`मराठी`, `हिंदी`, `English`) that persist the chosen language (`localStorage`) and pass it to every screen and API call.
- **Screen 2 — Conversation & Intake**: Mic hero placeholder, text input fallback, message bubbles with display text and speaker button (`🔊`), clarifying question (`"Kaunsi pension?"`) with two big answer buttons, service confirmation (`"Aapko pension chalu karwani hai, sahi?"`), and retry-once + `Madad Kendra` fallback for unknown/low-confidence requests.
- **Screen 3 — Gate 1 Consent + Separate Profile-Save Prompt**: Distinct Gate 1 styling, explicit lists of what the agent CAN and CANNOT do, big Agree (`✓`) / Decline (`✗`) buttons (NO halts flow with nothing saved), followed by the separate profile-save question (`"Agli baar ke liye data save karun?"`) explaining 30-day case deletion vs. persistent profile.
- **Screen 4 — Documents Checklist & Camera Loop**: Ticked checklist, camera input (`capture="environment"`), and bad-document loop (`"Photo dhundhli hai, dobara"` -> `"Life certificate purana hai"` -> `DOCS_READY`).
- **Screen 5 — Draft Form Summary & Gate 2 Approval**: Shows `DRAFT ONLY` badge, field-by-field source tags (`PROFILE`, `DOCUMENT`, `ASK_CITIZEN`, `DERIVED`, `DEFAULT`, `PORTAL_GENERATED`), masked Aadhaar/phone/bank account (`XXXX-XXXX-4821`, `XXXXXX3210`, `XXXXXXXX9012`), and Gate 2 (`"Submit karo"` / `"Badlo"` where NO halts submission).
- **Screen 10 — Submitted Screen**: Displays official Application ID (`PEN-2026-88213`) in large high-contrast typography.
