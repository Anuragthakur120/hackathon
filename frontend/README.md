# `@nagarsathi/frontend` — Voice-First Citizen UI

> **Slogan:** *"Jo padh nahi sakta, wo bhi sab kuch kar sakta hai."*
> **Demo Persona:** Ramabai Kulkarni (Age 68, Elderly Widow, Old-Age Pension Stopped, Speaks Marathi `mr-IN`)

Mobile-first, high-contrast, multilingual (`mr-IN` default, `hi-IN`, `en-IN`) React + Vite frontend for **NagarSathi (CITY-02)**. Designed for low-literacy and elderly citizens with touch targets `>= 56px`, automatic voice guidance (`Apne aap bolo`), `"Sunao"` (`🔊`) buttons on every card/message/status, and two mandatory human gates (**Gate 1: Consent**, **Gate 2: Physical Approval before Submit**).

---

## 1. How to Run

From the repository root (`NagarSathi/`):

```bash
# Install dependencies across all workspaces
npm install

# Start the frontend dev server (http://localhost:5173)
npm run dev --workspace=@nagarsathi/frontend

# Run ESLint (zero warnings allowed)
npm run lint --workspace=@nagarsathi/frontend

# Run Vitest unit + integration tests (F1 through F5)
npm run test --workspace=@nagarsathi/frontend

# Build production bundle into frontend/dist/
npm run build --workspace=@nagarsathi/frontend
```

---

## 2. Environment Variables

Configure via root `.env` (see `.env.example`):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_MODE` | `mock` | Set to `mock` to run the deterministic in-memory 16-step Ramabai demo (`src/api/mockApi.js`). Set to `real` to route calls through `src/api/realApi.js` once the backend is connected in Module I1. |
| `VITE_API_BASE_URL` | `http://localhost:3001/api` | Base URL used by `realApi.js` when `VITE_API_MODE=real`. |

> **Security Note:** Never put `ANTHROPIC_API_KEY`, `JWT_SECRET`, or `ENCRYPTION_KEY` in any `VITE_*` variable or inside `/frontend`.

---

## 3. Voice Test Instructions (Marathi `mr-IN` on Android Chrome & Laptop Chrome)

Speech recognition (`webkitSpeechRecognition` / `SpeechRecognition`) and speech synthesis (`window.speechSynthesis`) behave differently across operating systems and browsers:

### A. Testing on Android Chrome (Recommended Demo Device)
1. Open **Android Settings -> System -> Languages & input -> Text-to-speech output -> Speech Services by Google**.
2. Tap **Install voice data** and verify **Marathi (India)** (`mr-IN`), **Hindi (India)** (`hi-IN`), and **English (India)** (`en-IN`) voices are downloaded for offline/low-latency playback.
3. Open Chrome on Android, navigate to the NagarSathi URL, and select **मराठी** on Screen 1.
4. Confirm that:
   - The voice guide banner (**"Apne aap bolo"**) automatically speaks each step's instruction in Marathi (`rate = 0.85`).
   - Tapping the big microphone button (`🎤`) listens with `recognition.lang = 'mr-IN'` and maps spoken Marathi commands (`"हो"`, `"नाही"`, `"पुन्हा बोला"`, `"हळू बोला"`, `"थांबा"`, `"मदत"`) directly to screen actions.

### B. Testing on Laptop Chrome (Windows / macOS / Linux)
1. Open the browser DevTools console and inspect available voices:
   ```js
   speechSynthesis.getVoices().filter(v => /mr|hi|en/i.test(v.lang))
   ```
2. **Automatic Fallback (`src/voice/speak.js`)**:
   - Many laptop OS installations do not ship a native `mr-IN` TTS voice out of the box, though Devnagari Hindi (`hi-IN`, e.g., *Google हिन्दी* or *Microsoft Hemant/Kalpana*) is commonly installed.
   - `pickVoice('mr-IN')` in `src/voice/speak.js` automatically selects `mr-IN` first, falls back to `mr-*`, and if missing on the laptop, falls back to `hi-IN` (which reads Marathi Devanagari script intelligibly) so the demo never goes silent.
   - Long paragraphs are automatically split on sentence boundaries (`/(?<=[.?!।])\s+/`) so Chrome does not cut off mid-utterance.
