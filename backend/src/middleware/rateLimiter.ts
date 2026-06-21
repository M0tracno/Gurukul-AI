import type { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { auditService } from '../services/auditService.js';
import { failure } from '../utils/envelope.js';
import { logger } from '../utils/logger.js';
import type { AuthenticatedRequest } from './rbacMiddleware.js';

/**
 * Per-endpoint rate limiting and failed-auth audit logging for the
 * admin-management surface (Requirements 1.6, 9.4).
 *
 * The global `apiLimiter` in `server.ts` throttles *all* `/api/` traffic at a
 * lenient 100 requests / 15 min. This module adds a much stricter, source-IP
 * keyed limiter that only counts *failed* requests, plus a small audit hook
 * that records failed authentication (HTTP 401) and failed password-reset
 * attempts. Together these throttle brute-force credential guessing and
 * account-enumeration probing against the student/faculty admin endpoints.
 *
 * Intended chain order on an admin-management route:
 *   failedAuthAuditLogger -> adminRateLimiter -> authMiddleware -> requireRoles
 *   -> validateRequest -> controller
 */

/** Stricter window/limit than the global API limiter. */
const STRICT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const STRICT_MAX_FAILURES = 10; // failed attempts per IP per window

/**
 * Resolve the source IP for an incoming request.
 *
 * Prefers Express's resolved `req.ip` (which honours `trust proxy`), falling
 * back to the left-most hop of the `X-Forwarded-For` header, then to
 * `'unknown'` so a non-empty value is always available for audit logging.
 */
function resolveIp(req: Request): string {
  if (req.ip) {
    return req.ip;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.split(',')[0]!.trim();
  }

  return 'unknown';
}

/** True when the request targets an admin password-reset endpoint. */
function isPasswordResetRequest(req: Request): boolean {
  // `req.path` is relative to the router mount; `originalUrl` is the full
  // path. Check both so the detection works under nested routers and direct
  // mounts alike.
  return (
    req.path.endsWith('/password-reset') ||
    req.originalUrl.includes('/password-reset')
  );
}

/**
 * Stricter, source-IP keyed rate limiter for admin-management and
 * password-reset endpoints.
 *
 * `skipSuccessfulRequests` means only responses with status >= 400 count
 * toward the limit, so a legitimate admin making valid calls is never
 * throttled, while an attacker generating repeated 401/404 responses from a
 * single source is quickly cut off (Requirements 1.6, 9.4).
 */
export const adminRateLimiter = rateLimit({
  windowMs: STRICT_WINDOW_MS,
  limit: STRICT_MAX_FAILURES,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by source IP. `ipKeyGenerator` normalises IPv6 addresses into a
  // subnet so a single client cannot trivially rotate addresses to evade
  // the limit.
  keyGenerator: (req: Request): string => ipKeyGenerator(resolveIp(req)),
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many failed attempts, please try again later',
  },
});

/**
 * Audit hook that records failed authentication and failed password-reset
 * attempts for enumeration prevention (Requirements 1.6, 9.4).
 *
 * Registers a `finish` listener before the rest of the chain runs so the
 * final response status is observable. On a 401 (failed authentication) or a
 * failed reset attempt (any >= 400 response on a password-reset route — e.g.
 * a 404 for a non-existent account), it invokes `auditService.logFailedAuth`.
 * The audit write is fire-and-forget; a failure to log is itself logged but
 * never blocks or fails the request.
 */
export function failedAuthAuditLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.on('finish', () => {
    const status = res.statusCode;
    const resetAttempt = isPasswordResetRequest(req);
    const failedReset = resetAttempt && status >= 400;

    if (status !== 401 && !failedReset) {
      return;
    }

    const user = (req as Partial<AuthenticatedRequest>).user;
    const userId = user?.userId ?? 'anonymous';
    const role = user?.role ?? 'anonymous';
    const ip = resolveIp(req);
    const correlationId = req.correlationId ?? 'unknown';
    const reason = failedReset
      ? `failed_password_reset:${status}`
      : 'failed_authentication';

    void auditService
      .logFailedAuth(userId, role, ip, correlationId, reason)
      .catch((error: unknown) => {
        logger.error('Failed to record failed-auth audit entry', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  next();
}

/**
 * Convenience bundle applied at the top of the student/faculty routers:
 * the audit logger first (so the `finish` hook is attached even when the
 * limiter short-circuits with 429), then the strict limiter.
 */
export const adminManagementRateLimit: Array<
  (req: Request, res: Response, next: NextFunction) => void
> = [failedAuthAuditLogger, adminRateLimiter];

/** Window/limit for general-purpose write (mutation) endpoints. */
const WRITE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const WRITE_MAX_REQUESTS = 60; // write requests per IP per window

/**
 * General-purpose, source-IP keyed rate limiter for write (mutation)
 * endpoints introduced by this feature — messaging `POST`/`DELETE`, feedback
 * `POST`, etc. (Requirements 3.7, 5.7, 12.8).
 *
 * Unlike {@link adminRateLimiter}, this counts *all* requests (successful and
 * failed) so that bursts of writes from a single source are throttled
 * regardless of outcome. On breach it responds with HTTP 429 and the canonical
 * failure {@link ErrorEnvelope} so clients handle it uniformly. Apply it ahead
 * of `authMiddleware` on the specific write routes that need it (order:
 * `Rate_Limiter → auth → rbac → validate → controller`).
 */
export const writeRateLimit = rateLimit({
  windowMs: WRITE_WINDOW_MS,
  limit: WRITE_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by source IP, normalising IPv6 addresses into a subnet so a single
  // client cannot trivially rotate addresses to evade the limit.
  keyGenerator: (req: Request): string => ipKeyGenerator(resolveIp(req)),
  message: failure('Too many requests, please try again later'),
});
