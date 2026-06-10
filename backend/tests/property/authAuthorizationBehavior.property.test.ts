/**
 * Property-Based Tests: Authentication & Authorization Middleware Behavior
 *
 * Feature: secure-admin-user-management, Property 4: Missing or invalid authentication is rejected with 401
 * Feature: secure-admin-user-management, Property 5: Valid tokens attach identity before authorization
 * Feature: secure-admin-user-management, Property 6: Authentication precedence over authorization
 * Feature: secure-admin-user-management, Property 7: Non-admins cannot change account records, role, or isAdmin
 *
 * Property 4: For any request to an admin-management endpoint that presents no
 * Authorization header or a malformed Authorization header, the System SHALL
 * respond with HTTP 401 and SHALL NOT execute the route handler.
 * **Validates: Requirements 1.2, 1.4**
 *
 * Property 5: For any valid access token carrying a `userId` and `role`,
 * `authMiddleware` SHALL attach `{ userId, role }` matching the token claims to
 * the request before any authorization check runs.
 * **Validates: Requirements 1.5**
 *
 * Property 6: For any request, the System SHALL respond with HTTP 401 when
 * authentication is missing or invalid (even when the role would also be
 * insufficient), and SHALL respond with HTTP 403 only when authentication
 * succeeds but the authenticated role lacks the required `admin` role.
 * **Validates: Requirements 2.2, 2.5, 12.5, 12.6**
 *
 * Property 7: For any authenticated Non_Admin issuing a create, update, or
 * delete on a Student_Account or Faculty_Account — including attempts to set
 * `role` or `isAdmin` — the System SHALL respond with HTTP 403 and the targeted
 * record's persisted fields SHALL remain unchanged.
 * **Validates: Requirements 2.2, 2.4**
 *
 * These properties exercise the real `authMiddleware` and `requireRoles`
 * middleware with mocked Express `Request`/`Response`/`NextFunction` objects, so
 * no database or HTTP server is involved. Valid access tokens are signed with
 * the same JWT secret `authTokenService.validateAccessToken` verifies against.
 */

import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import type { Request, Response, NextFunction } from 'express';

import { authMiddleware } from '../../src/middleware/authMiddleware.js';
import { requireRoles, type AuthenticatedRequest } from '../../src/middleware/rbacMiddleware.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import type { UserRole } from '../../src/types/common.js';

// ---------------------------------------------------------------------------
// Environment / isolation setup
// ---------------------------------------------------------------------------

// A 403 RBAC denial fires `auditService.logEvent` (fire-and-forget) which calls
// the AuditLog model. These middleware properties run without a DB connection,
// so disable command buffering: the audit write then rejects immediately and is
// swallowed by the middleware's own `.catch`, leaving no dangling timers/handles.
mongoose.set('bufferCommands', false);

const JWT_SECRET = 'test-jwt-secret-auth-authorization-behavior';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Valid 24-char hex ObjectId-like strings used as token subjects. */
const hexChars = '0123456789abcdef';
const objectIdArb = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 24, maxLength: 24 })
  .map((arr) => arr.map((i) => hexChars[i]).join(''));

/** All roles the system understands. */
const anyRoleArb = fc.constantFrom<UserRole>(
  'admin',
  'teacher',
  'faculty',
  'student',
  'parent',
);

/** Every role except `admin` — i.e. a Non_Admin actor. */
const nonAdminRoleArb = fc.constantFrom<UserRole>(
  'teacher',
  'faculty',
  'student',
  'parent',
);

/** Write methods that create, update, or delete an account record. */
const writeMethodArb = fc.constantFrom('POST', 'PUT', 'DELETE');

/** A non-empty lowercase-hex string (fast-check v4 dropped `fc.hexaString`). */
const hexStringArb = (minLength: number, maxLength: number): fc.Arbitrary<string> =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength, maxLength })
    .map((arr) => arr.map((i) => hexChars[i]).join(''));

/** Sign a valid access token using the same secret the middleware verifies. */
function signValidToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * An Authorization header (or absence of one) that authMiddleware must reject:
 * missing, empty, wrong scheme, bearer-with-no-token, opaque garbage, and a
 * structurally-valid JWT signed with the WRONG secret.
 */
