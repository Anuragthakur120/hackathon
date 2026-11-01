/**
 * Thin client for the backend voice endpoints. NO API keys live in the frontend: STT, TTS and
 * LLM calls are all proxied by the backend (`/api/stt`, `/api/tts`, `/api/assistant`).
 * Audio is sent for transcription and discarded; nothing is persisted on the client or server.
 */

function getBase() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const custom =
      import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    if (custom) {
      return String(custom).replace(/\/$/, '');
    }
  }
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    window.location.hostname.includes('vercel.app')
  ) {
    return 'https://hackathon-backend-rose-seven.vercel.app';
  }
  return '';
}

function voiceError(message, code, status) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

async function readError(res, fallbackCode) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const code = body?.code || fallbackCode;
  if (code === 'STT_NOT_CONFIGURED' || (fallbackCode === 'STT_FAILED' && (res.status === 500 || res.status === 503))) {
    return voiceError(
      'Cloud speech-to-text is not configured on the server. Using browser speech recognition instead.',
      code || 'STT_NOT_CONFIGURED',
      res.status
    );
  }
  if (code === 'TTS_NOT_CONFIGURED') {
    return voiceError('Cloud text-to-speech is not configured on the server (set GOOGLE_TTS_API_KEY).', code, res.status);
  }
  return voiceError(body?.error || `Voice service error (HTTP ${res.status})`, code, res.status);
}

/** Uploads a recorded audio blob and returns `{ text, lang }`. */
export async function transcribeAudio(blob, langHint = '') {
  const qs = langHint ? `?lang=${encodeURIComponent(langHint)}` : '';
  let res;
  try {
    res = await fetch(`${getBase()}/api/stt${qs}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      body: blob,
    });
  } catch (err) {
    console.error('[NagarSathi STT] /api/stt unreachable', err);
    throw voiceError(
      'Cannot reach the speech server (/api/stt). Is the backend running on port 5000?',
      'STT_UNREACHABLE',
      0
    );
  }
  if (!res.ok) throw await readError(res, 'STT_FAILED');
  const data = await res.json();
  return { text: String(data.text || ''), lang: data.lang || null };
}

/** Fetches synthesized speech (audio/mpeg) as a Blob. */
export async function fetchTts(text, lang, rate = 0.85) {
  let res;
  try {
    res = await fetch(`${getBase()}/api/tts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, rate }),
    });
  } catch {
    throw voiceError('Cannot reach the speech server (/api/tts).', 'TTS_UNREACHABLE', 0);
  }
  if (!res.ok) throw await readError(res, 'TTS_FAILED');
  return res.blob();
}

/** Direct call to the backend assistant (used by mock mode for languages the mock cannot answer). */
export async function askBackendAssistant(payload) {
  const res = await fetch(`${getBase()}/api/assistant`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await readError(res, 'ASSISTANT_FAILED');
  return res.json();
}
