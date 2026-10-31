# Pre-Recorded Fixed Audio Slots (`/frontend/public/audio`)

NagarSathi plays pre-generated `.mp3` files from `/audio/{lang}/<key>.mp3` when present (via `playFixedAudioOrSpeak` in `src/voice/speak.js`), and automatically falls back to browser Web Speech TTS (`speechSynthesis`) when an `.mp3` is not recorded or unavailable.

> **Important**: Claude does NOT generate audio directly. Spoken output comes from browser TTS or pre-recorded `.mp3` files in this folder.

## Fixed Sentences to Record per Language

### 1. `welcome.mp3`
- **`mr-IN`**: "नमस्कार, नगरसाथीमध्ये तुमचे स्वागत आहे. तुमची भाषा निवडा किंवा माईक दाबून तुमची समस्या सांगा."
- **`hi-IN`**: "नमस्ते, नगरसाथी में आपका स्वागत है। अपनी भाषा चुनें या माइक दबाकर अपनी समस्या बताएँ।"
- **`en-IN`**: "Welcome to NagarSathi. Choose your language or tap the microphone to tell us your issue."

### 2. `consent.mp3` (Gate 1)
- **`mr-IN`**: "आम्ही तुमच्या वतीने अर्जाचा मसुदा तयार करू आणि अर्जाचा मागोवा घेऊ. तुमच्या मंजुरीशिवाय अर्ज कधीही सादर केला जाणार नाही. तुम्हाला मान्य असल्यास हो म्हणा किंवा हिरवे बटण दाबा."
- **`hi-IN`**: "हम आपकी ओर से फॉर्म का ड्राफ्ट तैयार करेंगे और स्थिति ट्रैक करेंगे। आपकी मंज़ूरी के बिना फॉर्म कभी सबमिट नहीं होगा। सहमत होने के लिए हाँ बोलें या हरा बटन दबाएँ।"
- **`en-IN`**: "We will prepare your draft application and track your case. We never submit without your explicit approval. Say yes or tap the green button to agree."

### 3. `approval.mp3` (Gate 2)
- **`mr-IN`**: "अर्ज जमा करू का? होय बोला किंवा मोठे हिरवे बटण दाबा."
- **`hi-IN`**: "फॉर्म जमा करूँ? हाँ बोलें या बड़ा हरा बटन दबाएँ।"
- **`en-IN`**: "Shall we submit the form? Say yes or press the big green confirm button."

