# @nagarsathi/frontend

Voice-first, multilingual (`mr-IN`, `hi-IN`, `en-IN`) React + Vite frontend for NagarSathi (CITY-02).

## Module F1–F4 Features
- **Vite + React + React Router**: Mobile-first (`360px` responsive), high-contrast accessible shell (`min-height: 56px` touch targets, `min-height: 92px` language picker buttons) with `/api` and `/socket.io` dev proxy to `http://localhost:5000`.
- **i18n (`src/i18n/{mr,hi,en}.json`)**: Full Marathi (`mr-IN`, default), Hindi (`hi-IN`), and English (`en-IN`) dictionaries with 100% key parity.
- **Voice Assistant Layer (`src/voice/`)**:
  - `speak.js`: Splits text into sentences (`/(?<=[.?!।])\s+/`), selects voices in fallback order (`mr-IN -> mr -> hi-IN -> null`), formats speech strings (10-12 word sentences, digit-by-digit IDs, no URLs/symbols), and plays fixed pre-recorded `.mp3` slots (`/public/audio/{lang}/{welcome,consent,approval}.mp3`) with live TTS fallback.
  - `useVoice.js`: Turns the microphone OFF while speaking (`recognition.stop()`) and turns it ON again in `onEnd` so the app never hears itself.
  - `commands.js`: Maps spoken commands across Marathi, Hindi, and English (`haan`, `nahi`, `dobara bolo`, `dheere bolo`, `ruko`, `madad`).
- **Steps 1–10 (Intake, Gate 1 Consent, Docs Loop, Draft Summary, Gate 2 Approval, Submitted)**:
  - Enforces that voice `"haan"` alone never submits at Gate 2 — requires pressing the big green physical Confirm button.
- **Steps 11–16 & Extras (Module F4)**:
  - **Screen (6) Tracking Timeline**: 6-stage visual timeline (`SUBMITTED`, `TRACKING`, `QUERY_RAISED`, `STALLED`, `CALLED`, `CLOSED`) with Day-10 Query toggle (`"Office ne ek sawal poocha"` -> camera document resubmit -> back to `TRACKING`) and `+21 din` time-skip (`STALLED`: `"7 din se ruka hai"`).
  - **Screen (7) Simulated Office Call**: Live transcript where the judge plays the office officer; extracts escalation reference `REF-5521`, schedules next check (`"3 din mein dekhenge, REF-5521"`), returns to `TRACKING`, and closes the case (`CLOSED`: `"Pension phir chalu ho gayi"`).
  - **Screen (8) Help Centre ("Madad Kendra")**: Step-by-step instructions and big toll-free call button (`tel:1800111555`).
  - **Letter Explainer ("Ye chitthi samjhao")**: Captures a photo of an official letter, explains it in simple language, and speaks it aloud via `speak.js` and `"Sunao"`.
  - **Failure UI**: Portal failure retries 3 times (`"dobara koshish 1/3"` -> `"3/3"`) before speaking a clear message that the draft is safely saved.
