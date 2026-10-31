# @nagarsathi/frontend

Voice-first, multilingual (`mr-IN`, `hi-IN`, `en-IN`) React + Vite frontend for NagarSathi (CITY-02).

## Module F1, F2 & F3 Features
- **Vite + React + React Router**: Mobile-first, high-contrast accessible shell (`min-height: 56px` touch targets, `min-height: 92px` language picker buttons) with `/api` and `/socket.io` dev proxy to `http://localhost:5000`.
- **i18n (`src/i18n/{mr,hi,en}.json`)**: Full Marathi (`mr-IN`, default), Hindi (`hi-IN`), and English (`en-IN`) dictionaries with 100% key parity.
- **Voice Assistant Layer (`src/voice/`)**:
  - `speak.js`: Splits text into sentences (`/(?<=[.?!।])\s+/`) so Chrome never stops mid-way, picks voices in fallback order (`exact lang -> prefix -> hi-IN -> null`), formats speech strings (10-12 word sentences, digit-by-digit IDs, no URLs/symbols), and plays fixed pre-recorded `.mp3` slots (`/public/audio/{lang}/{welcome,consent,approval}.mp3`) with automatic live TTS fallback.
  - `useVoice.js`: Turns the microphone OFF while speaking (`recognition.stop()`) and turns it ON again in `onEnd` so the app never hears itself. Default speech rate `0.85`; `"dheere bolo"` lowers rate further (`0.65`).
  - `commands.js`: Maps spoken commands across Marathi, Hindi, and English (`haan`, `nahi`, `dobara bolo`, `dheere bolo`, `ruko`, `madad`).
  - **Voice Safety Rule**: Saying `"haan"` by voice at Gate 2 is NEVER enough alone to submit; it repeats confirmation and reveals a big green physical Confirm button. Submit happens only on physical button press.
  - **Startup Voice Self-Check**: Tests Marathi TTS on Screen 1 and reports whether a native `mr-IN` voice exists or warns that it is falling back to `hi-IN`.

## Pre-Recorded Audio Slots (`public/audio/{mr-IN,hi-IN,en-IN}/`)
See [`public/audio/README.md`](./public/audio/README.md) for the exact sentences to record for:
1. `welcome.mp3` (Language picker & greeting)
2. `consent.mp3` (Gate 1 informed consent summary)
3. `approval.mp3` (Gate 2 draft submission prompt)
Note: Claude does NOT generate audio; spoken output uses browser TTS or pre-recorded `.mp3` slots.
