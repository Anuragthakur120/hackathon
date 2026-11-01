import express from 'express';
import {
  transcribeWithWhisper,
  synthesizeSpeech,
  normalizeVoiceLang,
} from '../voiceServices.js';

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // ~10 MB (a few minutes of speech)
const MAX_TTS_CHARS = 1500;

export function createVoiceRouter() {
  const router = express.Router();

  // POST /api/stt  (body = raw audio bytes, optional ?lang=hi). Returns { text, lang }.
  // Audio lives only in this request's memory and is discarded when the response is sent.
  router.post(
    '/stt',
    express.raw({ type: () => true, limit: MAX_AUDIO_BYTES }),
    async (req, res) => {
      try {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: 'No audio received.', code: 'STT_NO_AUDIO' });
        }
        const { text, lang } = await transcribeWithWhisper(
          req.body,
          req.headers['content-type'],
          req.query.lang
        );
        res.set('Cache-Control', 'no-store');
        return res.status(200).json({ text, lang });
      } catch (err) {
        console.error('[Voice STT Error]', err.code || err.name, err.message);
        const status = err.status || err.statusCode || 500;
        const code = err.code || 'STT_ERROR';
        return res.status(status).json({ error: err.message, code });
      }
    }
  );

  // POST /api/tts  { text, lang, rate } -> audio/mpeg
  router.post('/tts', async (req, res) => {
    try {
      const { text, lang, rate } = req.body || {};
      const cleaned = String(text || '').trim().slice(0, MAX_TTS_CHARS);
      const code = normalizeVoiceLang(lang);
      if (!cleaned) {
        return res.status(400).json({ error: 'Text is required.', code: 'TTS_NO_TEXT' });
      }
      if (!code) {
        return res.status(400).json({ error: 'Unsupported language.', code: 'TTS_BAD_LANG' });
      }
      const audio = await synthesizeSpeech(cleaned, code, rate);
      res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
      return res.status(200).send(audio);
    } catch (err) {
      console.error('[Voice TTS Error]', err.code || err.name, err.message);
      const status = err.status || err.statusCode || 500;
      const code = err.code || 'TTS_ERROR';
      return res.status(status).json({ error: err.message, code });
    }
  });

  return router;
}

