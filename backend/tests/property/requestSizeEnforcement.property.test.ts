/**
 * Property-Based Test: Request Size Enforcement (Property 33)
 *
 * Feature: gurukul-ai-modernization, Property 33: Request Size Enforcement
 *
 * For any request with a body exceeding 10 MB or a single input field exceeding
 * 10,000 characters, the Backend_Service SHALL reject the request with an error
 * indicating the payload exceeds the allowed size limit.
 *
 * **Validates: Requirements 12.7**
 */

import * as fc from 'fast-check';
import type { Request, Response, NextFunction } from 'express';

import {
  fieldSizeLimitMiddleware,
  payloadTooLargeHandler,
  findOversizedField,
} from '../../src/middleware/requestSizeLimits.js';
import { AppError } from '../../src/middleware/errorHandler.js';

// --- Test Helpers ---

function createMockRequest(body?: unknown): Request {
  return {
    body,
    headers: {},
    path: '/test',
    method: 'POST',
  } as unknown as Request;
}

function createMockResponse(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: undefined as unknown,
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

// --- Generators ---

/**
 * Generates a string with length strictly greater than 10,000 characters.
 * Uses lengths between 10,001 and 50,000 to keep tests tractable.
 */
const oversizedStringArb = fc.integer({ min: 10001, max: 50000 }).chain((len) =>
  fc.string({ minLength: len, maxLength: len }).map((s) => {
    // fast-check string() generates unicode; pad if needed to ensure length
    if (s.length >= 10001) return s;
    return s + 'x'.repeat(10001 - s.length);
  }),
);

/**
 * Generates a string with length at most 10,000 characters (within limits).
 */
const withinLimitStringArb = fc.string({ minLength: 0, maxLength: 10000 });

/**
 * Generates a random field name (alphanumeric, 1-20 chars).
 */
const fieldNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,19}$/);

/**
 * Generates an object where all string fields are within the 10,000 char limit.
 */
const safeObjectArb = fc
  .dictionary(fieldNameArb, withinLimitStringArb, { minKeys: 1, maxKeys: 5 })
  .filter((obj) => Object.keys(obj).length > 0);

/**
 * Generates an object with at least one field exceeding the 10,000 char limit.
 */
const oversizedObjectArb = fc
  .tuple(fieldNameArb, oversizedStringArb, safeObjectArb)
  .map(([oversizedKey, oversizedValue, safeObj]) => ({
    ...safeObj,
    [oversizedKey]: oversizedValue,
  }));

/**
 * Generates a nested object with an oversized field buried at random depth.
 */
const nestedOversizedObjectArb = fc
  .tuple(
    fc.array(fieldNameArb, { minLength: 1, maxLength: 4 }),
    oversizedStringArb,
  )
  .map(([pathSegments, oversizedValue]) => {
    // Build nested object from path segments
    const root: Record<string, unknown> = {};
    let current: Record<string, unknown> = root;
    for (let i = 0; i < pathSegments.length - 1; i++) {
      current[pathSegments[i]] = {};
      current = current[pathSegments[i]] as Record<string, unknown>;
    }
    current[pathSegments[pathSegments.length - 1]] = oversizedValue;
    return root;
  });

/**
 * Generates a payload size in bytes that exceeds 10 MB.
 * We simulate the error by testing payloadTooLargeHandler directly.
 */
const oversizedPayloadSizeArb = fc.integer({
  min: 10 * 1024 * 1024 + 1,
  max: 50 * 1024 * 1024,
});

// --- Property Tests ---

