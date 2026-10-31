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

### What Was Built
- **TTS Engine & Sentence Splitter (`frontend/src/voice/speak.js`)**:
  - Splits utterances on sentence boundaries (`/(?<=[.?!।])\s+/`) so Chrome never halts mid-paragraph.
  - Implements voice selection fallback order: exact match (`mr-IN`) -> prefix match (`mr`) -> Hindi fallback (`hi-IN`) -> `null`.
  - Formats speech output (strips symbols/URLs, spells out alphanumeric IDs digit by digit like `PEN-2026-88213`).
  - Supports pre-recorded `.mp3` slots (`/audio/{lang}/{welcome,consent,approval}.mp3`) with live Web Speech TTS fallback (`playFixedAudioOrSpeak`), documented in `frontend/public/audio/README.md` and `frontend/README.md`.
- **Echo-Guarded Voice Hook (`frontend/src/voice/useVoice.js`) & Command Matcher (`frontend/src/voice/commands.js`)**:
  - Automatic voice guide (`"Apne aap bolo"` auto-play enabled by default).
  - Turns microphone OFF (`recognition.stop()`) while the app is speaking and resumes (`recognition.start()`) inside `onEnd` so the app never hears itself.
  - Default speaking rate `0.85`; `"dheere bolo"` lowers rate to `0.65`.
  - Maps all 6 spoken commands across Marathi, Hindi, and English (`YES` / `haan`, `NO` / `nahi`, `REPEAT` / `dobara bolo`, `SLOWER` / `dheere bolo`, `STOP` / `ruko`, `HELP` / `madad`).
- **"Sunao" (`🔊`) Buttons & Startup Voice Test**:
  - Added `"Sunao"` speaker buttons to every card, message bubble, and status bar.
  - Added Startup Voice Self-Check card on `LanguagePickerScreen.jsx` that plays a Marathi test sentence and reports whether a native `mr-IN` voice exists or warns that `hi-IN` fallback is active.
- **Hard Voice Approval Guard at Gate 2**:
  - Saying `"haan"` by voice at Gate 2 never submits the form alone; the agent speaks `"Aapne haan kaha. Ab form jama ho raha hai..."` and reveals a big green physical Confirm button (`gate2-voice-confirm-btn`). Submission happens strictly on physical button click.

### Verification Checklist (F3)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src --max-warnings=0`)
- [x] **Regression + F3 unit & component tests (`npm run test`)**: PASS (15/15 tests across `f1.test.jsx`, `f2.test.jsx`, and `f3.test.jsx`)
- [x] **Production build (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
- [x] **UI smoke check & screenshot evidence**: PASS

### Architectural Decisions & Notes
- Exported pure `createMicController` alongside the `useVoice` React hook so the acoustic echo guard (`stopMic` on speak start, `startMic` on `onend`) is deterministically unit-testable with mocked `speechSynthesis` and `SpeechRecognition`.

### Known Limitations
- Browser Web Speech API availability varies by OS/browser; when STT is absent, the UI automatically indicates text-box and one-tap voice command fallback.