const invalidAuthArb: fc.Arbitrary<{ header: string | undefined }> = fc.oneof(
  // Missing header entirely.
  fc.constant({ header: undefined }),
  // Empty / whitespace header (falsy → treated as missing).
  fc.constant({ header: '' }),
  // Wrong scheme (case-sensitive: only "Bearer " is accepted).
  fc
    .tuple(
      fc.constantFrom('Token', 'Basic', 'JWT', 'bearer', 'BEARER'),
      hexStringArb(1, 24),
    )
    .map(([scheme, val]) => ({ header: `${scheme} ${val}` })),
  // Bearer scheme but no token value.
  fc.constantFrom({ header: 'Bearer' }, { header: 'Bearer ' }),
  // Bearer scheme with opaque non-JWT garbage.
  hexStringArb(4, 40).map((t) => ({ header: `Bearer ${t}` })),
  // Bearer scheme with a JWT signed by the WRONG secret (signature fails).
  fc
    .record({ userId: objectIdArb, role: anyRoleArb })
    .map(({ userId, role }) => ({
      header: `Bearer ${jwt.sign({ userId, role }, 'a-totally-different-secret')}`,
    })),
);

// ---------------------------------------------------------------------------
// Mock Express helpers
// ---------------------------------------------------------------------------

function makeReq(
  header: string | undefined,
  extra: Partial<Request> = {},
): Request {
  const headers: Record<string, string> = {};
  if (header !== undefined) {
    headers.authorization = header;
  }
  return { headers, ...extra } as unknown as Request;
}

/** Minimal Response stub (authMiddleware/requireRoles never touch it on these paths). */
const noopRes = {} as Response;

/**
 * Drive `authMiddleware` once with a mocked request and report the outcome:
 * whether `next()` ran, and any thrown `AppError`.
 */
async function runAuth(
  header: string | undefined,
  extra: Partial<Request> = {},
): Promise<{
  ok: boolean;
  req: Request;
  nextCalled: boolean;
  error?: AppError;
}> {
  const req = makeReq(header, extra);
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  try {
    await authMiddleware(req, noopRes, next);
    return { ok: true, req, nextCalled };
  } catch (err) {
    return {
      ok: false,
      req,
      nextCalled,
      error: err instanceof AppError ? err : undefined,
    };
  }
}

// ===========================================================================
// Property 4: Missing or invalid authentication is rejected with 401
// ===========================================================================
// Feature: secure-admin-user-management, Property 4: Missing or invalid authentication is rejected with 401
describe('Property 4: Missing or invalid authentication is rejected with 401', () => {
  it('rejects any missing/malformed/invalid Authorization header with 401 and never calls next()', async () => {
    await fc.assert(
      fc.asyncProperty(invalidAuthArb, async ({ header }) => {
        const outcome = await runAuth(header);

        // authMiddleware must throw rather than continue the chain.
        expect(outcome.ok).toBe(false);
        // The route handler is never reached (next was not invoked).
        expect(outcome.nextCalled).toBe(false);
        // The denial is a 401 Unauthorized AppError.
        expect(outcome.error).toBeInstanceOf(AppError);
        expect(outcome.error!.statusCode).toBe(401);
        // No identity was attached to the request.
        expect((outcome.req as Partial<AuthenticatedRequest>).user).toBeUndefined();
      }),
      { numRuns: NUM_RUNS },
    );
  }, 60000);
});