describe('Property 33: Request Size Enforcement', () => {
  const middleware = fieldSizeLimitMiddleware(10000);

  /**
   * Property: Any request body containing a string field longer than 10,000
   * characters SHALL be rejected with an AppError (status 400).
   */
  it('should reject requests with any field exceeding 10,000 characters', () => {
    fc.assert(
      fc.property(oversizedObjectArb, (body) => {
        const req = createMockRequest(body);
        const res = createMockResponse();
        const next: NextFunction = () => {};

        expect(() => {
          middleware(req, res as unknown as Response, next);
        }).toThrow(AppError);

        try {
          middleware(req, res as unknown as Response, next);
        } catch (err) {
          const appErr = err as AppError;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('exceeds the maximum allowed length');
          expect(appErr.message).toContain('10000 characters');
          expect(appErr.details).toBeDefined();
          expect(appErr.details!.length).toBeGreaterThan(0);
          expect(appErr.details![0].reason).toContain('10000 character limit');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Any request body containing nested fields exceeding 10,000
   * characters SHALL be detected and rejected regardless of nesting depth.
   */
  it('should reject requests with nested fields exceeding 10,000 characters', () => {
    fc.assert(
      fc.property(nestedOversizedObjectArb, (body) => {
        const req = createMockRequest(body);
        const res = createMockResponse();
        const next: NextFunction = () => {};

        expect(() => {
          middleware(req, res as unknown as Response, next);
        }).toThrow(AppError);

        try {
          middleware(req, res as unknown as Response, next);
        } catch (err) {
          const appErr = err as AppError;
          expect(appErr.statusCode).toBe(400);
          expect(appErr.message).toContain('exceeds the maximum allowed length');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Any request body where all string fields are at most 10,000
   * characters SHALL be accepted (next() is called).
   */
  it('should accept requests where all fields are within the 10,000 character limit', () => {
    fc.assert(
      fc.property(safeObjectArb, (body) => {
        const req = createMockRequest(body);
        const res = createMockResponse();
        let nextCalled = false;
        const next: NextFunction = () => {
          nextCalled = true;
        };

        middleware(req, res as unknown as Response, next);

        expect(nextCalled).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Request bodies exceeding 10 MB (simulated via entity.too.large error)
   * SHALL be rejected with a 400 response indicating the size limit was exceeded.
   */
  it('should reject request bodies exceeding 10 MB with appropriate error', () => {
    fc.assert(
      fc.property(oversizedPayloadSizeArb, (payloadSize) => {
        const err = Object.assign(new Error('request entity too large'), {
          type: 'entity.too.large',
          status: 413,
          length: payloadSize,
        });
        const req = createMockRequest();
        const res = createMockResponse();
        let nextCalled = false;
        const next: NextFunction = () => {
          nextCalled = true;
        };

        payloadTooLargeHandler(err, req, res as unknown as Response, next);

        expect(nextCalled).toBe(false);
        expect(res._status).toBe(400);

        const responseBody = res._body as {
          error: string;
          message: string;
          details: Array<{ field: string; value: string; reason: string }>;
        };
        expect(responseBody.error).toBe('BAD_REQUEST');
        expect(responseBody.message).toContain('10 MB');
        expect(responseBody.details).toBeDefined();
        expect(responseBody.details[0].field).toBe('body');
        expect(responseBody.details[0].reason).toContain('10 MB');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Non-payload-too-large errors SHALL be passed through to
   * the next error handler (not consumed by payloadTooLargeHandler).
   */
  it('should pass non-size-related errors to next handler', () => {
    const nonSizeErrorArb = fc.tuple(
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.integer({ min: 400, max: 599 }).filter((s) => s !== 413),
    );

    fc.assert(
      fc.property(nonSizeErrorArb, ([message, status]) => {
        const err = Object.assign(new Error(message), {
          type: 'other',
          status,
        });
        const req = createMockRequest();
        const res = createMockResponse();
        let passedToNext = false;
        const next: NextFunction = (() => {
          passedToNext = true;
        }) as unknown as NextFunction;

        payloadTooLargeHandler(err, req, res as unknown as Response, next);

        expect(passedToNext).toBe(true);
        expect(res._status).toBe(0); // Response not touched
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The findOversizedField helper correctly identifies oversized
   * strings in any object structure and returns undefined for valid objects.
   */
  it('findOversizedField detects violations for any string exceeding the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10001, max: 30000 }),
        fieldNameArb,
        (length, fieldName) => {
          const oversizedStr = 'a'.repeat(length);
          const obj = { [fieldName]: oversizedStr };

          const result = findOversizedField(obj, 10000);

          expect(result).toBeDefined();
          expect(result!.field).toBe(fieldName);
          expect(result!.length).toBe(length);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The findOversizedField helper returns undefined for any
   * object where all string values are within the character limit.
   */
  it('findOversizedField returns undefined for objects within limits', () => {
    fc.assert(
      fc.property(safeObjectArb, (obj) => {
        const result = findOversizedField(obj, 10000);
        expect(result).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
