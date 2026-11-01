import http from 'node:http';
import { Duplex } from 'node:stream';
import express from 'express';
import { createRequestLogger } from './privacy.js';
import { auditLogMiddleware } from './auditMiddleware.js';
import {
  createCorsMiddleware,
  createRateLimiter,
  centralErrorHandler,
} from './middleware.js';
import { createCoreRouter } from './routes/coreRoutes.js';
import { createCitizenRouter } from './routes/citizenRoutes.js';
import { createCaseRouter } from './routes/caseRoutes.js';
import { createAgentRouter } from './routes/agentRoutes.js';
import { createPlatformRouter } from './routes/platformRoutes.js';
import { createVoiceRouter } from './routes/voiceRoutes.js';
import { defaultPortalAdapter } from './portalAdapter.js';
import { defaultAgentAdapter } from './agentAdapter.js';

/**
 * Creates the Express application with CORS, rate limiting, masking request logger,
 * background audit log middleware, core routes (/auth, /profile, /vault, /services, /health),
 * case engine routes (/cases/*, /demo/*), agent routes (/agents/*), and central error handling.
 */
export function createApp({
  rateLimitMax = 120,
  rateLimitWindowMs = 60_000,
  logSink = [],
  allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  portalAdapter = defaultPortalAdapter,
  agentAdapter = defaultAgentAdapter,
} = {}) {
  const app = express();

  app.use(createCorsMiddleware(allowedOrigin));
  app.use(express.json({ limit: '2mb' }));
  app.use(createRateLimiter({ windowMs: rateLimitWindowMs, max: rateLimitMax }));
  app.use(createRequestLogger({ sink: logSink }));
  app.use(auditLogMiddleware);

  const coreRouter = createCoreRouter();
  const citizenRouter = createCitizenRouter({ agentAdapter, portalAdapter });
  const caseRouter = createCaseRouter({ portalAdapter });
  const agentRouter = createAgentRouter({ agentAdapter, portalAdapter });
  const platformRouter = createPlatformRouter({ agentAdapter, portalAdapter });
  const voiceRouter = createVoiceRouter();

  // Voice endpoints (/api/stt, /api/tts) are mounted first; they hold provider keys server-side only.
  app.use('/', voiceRouter);
  app.use('/api', voiceRouter);

  app.use('/', coreRouter);
  app.use('/', platformRouter);
  app.use('/', citizenRouter);
  app.use('/', caseRouter);
  app.use('/', agentRouter);
  app.use('/api', coreRouter);
  app.use('/api', platformRouter);
  app.use('/api', citizenRouter);
  app.use('/api', caseRouter);
  app.use('/api', agentRouter);

  app.use(centralErrorHandler);

  return app;
}

class MemorySocket extends Duplex {
  constructor() {
    super();
    this.remoteAddress = '127.0.0.1';
    this.writable = true;
  }
  _read() {}
  _write(_chunk, _encoding, callback) {
    callback();
  }
  setTimeout() {}
  destroy() {}
}

/**
 * Dispatches an HTTP request directly through an Express `app` in-process
 * (without opening an OS TCP port) and returns { status, headers, cookies, body, text }.
 */
export function invokeApp(
  app,
  { method = 'GET', url = '/health', headers = {}, body = undefined, cookie = '' } = {}
) {
  return new Promise((resolve, reject) => {
    const socket = new MemorySocket();
    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;

    const rawBody =
      body !== undefined && body !== null
        ? typeof body === 'string'
          ? body
          : JSON.stringify(body)
        : '';

    const normalizedHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      normalizedHeaders[k.toLowerCase()] = String(v);
    }
    if (cookie) {
      normalizedHeaders.cookie = cookie;
    }
    if (rawBody && !normalizedHeaders['content-type']) {
      normalizedHeaders['content-type'] = 'application/json';
    }
    if (rawBody) {
      normalizedHeaders['content-length'] = String(
        Buffer.byteLength(rawBody, 'utf8')
      );
    }
    req.headers = normalizedHeaders;

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    const chunks = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = (chunk, encoding, cb) => {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding)
        );
      }
      return origWrite(chunk, encoding, cb);
    };

    res.end = (chunk, encoding, cb) => {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding)
        );
      }
      const result = origEnd(chunk, encoding, cb);
      const rawText = Buffer.concat(chunks).toString('utf8');
      const bodyStartIdx = rawText.indexOf('\r\n\r\n');
      const payloadText =
        bodyStartIdx !== -1 ? rawText.slice(bodyStartIdx + 4) : rawText;

      let parsedBody = payloadText;
      try {
        parsedBody = payloadText ? JSON.parse(payloadText) : null;
      } catch {
        // Leave as text
      }

      const resHeaders = res.getHeaders();
      const setCookieHeader = resHeaders['set-cookie'] || [];
      const setCookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];

      setImmediate(() => {
        resolve({
          status: res.statusCode,
          headers: resHeaders,
          setCookies,
          body: parsedBody,
          text: payloadText,
        });
      });
      return result;
    };

    try {
      app.handle(req, res, reject);
      if (rawBody) {
        req.push(Buffer.from(rawBody, 'utf8'));
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
}