3. **Speech-to-Text Fallback**:
   - If the browser does not support Web Speech API or the microphone permission is denied/offline, the UI automatically focuses the high-contrast text box fallback and keeps all preset demo chips one tap away.

---

## 4. Fixed Sentences That Need `.mp3` Recordings

Pre-recorded `.mp3` audio slots are wired in `src/voice/speak.js` (`AUDIO_SLOTS` + `playSlotOrSpeak(slotKey, fallbackText, options)`) so the 3 highest-impact moments of the live judge demo can play studio-clear voice recordings with automatic fallback to `speak()` when the `.mp3` file is absent.

Place recorded `.mp3` files under `/frontend/public/audio/<lang>/<slot>.mp3`:

| Slot Key | File Paths | Fixed Sentence to Record (Marathi / Hindi / English) |
| :--- | :--- | :--- |
| **`welcome`** | `public/audio/mr-IN/welcome.mp3`<br>`public/audio/hi-IN/welcome.mp3`<br>`public/audio/en-IN/welcome.mp3` | **mr-IN:** `"नमस्कार रमाबाई! नगरसाथी मध्ये आपले स्वागत आहे. फक्त माईक दाबा आणि आपली अडचण सांगा."`<br>**hi-IN:** `"नमस्ते रमाबाई! नगरसाथी में आपका स्वागत है। बस माइक दबाएं और अपनी समस्या बताएं।"`<br>**en-IN:** `"Hello Ramabai! Welcome to NagarSathi. Just tap the mic and tell us your problem."` |
| **`consent`** | `public/audio/mr-IN/consent.mp3`<br>`public/audio/hi-IN/consent.mp3`<br>`public/audio/en-IN/consent.mp3` | **mr-IN:** `"संमती आवश्यक (गेट १): नगरसाथी तुमचा मसुदा अर्ज भरू शकतो आणि प्रकरणाचा पाठपुरावा करू शकतो, पण तुमच्या अंतिम मंजुरीशिवाय अर्ज सबमिट करणार नाही. तुम्हाला मान्य आहे का?"`<br>**hi-IN:** `"सहमति आवश्यक (गेट 1): नगरसाथी आपका ड्राफ्ट फॉर्म भर सकता है और केस ट्रैक कर सकता है, लेकिन आपकी अंतिम मंजूरी के बिना फॉर्म जमा नहीं करेगा। क्या आप सहमत हैं?"`<br>**en-IN:** `"Consent Required (Gate 1): NagarSathi can fill your draft form and track your case, but will never submit without your final approval. Do you agree?"` |
| **`approval`** | `public/audio/mr-IN/approval.mp3`<br>`public/audio/hi-IN/approval.mp3`<br>`public/audio/en-IN/approval.mp3` | **mr-IN:** `"अंतिम मंजुरी (गेट २): रमाबाई कुलकर्णी यांचा इंदिरा गांधी वृद्धापकाळ पेन्शन मसुदा अर्ज तयार आहे. आधार XXXX-XXXX-4821 आणि बँक खाते XXXXXXXX9012 तपासा. सर्व बरोबर असल्यास हिरवे सबमिट बटण दाबा."`<br>**hi-IN:** `"अंतिम मंजूरी (गेट 2): रमाबाई कुलकर्णी का इंदिरा गांधी वृद्धावस्था पेंशन ड्राफ्ट फॉर्म तैयार है। आधार XXXX-XXXX-4821 और बैंक खाता XXXXXXXX9012 जांचें। सब सही होने पर हरा सबमिट बटन दबाएं।"`<br>**en-IN:** `"Final Approval (Gate 2): The draft form for Ramabai Kulkarni's Indira Gandhi Old Age Pension is ready. Please verify Aadhaar XXXX-XXXX-4821 and Bank Account XXXXXXXX9012. Press the green submit button to submit."` |
