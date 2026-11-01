import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, invokeApp } from '../app.js';
import {
  normalizeVoiceLang,
  transcribeWithWhisper,
  synthesizeSpeech,
  rewriteReplyWithLlm,
  ASSISTANT_SYSTEM_PROMPT,
} from '../voiceServices.js';

describe('Voice services: /api/stt, /api/tts, /api/assistant (detectedLang)', () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
    vi.restoreAllMocks();
  });

  it('maps every supported language and rejects unknown ones', () => {
    for (const code of ['hi', 'mr', 'en', 'gu', 'bn', 'ta', 'te', 'kn', 'pa', 'ur']) {
      expect(normalizeVoiceLang(code)).toBe(`${code}-IN`);
    }
    expect(normalizeVoiceLang('gu-IN')).toBe('gu-IN');
    expect(normalizeVoiceLang('xx')).toBeNull();
  });

  it('returns clear "not configured" errors instead of failing silently when provider keys are missing', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_TTS_API_KEY;
    await expect(transcribeWithWhisper(Buffer.from('x'), 'audio/webm')).rejects.toMatchObject({
      code: 'STT_NOT_CONFIGURED',
      status: 503,
    });
    await expect(synthesizeSpeech('namaste', 'hi-IN')).rejects.toMatchObject({
      code: 'TTS_NOT_CONFIGURED',
      status: 503,
    });

    const app = createApp();
    const tts = await invokeApp(app, { method: 'POST', url: '/api/tts', body: { text: 'नमस्ते', lang: 'hi-IN' } });
    expect(tts.status).toBe(503);
    expect(tts.body.code).toBe('TTS_NOT_CONFIGURED');

    const badLang = await invokeApp(app, { method: 'POST', url: '/api/tts', body: { text: 'hello', lang: 'xx' } });
    expect(badLang.status).toBe(400);
  });

  it('transcribes with Whisper, auto-detects the language and never exposes the API key', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-secret';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ text: 'मला शिष्यवृत्ती हवी आहे', language: 'marathi' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const out = await transcribeWithWhisper(Buffer.from('audio'), 'audio/webm;codecs=opus');
    expect(out).toEqual({ text: 'मला शिष्यवृत्ती हवी आहे', lang: 'mr-IN' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(init.headers.Authorization).toBe('Bearer sk-test-secret');
    // No language hint was given, so Whisper was asked to auto-detect.
    expect(init.body.get('language')).toBeNull();
    expect(init.body.get('response_format')).toBe('verbose_json');
    vi.unstubAllGlobals();
  });

  it('answers /api/assistant with detectedLang, and falls back to grounded facts when no LLM is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const app = createApp();

    const hi = await invokeApp(app, {
      method: 'POST',
      url: '/api/assistant',
      body: { message: 'मुझे छात्रवृत्ति के लिए आवेदन करना है', language: 'en-IN', detectedLang: 'hi-IN' },
    });
    expect(hi.status).toBe(200);
    expect(hi.body.data.reply).toContain('छात्रवृत्ति');
    expect(hi.body.data.replyLang).toBe('hi-IN');

    // Gujarati cannot be written without an LLM: reply stays English and says so, so TTS uses the right voice.
    const gu = await invokeApp(app, {
      method: 'POST',
      url: '/api/assistant',
      body: { message: 'scholarship', language: 'en-IN', detectedLang: 'gu-IN' },
    });
    expect(gu.status).toBe(200);
    expect(gu.body.data.replyLang).toBe('en-IN');
    expect(gu.body.data.llm).toBe(false);

    // The legacy path keeps working.
    const legacy = await invokeApp(app, {
      method: 'POST',
      url: '/api/assistant/message',
      body: { message: 'income certificate', language: 'en-IN' },
    });
    expect(legacy.status).toBe(200);
    expect(legacy.body.data.suggestedActions.every((a) => !/pension/i.test(a.label))).toBe(true);
  });

  it('sends the same-language system prompt to the LLM', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic';
    delete process.env.MOCK_AI;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ઉત્તર' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const out = await rewriteReplyWithLlm({ userMessage: 'શિષ્યવૃત્તિ', detectedLang: 'gu-IN', facts: 'Scholarship facts' });
    expect(out).toEqual({ text: 'ઉત્તર', llm: true });
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.system).toContain(ASSISTANT_SYSTEM_PROMPT);
    expect(ASSISTANT_SYSTEM_PROMPT).toBe(
      'Reply in the same language and script the user used. Mix Hinglish if the user does. Use simple short sentences.'
    );
    vi.unstubAllGlobals();
  });
});

