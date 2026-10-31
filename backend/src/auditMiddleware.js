import { AuditLog, saveDocument, maskAuditPayload } from '@nagarsathi/database';

const pendingAuditPromises = new Set();

/**
 * Enqueues a background AuditLog write.
 * Runs asynchronously in the background so it never blocks the citizen's HTTP response
 * or appears as a visible UI step.
 */
export function enqueueAuditLog({
  actor = 'SYSTEM',
  action,
  caseId = null,
  userId = null,
  payload = {},
}) {
  const promise = new Promise((resolve) => {
    setImmediate(async () => {
      try {
        await saveDocument(AuditLog, {
          actor,
          action,
          caseId: caseId ? String(caseId) : null,
          userId: userId ? String(userId) : null,
          timestamp: new Date(),
          maskedPayload: maskAuditPayload(payload),
        });
      } catch {
        // Background audit logging never crashes the request loop
      } finally {
        resolve();
      }
    });
  });

  pendingAuditPromises.add(promise);
  promise.finally(() => pendingAuditPromises.delete(promise));
  return promise;
}

/**
 * Waits for all background audit log writes to settle (useful in unit tests).
 */
export async function flushPendingAudits() {
  while (pendingAuditPromises.size > 0) {
    await Promise.all(Array.from(pendingAuditPromises));
  }
}

/**
 * Express middleware that logs state-changing API requests in the background
 * once the response finishes, with masked request/response metadata.
 */
export function auditLogMiddleware(req, res, next) {
  res.on('finish', () => {
    if (req.method === 'GET' && (req.path === '/health' || req.path === '/api/health')) {
      return;
    }
    const actor = req.auditMeta?.actor || (req.user ? 'CITIZEN' : 'SYSTEM');
    const action =
      req.auditMeta?.action || `${req.method} ${req.baseUrl || ''}${req.path}`;
    const caseId =
      req.auditMeta?.caseId || req.params?.caseId || req.body?.caseId || null;
    const userId = req.auditMeta?.userId || req.user?.id || null;

    enqueueAuditLog({
      actor,
      action,
      caseId,
      userId,
      payload: {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        body: req.body || {},
        ...(req.auditMeta?.extra || {}),
      },
    });
  });
  next();
}

