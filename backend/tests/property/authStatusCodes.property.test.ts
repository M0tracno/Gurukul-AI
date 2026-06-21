/**
 * Property 10: Authentication Status Codes
 *
 * Feature: gurukul-ai-modernization, Property 10: Authentication Status Codes
 *
 * For any protected endpoint, a request without a valid authentication token
 * SHALL receive HTTP 401, and a request with a valid token but insufficient
 * role permissions SHALL receive HTTP 403.
 *
 * **Validates: Requirements 4.4**
 */

import { jest, describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import type { Request, Response, NextFunction } from 'express';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the authTokenService with unstable_mockModule for ESM compatibility
const mockValidateAccessToken = jest.fn<() => Promise<unknown>>();
jest.unstable_mockModule('../../src/services/authTokenService.js', () => ({
  authTokenService: {
    validateAccessToken: mockValidateAccessToken,
  },
}));

const { authMiddleware } = await import('../../src/middleware/authMiddleware.js');
const { requireRoles } = await import('../../src/middleware/rbacMiddleware.js');
const { AppError } = await import('../../src/middleware/errorHandler.js');
import type { AppError as AppErrorType } from '../../src/middleware/errorHandler.js';
import type { UserRole } from '../../src/types/common.js';

function createMockRequest(headers: Record<string, string> = {}, user?: { userId: string; role: UserRole }): Request {
  const req = { headers } as unknown as Request;
  if (user) {
    (req as unknown as { user: typeof user }).user = user;
  }
  return req;
}

function createMockResponse(): Response {
  return {} as Response;
}

const ALL_ROLES: UserRole[] = ['admin', 'teacher', 'student', 'parent'];

/**
 * Arbitrary that generates random "invalid" authorization header values.
 * These simulate various ways a token can be missing or malformed.
 */
const invalidAuthHeaderArb = fc.oneof(
  // No authorization header at all
  fc.constant(undefined),
  // Empty string
  fc.constant(''),
  // Wrong scheme (not Bearer)
  fc.string({ minLength: 1, maxLength: 20 }).map((s: string) => `Basic ${s}`),
  fc.string({ minLength: 1, maxLength: 20 }).map((s: string) => `Token ${s}`),
  fc.string({ minLength: 1, maxLength: 20 }).map((s: string) => `Digest ${s}`),
  // Bearer with empty token
  fc.constant('Bearer '),
  // Bearer with random garbage tokens (will fail validation)
  fc.string({ minLength: 1, maxLength: 50 }).map((s: string) => `Bearer ${s}`),
  // Random strings that don't match any scheme
  fc.string({ minLength: 1, maxLength: 30 }),
);

/**
 * Arbitrary that generates a valid UserRole.
 */
const userRoleArb = fc.constantFrom<UserRole>('admin', 'teacher', 'student', 'parent');

/**
 * Arbitrary that generates a non-empty subset of roles to use as "allowed roles"
 * for a route, ensuring at least one role is excluded.
 */
const restrictedRoleSubsetArb = fc.shuffledSubarray(ALL_ROLES, { minLength: 1, maxLength: 3 })
  .filter(subset => subset.length < ALL_ROLES.length);

/**
 * Arbitrary that generates a role that is NOT in the given allowed set.
 */
function excludedRoleArb(allowedRoles: UserRole[]): fc.Arbitrary<UserRole> {
  const excluded = ALL_ROLES.filter(r => !allowedRoles.includes(r));
  if (excluded.length === 0) {
    // Should never happen due to restrictedRoleSubsetArb filter
    return fc.constantFrom<UserRole>('student');
  }
  return fc.constantFrom<UserRole>(...excluded);
}

describe('Property 10: Authentication Status Codes', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn() as unknown as NextFunction;
    jest.clearAllMocks();
  });

  describe('401 for invalid/missing tokens', () => {
    /**
     * For any request that has no valid authentication token (missing header,
     * wrong scheme, empty token, or invalid token), authMiddleware should
     * throw AppError with statusCode 401.
     */
    it('should return 401 for any request without a valid authentication token', async () => {
      await fc.assert(
        fc.asyncProperty(invalidAuthHeaderArb, async (authHeader) => {
          // For tokens that pass the Bearer format check but are invalid,
          // mock validateAccessToken to throw
          mockValidateAccessToken.mockRejectedValue(new Error('Invalid access token'));

          const headers: Record<string, string> = {};
          if (authHeader !== undefined) {
            headers['authorization'] = authHeader;
          }

          const req = createMockRequest(headers);

          let error: AppErrorType | null = null;
          try {
            await authMiddleware(req, createMockResponse(), mockNext);
          } catch (err) {
            error = err as AppErrorType;
          }

          // Must throw an error
          expect(error).not.toBeNull();
          expect(error).toBeInstanceOf(AppError);
          // Must be HTTP 401 Unauthorized
          expect(error!.statusCode).toBe(401);
          expect(error!.errorCode).toBe('UNAUTHORIZED');
          // next() should NOT have been called
          expect(mockNext).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any random string used as a token value (simulating expired/tampered tokens),
     * the authMiddleware should return 401 when validateAccessToken rejects.
     */
    it('should return 401 for expired tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          async (tokenValue) => {
            // Simulate expired token
            mockValidateAccessToken.mockRejectedValue(new Error('Access token has expired'));

            const req = createMockRequest({ authorization: `Bearer ${tokenValue}` });

            let error: AppErrorType | null = null;
            try {
              await authMiddleware(req, createMockResponse(), mockNext);
            } catch (err) {
              error = err as AppErrorType;
            }

            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(AppError);
            expect(error!.statusCode).toBe(401);
            expect(error!.errorCode).toBe('UNAUTHORIZED');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('403 for valid token with insufficient permissions', () => {
    /**
     * For any protected route that allows a restricted subset of roles,
     * and a user authenticated with a role NOT in the allowed set,
     * requireRoles should throw AppError with statusCode 403.
     */
    it('should return 403 when authenticated user role is not in allowed roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          restrictedRoleSubsetArb,
          fc.string({ minLength: 5, maxLength: 24 }),
          async (allowedRoles, userId) => {
            // Pick a role that is NOT in the allowed set
            const userRole = fc.sample(excludedRoleArb(allowedRoles), 1)[0];

            const middleware = requireRoles(...allowedRoles);
            const req = createMockRequest({}, { userId, role: userRole });

            let error: AppErrorType | null = null;
            try {
              middleware(req, createMockResponse(), mockNext);
            } catch (err) {
              error = err as AppErrorType;
            }

            // Must throw an error
            expect(error).not.toBeNull();
            expect(error).toBeInstanceOf(AppError);
            // Must be HTTP 403 Forbidden
            expect(error!.statusCode).toBe(403);
            expect(error!.errorCode).toBe('FORBIDDEN');
            // next() should NOT have been called
            expect(mockNext).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Complementary property: For any user with a role that IS in the allowed set,
     * requireRoles should call next() without throwing.
     */
    it('should call next() when authenticated user role is in allowed roles (control property)', async () => {
      await fc.assert(
        fc.asyncProperty(
          restrictedRoleSubsetArb,
          fc.string({ minLength: 5, maxLength: 24 }),
          async (allowedRoles, userId) => {
            // Pick a role that IS in the allowed set
            const userRole = fc.sample(fc.constantFrom<UserRole>(...allowedRoles), 1)[0];

            const middleware = requireRoles(...allowedRoles);
            const req = createMockRequest({}, { userId, role: userRole });

            // Should NOT throw
            expect(() => {
              middleware(req, createMockResponse(), mockNext);
            }).not.toThrow();

            // next() should have been called
            expect(mockNext).toHaveBeenCalledTimes(1);

            // Reset mock for next iteration
            (mockNext as jest.Mock).mockClear();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('401 takes precedence over 403 (unauthenticated vs unauthorized)', () => {
    /**
     * For any combination of missing auth + RBAC restricted route,
     * the system should return 401 (not 403) because the user hasn't
     * proven their identity yet.
     */
    it('should return 401 (not 403) when no auth token is provided regardless of route permissions', async () => {
      await fc.assert(
        fc.asyncProperty(restrictedRoleSubsetArb, async (allowedRoles) => {
          mockValidateAccessToken.mockRejectedValue(new Error('Invalid access token'));

          // Request has no Authorization header
          const req = createMockRequest({});

          let error: AppErrorType | null = null;
          try {
            // authMiddleware runs first in the chain
            await authMiddleware(req, createMockResponse(), mockNext);
          } catch (err) {
            error = err as AppErrorType;
          }

          // Must get 401 from authMiddleware (before RBAC even runs)
          expect(error).not.toBeNull();
          expect(error).toBeInstanceOf(AppError);
          expect(error!.statusCode).toBe(401);
          expect(error!.errorCode).toBe('UNAUTHORIZED');
        }),
        { numRuns: 100 },
      );
    });
  });
});
