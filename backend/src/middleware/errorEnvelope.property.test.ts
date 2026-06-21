/**
 * Property-Based Test: Standard Error Envelope Without Leakage (Property 23)
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 23: Errors use the standard envelope without leaking internals
 *
 * Two complementary properties are verified against `globalErrorHandler`:
 *
 *  1. For any `AppError` (built via its status-bearing helpers), the handler
 *     responds with the error's `statusCode` and a body that is exactly the
 *     standard error envelope `{ success: false, message }` (plus `details`
 *     when the AppError carries them, as for 400 validation failures).
 *
 *  2. For any non-`AppError` value (plain Error with a stack, strings, or
 *     objects with internal-looking fields), the handler responds with HTTP
 *     500, a body whose keys are exactly `['success','message']`, the generic
 *     message `'An internal error occurred'`, and NO stack trace, file path,
 *     or injected internal identifier anywhere in the serialized body.
 *
 * NOTE on convention: the machine-readable error code is carried by the HTTP
 * STATUS CODE, not a `code` field in the body. The body shape is therefore
 * `{ success: false, message, details? }` — no `code` field is asserted.
 *
 * **Validates: Requirements 9.3, 9.5**
 */

import { jest, describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import type { Request, Response, NextFunction } from 'express';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { AppError, globalErrorHandler } from './errorHandler.js';

/**
 * Creates a mock Express Request object.
 */
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/api/v1/test',
    method: 'GET',
    ...overrides,
  } as unknown as Request;
}

/**
 * Creates a mock Express Response object that captures status + JSON body.
 */
function createMockResponse(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
  } as unknown as Response & { _status: number; _body: unknown };
  return res;
}

const mockNext: NextFunction = () => {};

// --- Generators -----------------------------------------------------------

/**
 * Non-empty human-readable message generator (no control of content needed;
 * the envelope must echo it verbatim for AppErrors).
 */
const messageArb = fc.string({ minLength: 1, maxLength: 120 });

/**
 * Generator for AppErrors of varying kinds via the status-bearing helpers.
 * Each carries its canonical HTTP status (400/401/403/404/409/500). The 400
 * case may additionally carry validation `details`.
 */
const appErrorArb: fc.Arbitrary<AppError> = fc.oneof(
  messageArb.map((m) => AppError.unauthorized(m)),
  messageArb.map((m) => AppError.forbidden(m)),
  messageArb.map((m) => AppError.notFound(m)),
  messageArb.map((m) => AppError.conflict(m)),
  messageArb.map((m) => AppError.internal(m)),
  messageArb.map((m) => AppError.badRequest(m)),
  // 400 with field-level validation details
  fc
    .tuple(
      messageArb,
      fc.array(
        fc.record({
          field: fc.string({ minLength: 1, maxLength: 30 }),
          reason: fc.string({ minLength: 1, maxLength: 60 }),
        }),
        { minLength: 1, maxLength: 5 },
      ),
    )
    .map(([m, details]) => AppError.badRequest(m, details)),
);

/**
 * An injected, unique internal identifier we plant inside non-AppError values.
 * If it ever surfaces in the response body, that is a leak.
 */
const secretTokenArb = fc
  .uuid()
  .map((id) => `INTERNAL_SECRET_${id.replace(/-/g, '')}`);

/**
 * Generator for non-AppError "errors". These are values the handler must treat
 * as unknown/unhandled exceptions. Each embeds a unique secret token plus
 * stack/file-path style content so we can assert none of it leaks.
 */
