/**
 * Property-Based Test: CSRF Protection for State-Changing Endpoints (Property 31)
 *
 * Feature: gurukul-ai-modernization, Property 31: CSRF Protection for State-Changing Endpoints
 *
 * For any POST, PUT, DELETE, or PATCH request lacking a valid CSRF token or
 * SameSite cookie protection, the Backend_Service SHALL reject the request.
 *
 * **Validates: Requirements 12.4**
 */

import * as fc from 'fast-check';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

import {
  csrfProtectionMiddleware,
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
} from '../../src/middleware/csrfProtection.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import { logger } from '../../src/utils/logger.js';

// Suppress logger output during tests
beforeEach(() => {
  jest.spyOn(logger, 'warn').mockImplementation(() => logger);
});

const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://app.gurukul.ai'];

const middleware = csrfProtectionMiddleware({
  allowedOrigins: ALLOWED_ORIGINS,
});

/**
 * Helper to create mock request/response/next objects.
 */
function createMocks(overrides: {
  method?: string;
  path?: string;
  headers?: Record<string, string | undefined>;
} = {}) {
  const req = {
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/api/v1/resource',
    headers: overrides.headers ?? {},
    ip: '127.0.0.1',
  } as unknown as Request;

  const res = {} as Response;
  const next: NextFunction = jest.fn();

  return { req, res, next };
}

// --- Generators ---

/**
 * Arbitrary that generates state-changing HTTP methods (POST, PUT, DELETE, PATCH).
 */
const stateChangingMethodArb = fc.constantFrom('POST', 'PUT', 'DELETE', 'PATCH');

/**
 * Arbitrary that generates auth cookie strings (patterns recognized by the middleware).
 */
const authCookieArb = fc.oneof(
  fc.string({ minLength: 5, maxLength: 40 }).map((v) => `refreshToken=${v}`),
  fc.string({ minLength: 5, maxLength: 40 }).map((v) => `refresh_token=${v}`),
  fc.string({ minLength: 5, maxLength: 40 }).map((v) => `session=${v}`),
  fc.string({ minLength: 5, maxLength: 40 }).map((v) => `sid=${v}`),
);

/**
 * Arbitrary that generates random API paths.
 */
const apiPathArb = fc.oneof(
  fc.constant('/api/v1/students'),
  fc.constant('/api/v1/courses'),
  fc.constant('/api/v1/attendance'),
  fc.constant('/api/v1/marks'),
  fc.constant('/api/v1/messages'),
  fc.constant('/api/v1/users/profile'),
  fc.string({ minLength: 3, maxLength: 30 })
    .filter((s) => !s.includes('\x00'))
    .map((s) => `/api/v1/${s.replace(/[^a-zA-Z0-9/-]/g, '')}`),
);

/**
 * Arbitrary that generates invalid or missing CSRF header values.
 * These represent the absence of proper CSRF token/header.
 */
const missingOrInvalidCsrfHeaderArb = fc.oneof(
  // No header at all (undefined)
  fc.constant(undefined),
  // Empty string
  fc.constant(''),
  // Wrong values that aren't "XMLHttpRequest"
  fc.constantFrom(
    'FetchRequest',
    'httpRequest',
    'xmlhttprequest', // case-sensitive match required
    'XMLHttpRequests',
    'XHR',
    'ajax',
  ),
  // Random strings that aren't the expected value
  fc.string({ minLength: 1, maxLength: 30 })
    .filter((s) => s !== CSRF_HEADER_VALUE),
);

/**
 * Arbitrary that generates origin headers from invalid (attacker) domains.
 */
const invalidOriginArb = fc.oneof(
  fc.constantFrom(
    'https://evil-site.com',
    'https://attacker.io',
    'http://phishing.example.org',
    'https://fake-gurukul.ai',
    'http://localhost:9999',
    'http://127.0.0.1:4444',
  ),
  fc.webUrl().filter(
    (url) => !ALLOWED_ORIGINS.some((allowed) => url.startsWith(allowed)),
  ),
);

