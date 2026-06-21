import type { Request } from 'express';

import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';

/**
 * Actor/context block recorded alongside every privileged audit entry.
 *
 * Built from the authenticated request so that services remain HTTP-agnostic:
 * controllers call {@link auditContextFrom} and pass the resulting context to
 * the service layer, which forwards it to `auditService`.
 *
 * @see design.md "Audit integration" (Requirement 11)
 */
export interface AuditContext {
  /** Authenticated actor id (`req.user.userId`). */
  userId: string;
  /** Authenticated actor role (`req.user.role`). */
  role: string;
  /** Source IP, resolved from `req.ip` / the `X-Forwarded-For` header. */
  ip: string;
  /** Request correlation id from the correlationId middleware. */
  correlationId: string;
}

/**
 * Secret vocabulary matched (case-insensitively) as a substring of any key.
 *
 * Substring matching ensures that not only exact keys (`password`, `token`)
 * but also every variant built around them is stripped, e.g. `temporaryPassword`,
 * `setupToken`, `accessToken`, `refreshToken`, `rawToken`, `otp`, and `otpHash`.
 * The values themselves (plaintext passwords, OTP codes, raw setup/access/refresh
 * tokens) are removed entirely before any write.
 *
 * Idempotence is preserved because a key that matched once still matches on a
 * second pass, so redacting an already-redacted object is a no-op.
 *
 * @see Requirements 8.4, 8.5, 11.4
 */
const SECRET_KEY_SUBSTRINGS: readonly string[] = [
  'password',
  'passwd',
  'otp',
  'token',
  'secret',
  'apikey',
  'credential',
];

/** Placeholder substituted for any redacted secret value. */
const REDACTION_PLACEHOLDER = '[REDACTED]';

/**
 * Decide whether a metadata key names a secret that must be redacted.
 *
 * Matching is case-insensitive and substring-based, so `OTP`, `otpHash`,
 * `accessToken`, `refreshToken`, `rawToken`, and `temporaryPassword` are all
 * recognized as secret-bearing keys.
 */
function isSecretKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return SECRET_KEY_SUBSTRINGS.some((needle) => lowered.includes(needle));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Resolve the source IP for an incoming request.
 *
 * Prefers Express's resolved `req.ip` (which honours `trust proxy`), falling
 * back to the first hop in the `X-Forwarded-For` header, then to `'unknown'`
 * so the audit context always carries a non-empty value.
 */
function resolveIp(req: Request): string {
  if (req.ip) {
    return req.ip;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    // X-Forwarded-For may be a comma-separated list; the left-most entry is
    // the originating client.
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.split(',')[0]!.trim();
  }

  return 'unknown';
}

/**
 * Build an {@link AuditContext} from an authenticated request.
 *
 * Reads identity from `req.user` (attached by `authMiddleware`), the source IP
 * from `req.ip` / `X-Forwarded-For`, and the correlation id attached by the
 * correlationId middleware.
 */
export function auditContextFrom(req: AuthenticatedRequest): AuditContext {
  return {
    userId: req.user.userId,
    role: req.user.role,
    ip: resolveIp(req),
    correlationId: req.correlationId,
  };
}

/**
 * Recursively strip secret keys from audit/log metadata before it is written.
 *
 * Any key whose name contains a secret token from {@link SECRET_KEY_SUBSTRINGS}
 * (case-insensitively) has its value replaced with a placeholder, at any depth,
 * including inside nested objects and arrays. This covers OTP codes (`otp`,
 * `otpHash`), passwords (`password`, `temporaryPassword`), and raw tokens
 * (`token`, `setupToken`, `accessToken`, `refreshToken`, `rawToken`).
 *
 * The input is never mutated; a redacted copy is returned. Redaction is
 * idempotent: applying it to an already-redacted object yields the same result.
 * This guard MUST be applied to every metadata object before it reaches the
 * audit store or the application logger.
 *
 * @see Requirements 8.4, 8.5, 11.4
 */
export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as unknown as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSecretKey(key)) {
        result[key] = REDACTION_PLACEHOLDER;
      } else {
        result[key] = redactSecrets(val);
      }
    }
    return result as T;
  }

  return value;
}
