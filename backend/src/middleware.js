/**
 * CORS middleware configured for FRONTEND_ORIGIN (default http://localhost:5173)
 * with credentials support for the httpOnly JWT cookie.
 */
export function createCorsMiddleware(
  allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
) {
  return function corsMiddleware(req, res, next) {
    const requestOrigin = req.headers?.origin;
    const originToAllow =
      requestOrigin && requestOrigin === allowedOrigin
        ? requestOrigin
        : allowedOrigin;

    res.setHeader('Access-Control-Allow-Origin', originToAllow);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PATCH,PUT,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Requested-With,X-NagarSathi-Lang'
    );

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