// ===========================================================================
// Property 5: Valid tokens attach identity before authorization
// ===========================================================================
// Feature: secure-admin-user-management, Property 5: Valid tokens attach identity before authorization
describe('Property 5: Valid tokens attach identity before authorization', () => {
  it('attaches { userId, role } matching the token claims and calls next()', async () => {
    await fc.assert(
      fc.asyncProperty(objectIdArb, anyRoleArb, async (userId, role) => {
        const token = signValidToken(userId, role);
        const outcome = await runAuth(`Bearer ${token}`);

        // Authentication succeeded and the chain continues.
        expect(outcome.ok).toBe(true);
        expect(outcome.nextCalled).toBe(true);

        // Identity attached to the request matches the token claims, and this
        // happens before any authorization (requireRoles) runs.
        const attached = (outcome.req as AuthenticatedRequest).user;
        expect(attached).toBeDefined();
        expect(attached.userId).toBe(userId);
        expect(attached.role).toBe(role);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 60000);
});

// ===========================================================================
// Property 6: Authentication precedence over authorization (401 over 403)
// ===========================================================================
// Feature: secure-admin-user-management, Property 6: Authentication precedence over authorization
describe('Property 6: Authentication precedence over authorization', () => {
  it('returns 401 when authentication fails (even if the role would be insufficient) and never reaches RBAC', async () => {
    await fc.assert(
      fc.asyncProperty(invalidAuthArb, async ({ header }) => {
        // The chain is authMiddleware -> requireRoles('admin') -> handler.
        // Track whether RBAC or the handler were ever reached.
        let rbacReached = false;
        let handlerReached = false;
        const rbac = (req: Request, _res: Response, next: NextFunction): void => {
          rbacReached = true;
          requireRoles('admin')(req, _res, next);
        };

        const outcome = await runAuth(header);

        // authMiddleware fails closed: requireRoles is only invoked when auth
        // succeeds, so for an invalid token it never runs.
        if (outcome.ok) {
          rbac(outcome.req, noopRes, () => {
            handlerReached = true;
          });
        }

        // Authentication failure short-circuits with 401 — authorization (403)
        // is never evaluated.
        expect(outcome.ok).toBe(false);
        expect(outcome.error).toBeInstanceOf(AppError);
        expect(outcome.error!.statusCode).toBe(401);
        expect(rbacReached).toBe(false);
        expect(handlerReached).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 60000);

  it('returns 403 only when authentication succeeds but the authenticated role is not admin', async () => {
    await fc.assert(
      fc.asyncProperty(objectIdArb, nonAdminRoleArb, async (userId, role) => {
        const token = signValidToken(userId, role);

        // Step 1: authentication succeeds and attaches identity.
        const authOutcome = await runAuth(`Bearer ${token}`);
        expect(authOutcome.ok).toBe(true);
        expect(authOutcome.nextCalled).toBe(true);

        // Step 2: authorization runs AFTER authentication and denies a
        // non-admin with 403 (not 401).
        let handlerReached = false;
        let thrown: unknown;
        try {
          requireRoles('admin')(authOutcome.req, noopRes, () => {
            handlerReached = true;
          });
        } catch (err) {
          thrown = err;
        }

        expect(thrown).toBeInstanceOf(AppError);
        expect((thrown as AppError).statusCode).toBe(403);
        expect(handlerReached).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 60000);
});

// ===========================================================================
// Property 7: Non-admins cannot change account records, role, or isAdmin
// ===========================================================================
// Feature: secure-admin-user-management, Property 7: Non-admins cannot change account records, role, or isAdmin
describe('Property 7: Non-admins cannot change account records, role, or isAdmin', () => {
  it('denies authenticated non-admin create/update/delete with 403 and never mutates the target record', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        nonAdminRoleArb,
        writeMethodArb,
        objectIdArb,
        // Payloads that attempt privilege escalation must also be rejected.
        fc.record({ role: anyRoleArb, isAdmin: fc.boolean() }),
        async (userId, role, method, targetId, escalationBody) => {
          // An authenticated non-admin request targeting an account record.
          const req = {
            headers: {},
            method,
            params: { id: targetId },
            baseUrl: '/api/students',
            path: `/${targetId}`,
            ip: '203.0.113.7',
            correlationId: 'prop7-correlation',
            body: escalationBody,
            user: { userId, role },
          } as unknown as AuthenticatedRequest;

          // A pretend persisted record; the handler (if ever reached) would
          // mutate it. requireRoles must prevent the handler from running.
          const record = { role: 'student', isAdmin: false, mutated: false };
          const handler = (): void => {
            record.mutated = true;
            record.role = escalationBody.role;
            record.isAdmin = escalationBody.isAdmin;
          };

          let thrown: unknown;
          try {
            // adminOnly enforcement on every create/update/delete endpoint.
            requireRoles('admin')(req, noopRes, handler as NextFunction);
          } catch (err) {
            thrown = err;
          }

          // Denied with 403 (AppError), the handler never ran, and the target
          // record's fields are unchanged.
          expect(thrown).toBeInstanceOf(AppError);
          expect((thrown as AppError).statusCode).toBe(403);
          expect(record.mutated).toBe(false);
          expect(record.role).toBe('student');
          expect(record.isAdmin).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 60000);
});
