import crypto from 'node:crypto';

export const AUTH_COOKIE_NAME = 'ns_token';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'nagarsathi-dev-local-jwt-secret-key';
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Signs a JWT (HS256) with payload { sub, phoneMasked, role: 'citizen', language, iat, exp }.
 */
export function signCitizenJwt(payload, expiresInSeconds = 24 * 60 * 60) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload = {
    role: 'citizen',
    ...payload,
    iat: nowSec,
    exp: nowSec + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = base64UrlEncode(
    crypto.createHmac('sha256', getJwtSecret()).update(signingInput).digest()
  );

  return `${signingInput}.${signature}`;
}

/**
 * Verifies an HS256 JWT and returns its decoded payload, or throws on invalid/expired token.
 */
export function verifyCitizenJwt(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Missing JWT token');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token');
  }
  const [encodedHeader, encodedPayload, providedSig] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', getJwtSecret()).update(signingInput).digest()
  );

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid JWT signature');
  }

  const decoded = JSON.parse(base64UrlDecode(encodedPayload));
  const nowSec = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < nowSec) {
    throw new Error('Expired JWT token');
  }
  return decoded;
}

/**
 * Parses HTTP Cookie header into key-value object.
 */
export function parseCookieHeader(cookieHeader = '') {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    if (key) out[key] = val;
  }
  return out;
}

/**
 * Express middleware that authenticates a citizen from the httpOnly cookie `ns_token`
 * (or Authorization: Bearer header) and enforces `role === 'citizen'`.
 */
export function requireCitizenAuth(req, res, next) {
  try {
    const cookies = parseCookieHeader(req.headers?.cookie || '');
    let token = cookies[AUTH_COOKIE_NAME];

    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice('Bearer '.length).trim();
    }

    if (!token) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        display: 'कृपया प्रथम मोबाईल OTP ने लॉगिन करा.',
        speech: 'कृपया प्रथम लॉगिन करा.',
        data: { authenticated: false },
      });
    }

    const decoded = verifyCitizenJwt(token);
    if (decoded.role !== 'citizen') {
      return res.status(403).json({
        error: 'FORBIDDEN_ROLE',
        display: 'केवळ नागरिक भूमिकेला परवानगी आहे.',
        speech: 'प्रवेश नाकारला.',
        data: { authenticated: false },
      });
    }

    req.user = {
      id: String(decoded.sub),
      phoneMasked: decoded.phoneMasked,
      role: decoded.role,
      language: decoded.language || 'mr-IN',
    };
    return next();
  } catch {
    return res.status(401).json({
      error: 'INVALID_OR_EXPIRED_TOKEN',
      display: 'सत्र संपले आहे. कृपया पुन्हा लॉगिन करा.',
      speech: 'कृपया पुन्हा लॉगिन करा.',
      data: { authenticated: false },
    });
  }
}

/**
 * Verifies that the authenticated citizen owns the target resource userId.
 * Returns true if allowed, or sends HTTP 403 CROSS_USER_ACCESS_DENIED and returns false.
 */
export function assertSameCitizen(req, res, targetUserId) {
  if (!req.user?.id || String(req.user.id) !== String(targetUserId)) {
    res.status(403).json({
      error: 'CROSS_USER_ACCESS_DENIED',
      display: 'तुम्ही फक्त तुमची स्वतःची माहिती आणि प्रकरणे पाहू शकता.',
      speech: 'तुम्हाला दुसऱ्या नागरिकाची माहिती पाहण्याची परवानगी नाही.',
      data: { allowed: false },
    });
    return false;
  }
  return true;
}