describe('Property 31: CSRF Protection for State-Changing Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Core property: For any state-changing request (POST/PUT/DELETE/PATCH) with
   * cookie-based authentication that does NOT include a valid CSRF header
   * (X-Requested-With: XMLHttpRequest), the middleware SHALL reject it.
   */
  it('should reject state-changing requests with cookie auth but missing/invalid CSRF header', () => {
    fc.assert(
      fc.property(
        stateChangingMethodArb,
        authCookieArb,
        apiPathArb,
        missingOrInvalidCsrfHeaderArb,
        (method, cookie, path, csrfHeader) => {
          const headers: Record<string, string | undefined> = {
            cookie,
          };
          if (csrfHeader !== undefined) {
            headers[CSRF_HEADER_NAME] = csrfHeader;
          }

          const { req, res, next } = createMocks({ method, path, headers });

          expect(() => middleware(req, res, next)).toThrow(AppError);

          try {
            middleware(req, res, next);
          } catch (err) {
            const appErr = err as AppError;
            expect(appErr.statusCode).toBe(403);
            expect(appErr.errorCode).toBe('FORBIDDEN');
            expect(appErr.message).toContain('CSRF validation failed');
          }

          expect(next).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any state-changing request with cookie auth that has the
   * correct CSRF header but an INVALID origin, the middleware SHALL reject it.
   */
  it('should reject state-changing requests with cookie auth and correct CSRF header but invalid origin', () => {
    fc.assert(
      fc.property(
        stateChangingMethodArb,
        authCookieArb,
        apiPathArb,
        invalidOriginArb,
        (method, cookie, path, origin) => {
          const headers: Record<string, string | undefined> = {
            cookie,
            [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
            origin,
          };

          const { req, res, next } = createMocks({ method, path, headers });

          expect(() => middleware(req, res, next)).toThrow(AppError);

          try {
            middleware(req, res, next);
          } catch (err) {
            const appErr = err as AppError;
            expect(appErr.statusCode).toBe(403);
            expect(appErr.errorCode).toBe('FORBIDDEN');
            expect(appErr.message).toContain('CSRF validation failed');
          }

          expect(next).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Control property (positive case): Cookie-authenticated state-changing requests
   * WITH valid CSRF header AND valid origin should pass through.
   * This validates that our rejection logic is targeted and not overly broad.
   */
  it('should allow state-changing requests with cookie auth, valid CSRF header, and valid origin', () => {
    fc.assert(
      fc.property(
        stateChangingMethodArb,
        authCookieArb,
        apiPathArb,
        fc.constantFrom(...ALLOWED_ORIGINS),
        (method, cookie, path, origin) => {
          const headers: Record<string, string | undefined> = {
            cookie,
            [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
            origin,
          };

          const { req, res, next } = createMocks({ method, path, headers });

          // Should NOT throw
          expect(() => middleware(req, res, next)).not.toThrow();
          expect(next).toHaveBeenCalled();

          // Reset mock for next iteration
          (next as jest.Mock).mockClear();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: SameSite cookie attribute configuration ensures cookies configured
   * by the backend use SameSite=Strict, which prevents cross-origin sending.
   * Combined with the custom header check, this provides layered CSRF protection.
   *
   * Specifically: for any state-changing method, if the request has cookies but
   * no CSRF header AND no Bearer token, it must be rejected regardless of path.
   */
  it('should reject all state-changing methods uniformly when CSRF protection is missing', () => {
    fc.assert(
      fc.property(
        stateChangingMethodArb,
        authCookieArb,
        fc.string({ minLength: 1, maxLength: 50 })
          .map((s) => `/api/v1/${s.replace(/[^a-zA-Z0-9/-]/g, '')}`),
        (method, cookie, path) => {
          // Request with cookie auth but NO CSRF header at all
          const { req, res, next } = createMocks({
            method,
            path,
            headers: { cookie },
          });

          expect(() => middleware(req, res, next)).toThrow(AppError);
          expect(next).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
