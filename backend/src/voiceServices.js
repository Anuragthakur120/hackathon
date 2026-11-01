/**
 * Server-side voice services for the AI Voice Assistant.
 *
 * Secrets are read ONLY from environment variables (never sent to the browser):
 *   OPENAI_API_KEY       - Whisper speech-to-text with automatic language detection (/api/stt)
 *   STT_MODEL            - optional, default "whisper-1"
 *   GOOGLE_TTS_API_KEY   - Google Cloud Text-to-Speech fallback voices (/api/tts)
 *   ANTHROPIC_API_KEY    - optional; when set, replies are written in the user's own language/script
 *   CLAUDE_MODEL_FAST    - optional, default "claude-haiku-5-5"
 *
 * Audio and text are processed in memory and returned; nothing is written to disk or the database.
 */

export const LANGUAGE_NAME_TO_CODE = Object.freeze({
  hindi: 'hi',
  marathi: 'mr',
  english: 'en',
  gujarati: 'gu',
  bengali: 'bn',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
  punjabi: 'pa',
  urdu: 'ur',
});

export const SUPPORTED_VOICE_LANGS = Object.freeze({
  hi: 'hi-IN',
  mr: 'mr-IN',
  en: 'en-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
});

const LANGUAGE_DISPLAY = Object.freeze({
  'hi-IN': 'Hindi',
  'mr-IN': 'Marathi',
  'en-IN': 'English',
  'gu-IN': 'Gujarati',
  'bn-IN': 'Bengali',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
  'pa-IN': 'Punjabi',
  'ur-IN': 'Urdu',
});

export function normalizeVoiceLang(raw) {
  const prefix = String(raw || '').toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_VOICE_LANGS[prefix] || null;
}

function serviceError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function extensionForMime(mime = '') {
  const m = String(mime).toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'm4a';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
}

/** Whisper transcription with automatic language detection. Returns { text, lang }. */
export async function transcribeWithWhisper(buffer, mime, langHint = '') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw serviceError('Cloud speech-to-text is not configured (OPENAI_API_KEY missing).', 'STT_NOT_CONFIGURED', 503);
  }

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime || 'audio/webm' }), `speech.${extensionForMime(mime)}`);
  form.append('model', process.env.STT_MODEL || 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  const hint = String(langHint || '').toLowerCase().split(/[-_]/)[0];
  if (hint && SUPPORTED_VOICE_LANGS[hint]) form.append('language', hint);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    throw serviceError(
      err.name === 'AbortError' ? 'Speech-to-text timed out.' : 'Speech-to-text provider is unreachable.',
      'STT_UPSTREAM_UNREACHABLE',
      502
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Do not echo upstream bodies (they can contain request details).
    throw serviceError(`Speech-to-text provider returned HTTP ${res.status}.`, 'STT_UPSTREAM_ERROR', 502);
  }

  const data = await res.json();
  const detected = String(data.language || '').toLowerCase();
  const short = LANGUAGE_NAME_TO_CODE[detected] || (SUPPORTED_VOICE_LANGS[detected] ? detected : '');
  return {
    text: String(data.text || '').trim(),
    lang: short ? SUPPORTED_VOICE_LANGS[short] : hint ? SUPPORTED_VOICE_LANGS[hint] || null : null,
  };
}

/** Google Cloud TTS. Returns an MP3 Buffer. */
export async function synthesizeSpeech(text, langCode, rate = 0.85) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw serviceError('Cloud text-to-speech is not configured (GOOGLE_TTS_API_KEY missing).', 'TTS_NOT_CONFIGURED', 503);
  }

  const speakingRate = Math.min(1.5, Math.max(0.5, Number(rate) || 0.85));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: langCode },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
      }),
      signal: controller.signal,
    });
  } catch {
    throw serviceError('Text-to-speech provider is unreachable.', 'TTS_UPSTREAM_UNREACHABLE', 502);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw serviceError(`Text-to-speech provider returned HTTP ${res.status}.`, 'TTS_UPSTREAM_ERROR', 502);
  }
  const data = await res.json();
  if (!data.audioContent) throw serviceError('Text-to-speech returned no audio.', 'TTS_EMPTY', 502);
  return Buffer.from(data.audioContent, 'base64');
}

export const ASSISTANT_SYSTEM_PROMPT =
  'Reply in the same language and script the user used. Mix Hinglish if the user does. Use simple short sentences.';

const GUARDRAILS = [
  'You are NagarSathi, a citizen helper for Indian government services.',
  'Use ONLY the verified facts provided. Do not invent scheme rules, fees, office names or dates.',
  'Keep every number, scheme name, document name and the "7 to 14 working days" timeline exactly as given.',
  'Never say an application was submitted or approved. Forms stay DRAFT until the citizen presses the approval button.',
  'Do not use emojis or markdown. Plain text only, because the reply is read aloud.',
].join(' ');

/**
 * Rewrites the grounded reply into the user's own language/script. Returns the original text if the LLM is
 * not configured or fails, so the assistant never breaks because of this optional layer.
 */
export async function rewriteReplyWithLlm({ userMessage, detectedLang, hinglish = false, facts }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || process.env.MOCK_AI === 'true') return { text: facts, llm: false };

  const langName = LANGUAGE_DISPLAY[normalizeVoiceLang(detectedLang)] || 'the same language as the user';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL_FAST || 'claude-haiku-5-5',
        max_tokens: 600,
        temperature: 0.2,
        system: `${ASSISTANT_SYSTEM_PROMPT}\n${GUARDRAILS}`,
        messages: [
          {
            role: 'user',
            content: `User message: ${userMessage}\nDetected language: ${langName}${hinglish ? ' (the user wrote Hinglish, i.e. Hindi in Latin letters, so mix Hinglish)' : ''}\n\nVerified facts to answer from:\n${facts}\n\nWrite the reply now.`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { text: facts, llm: false };
    const data = await res.json();
    const out = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return out ? { text: out, llm: true } : { text: facts, llm: false };
  } catch {
    return { text: facts, llm: false };
  } finally {
    clearTimeout(timer);
  }
}