const nonAppErrorArb: fc.Arbitrary<{ value: unknown; secret: string }> = fc.oneof(
  // Plain Error with a realistic stack referencing file paths
  fc.tuple(secretTokenArb, fc.string({ minLength: 1, maxLength: 40 })).map(
    ([secret, suffix]) => {
      const err = new Error(`DB failure ${secret} ${suffix}`);
      err.stack =
        `Error: DB failure ${secret}\n` +
        `    at Object.<anonymous> (/app/src/services/userService.ts:42:9)\n` +
        `    at Module._compile (node:internal/modules/cjs/loader:1234:14)`;
      return { value: err, secret };
    },
  ),
  // Error subclass with internal-looking name + collection ids in message
  fc.tuple(secretTokenArb, fc.constantFrom('TypeError', 'MongoError', 'RangeError')).map(
    ([secret, name]) => {
      const err = new Error(`${secret} ObjectId('507f1f77bcf86cd799439011')`);
      err.name = name;
      err.stack = `${name}: ${secret}\n    at /var/app/node_modules/mongoose/lib/query.js:10:3`;
      return { value: err, secret };
    },
  ),
  // A bare string thrown as an error
  secretTokenArb.map((secret) => ({
    value: `${secret} thrown as string at /home/dev/app/index.ts:5:1`,
    secret,
  })),
  // A plain object with internal-looking fields
  secretTokenArb.map((secret) => ({
    value: {
      message: `boom ${secret}`,
      stack: `Error: boom\n    at /app/src/db.ts:1:1`,
      internalId: secret,
      query: 'db.users.find({})',
    },
    secret,
  })),
);

// --- Leakage detection -----------------------------------------------------

/** Patterns that would indicate internal leakage in a serialized body. */
const LEAK_PATTERNS: RegExp[] = [
  /stack/i,
  /at\s+\S+\s+\(/, // "at fn (path:line:col)"
  /at\s+\S+:\d+:\d+/, // "at /path:line:col"
  /\.(ts|js|tsx|jsx):\d+/, // file.ts:line
  /node_modules\//,
  /\/app\/src\//,
  /\/home\/[^/]+\//,
  /\/var\/app\//,
  /ObjectId\(/i,
  /node:internal/i,
];

// --- Properties ------------------------------------------------------------

describe('Property 23: Errors use the standard envelope without leaking internals', () => {
  // (Req 9.3) AppError → correct HTTP status + standard envelope body.
  it('AppError maps to its statusCode with body { success:false, message } (+details when present)', () => {
    fc.assert(
      fc.property(appErrorArb, (err) => {
        const req = createMockRequest();
        const res = createMockResponse();

        globalErrorHandler(err, req, res, mockNext);

        // Status reflects the AppError taxonomy (the machine-readable code).
        expect(res._status).toBe(err.statusCode);

        // Body is exactly the standard error envelope.
        const expected: Record<string, unknown> = {
          success: false,
          message: err.message,
        };
        if (err.details) {
          expected.details = err.details;
        }
        expect(res._body).toEqual(expected);

        // No `code` field in the body (code is carried by the HTTP status).
        const body = res._body as Record<string, unknown>;
        expect(body).not.toHaveProperty('code');

        // Keys are constrained to the envelope shape only.
        const allowed = err.details
          ? ['success', 'message', 'details']
          : ['success', 'message'];
        expect(Object.keys(body).sort()).toEqual([...allowed].sort());
      }),
      { numRuns: 100 },
    );
  });

  // (Req 9.5) Non-AppError → generic 500 with no leaked internals.
  it('non-AppError yields a generic 500 with no stack trace or internal ids', () => {
    fc.assert(
      fc.property(nonAppErrorArb, ({ value, secret }) => {
        const req = createMockRequest();
        const res = createMockResponse();

        // The handler is typed for Error, but must defensively handle any value.
        globalErrorHandler(value as Error, req, res, mockNext);

        // Generic 500.
        expect(res._status).toBe(500);

        const body = res._body as Record<string, unknown>;

        // Exactly the standard envelope keys — nothing else.
        expect(Object.keys(body)).toEqual(['success', 'message']);
        expect(body.success).toBe(false);
        expect(body.message).toBe('An internal error occurred');

        // The serialized body must not leak any internal content.
        const serialized = JSON.stringify(body);

        // The injected unique secret must never surface.
        expect(serialized).not.toContain(secret);

        // None of the leak-indicating patterns may appear.
        for (const pattern of LEAK_PATTERNS) {
          expect(pattern.test(serialized)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});
