/**
 * CORS middleware configured for FRONTEND_ORIGIN (default http://localhost:5173),
 * supporting production Vercel domains, preview URLs (*.vercel.app),
 * with credentials support for the httpOnly JWT cookie and OPTIONS preflight.
 */
export function createCorsMiddleware(
  customOrigin = process.env.FRONTEND_ORIGIN
) {
  const defaultAllowedOrigins = [
    'https://hackathon-nu-kohl.vercel.app',
    'https://nagarsathi.vercel.app',
    'https://NagarSathi.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
  ];

  const configuredOrigins = customOrigin
    ? customOrigin.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const allAllowed = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

  return function corsMiddleware(req, res, next) {
    const requestOrigin = req.headers?.origin;
    let originToAllow = null;

    if (requestOrigin) {
      if (allAllowed.has(requestOrigin)) {
        originToAllow = requestOrigin;
      } else if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(requestOrigin)) {
        // Any Vercel deployment or branch preview URL
        originToAllow = requestOrigin;
      } else if (process.env.NODE_ENV !== 'production') {
        originToAllow = requestOrigin;
      } else {
        originToAllow = configuredOrigins[0] || defaultAllowedOrigins[0];
      }
    } else {
      originToAllow = '*';
    }

    res.setHeader('Access-Control-Allow-Origin', originToAllow);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PATCH,PUT,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Requested-With,X-NagarSathi-Lang,Accept'
    );
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  };
}

/**
 * Lightweight in-memory sliding-window rate limiter middleware.
 */
export function createRateLimiter({ windowMs = 60_000, max = 120 } = {}) {
  const hits = new Map();

  return function rateLimiterMiddleware(req, res, next) {
    const key =
      req.user?.id ||
      req.headers?.['x-forwarded-for'] ||
      req.ip ||
      'local-client';
    const now = Date.now();
    const record = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count += 1;
    hits.set(key, record);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, max - record.count))
    );

    if (record.count > max) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        display: 'कृपया थोड्या वेळाने पुन्हा प्रयत्न करा (Too many requests).',
        speech: 'कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
        data: { retryAfterMs: record.resetAt - now },
      });
    }

    return next();
  };
}

/**
 * Central Express error handling middleware.
 */
export function centralErrorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Unexpected error occurred';

  return res.status(statusCode).json({
    error: code,
    display: message,
    speech: message,
    data: { ok: false },
  });
}

