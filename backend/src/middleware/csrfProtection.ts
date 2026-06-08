import type { Request, Response, NextFunction } from 'express';

import { AppError } from './errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Secure cookie configuration constants.
 * Apply these settings to any cookies set by the backend (e.g., refresh tokens).
 */
export const COOKIE_CONFIG = {
  /** SameSite=Strict prevents the cookie from being sent on cross-origin requests */
  sameSite: 'strict' as const,
  /** HttpOnly prevents JavaScript access to the cookie */
  httpOnly: true,
  /** Secure ensures the cookie is only sent over HTTPS */
  secure: process.env.NODE_ENV === 'production',
  /** Path restricts cookie scope */
  path: '/',
} as const;

/**
 * HTTP methods that are considered "safe" (read-only) and do not require CSRF protection.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * The custom header name required for cookie-authenticated state-changing requests.
 * Browsers do not allow cross-origin requests to set custom headers without a CORS preflight,
 * providing CSRF protection for AJAX-based SPAs.
 */
export const CSRF_HEADER_NAME = 'x-requested-with';

/**
 * Expected value for the custom CSRF header.
 */
export const CSRF_HEADER_VALUE = 'XMLHttpRequest';

/**
 * Options to configure the CSRF protection middleware.
 */
export interface CsrfProtectionOptions {
  /**
   * List of path prefixes to exclude from CSRF checks (e.g., webhook endpoints).
   * Paths are matched with startsWith comparison.
   */
  excludePaths?: string[];

  /**
   * Allowed origins for origin validation (for cookie-based auth).
   * Defaults to FRONTEND_URL from environment.
   */
  allowedOrigins?: string[];
}

/**
 * Determines if the request is authenticated via Bearer token in the Authorization header.
 * When using Bearer tokens, CSRF is mitigated by default because browsers don't
 * automatically attach Authorization headers to cross-origin requests.
 */
function hasBearerAuth(req: Request): boolean {
  const authHeader = req.headers.authorization;
  return Boolean(authHeader && authHeader.startsWith('Bearer '));
}

/**
 * Determines if the request uses cookie-based authentication.
 * This checks for the presence of auth-related cookies (e.g., refresh token).
 */
function hasCookieAuth(req: Request): boolean {
  const cookies = req.headers.cookie;
  if (!cookies) return false;

  // Check for common auth cookie patterns
  return (
    cookies.includes('refreshToken=') ||
    cookies.includes('refresh_token=') ||
    cookies.includes('session=') ||
    cookies.includes('sid=')
  );
}

/**
 * Validates the Origin or Referer header against allowed origins.
 * Returns true if the origin is valid or if no origin/referer is present
 * (same-origin requests in some browsers may not include these headers).
 */
function isValidOrigin(req: Request, allowedOrigins: string[]): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // If Origin header is present, validate it
  if (origin) {
    return allowedOrigins.some(
      (allowed) => origin === allowed || origin.startsWith(allowed),
    );
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      return allowedOrigins.some(
        (allowed) => refererOrigin === allowed || refererOrigin.startsWith(allowed),
      );
    } catch {
      // Invalid referer URL — reject
      return false;
    }
  }

  // No Origin or Referer: could be same-origin or non-browser client.
  // For API-only backends, this is typically safe. However, for cookie-based
  // flows we require the custom header as an additional check.
  return false;
}

/**
 * CSRF protection middleware for state-changing endpoints.
 *
 * Strategy:
 * 1. Safe methods (GET, HEAD, OPTIONS) are always allowed through.
 * 2. Requests with Bearer token auth are allowed through — browsers don't
 *    auto-send Authorization headers cross-origin, preventing CSRF.
 * 3. For cookie-based auth on state-changing methods:
 *    - Requires a custom header (X-Requested-With: XMLHttpRequest) which
 *      cannot be sent cross-origin without CORS preflight approval.
 *    - Validates Origin/Referer header against allowed origins.
 * 4. Excluded paths (e.g., webhooks) bypass all checks.
 *
 * @param options - Configuration options for the middleware.
 */
export function csrfProtectionMiddleware(options: CsrfProtectionOptions = {}) {
  const {
    excludePaths = [],
    allowedOrigins = getAllowedOrigins(),
  } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    // 1. Safe methods don't need CSRF protection
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    // 2. Check excluded paths (webhooks, etc.)
    const requestPath = req.path;
    const isExcluded = excludePaths.some((prefix) =>
      requestPath.startsWith(prefix),
    );
    if (isExcluded) {
      next();
      return;
    }

    // 3. If using Bearer token auth, CSRF is already mitigated
    if (hasBearerAuth(req)) {
      next();
      return;
    }

    // 4. For cookie-based auth (or unauthenticated state-changing requests),
    //    require the custom header AND valid origin
    if (hasCookieAuth(req)) {
      const customHeader = req.headers[CSRF_HEADER_NAME];

      if (!customHeader || customHeader !== CSRF_HEADER_VALUE) {
        logger.warn('CSRF protection: missing or invalid X-Requested-With header', {
          path: requestPath,
          method: req.method,
          ip: req.ip,
        });
        throw AppError.forbidden(
          'CSRF validation failed: missing required security header',
        );
      }

      // Validate origin/referer for cookie-based requests
      if (allowedOrigins.length > 0 && !isValidOrigin(req, allowedOrigins)) {
        logger.warn('CSRF protection: invalid origin for cookie-based request', {
          path: requestPath,
          method: req.method,
          origin: req.headers.origin,
          referer: req.headers.referer,
          ip: req.ip,
        });
        throw AppError.forbidden(
          'CSRF validation failed: request origin not allowed',
        );
      }

      next();
      return;
    }

    // 5. For requests without any auth (neither Bearer nor cookie),
    //    allow through — these will be rejected later by auth middleware
    //    if the endpoint requires authentication.
    next();
  };
}

/**
 * Resolves allowed origins from environment configuration.
 */
function getAllowedOrigins(): string[] {
  const frontendUrl = process.env.FRONTEND_URL;
  const origins: string[] = [];

  if (frontendUrl) {
    origins.push(frontendUrl);
  }

  // In development, also allow localhost variants
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:5173');
    origins.push('http://127.0.0.1:3000');
    origins.push('http://127.0.0.1:5173');
  }

  return origins;
}
