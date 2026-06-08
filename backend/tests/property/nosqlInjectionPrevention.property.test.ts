/**
 * Property-Based Test: NoSQL Injection Prevention (Property 30)
 *
 * Feature: gurukul-ai-modernization, Property 30: NoSQL Injection Prevention
 *
 * For any user-provided input containing MongoDB query operators (e.g., $gt, $ne,
 * $regex, $where), the Backend_Service SHALL either sanitize the input to treat
 * operators as literal strings OR reject the request with HTTP 400 and log a
 * security event.
 *
 * **Validates: Requirements 12.2, 12.8**
 */

import * as fc from 'fast-check';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

import {
  mongoSanitizeMiddleware,
  containsMongoOperators,
} from '../../src/middleware/mongoSanitize.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import { logger } from '../../src/utils/logger.js';

// Suppress logger output during tests
beforeEach(() => {
  jest.spyOn(logger, 'warn').mockImplementation(() => logger);
});

/**
 * All MongoDB operators that the middleware must detect and reject.
 */
const MONGO_OPERATORS = [
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$ne',
  '$in',
  '$nin',
  '$regex',
  '$where',
  '$or',
  '$and',
  '$not',
  '$exists',
  '$elemMatch',
  '$expr',
  '$eq',
] as const;

// --- Arbitraries / Generators ---

/**
 * Generates a random MongoDB operator from the known list.
 */
const mongoOperatorArb = fc.constantFrom(...MONGO_OPERATORS);

/**
 * Generates an object with a $-prefixed key (NoSQL injection via object key).
 * Example: { "$ne": "", "$gt": 5 }
 */
const operatorKeyObjectArb = mongoOperatorArb.chain((op) =>
  fc.oneof(
    fc.constant({ [op]: '' }),
    fc.constant({ [op]: 1 }),
    fc.constant({ [op]: true }),
    fc.string({ minLength: 0, maxLength: 20 }).map((val) => ({ [op]: val })),
    fc.constant({ [op]: null }),
  ),
);

/**
 * Generates a string value that contains a MongoDB operator as a substring.
 * Example: "value $where something"
 */
const operatorInStringArb = fc.tuple(
  fc.string({ minLength: 0, maxLength: 30 }),
  mongoOperatorArb,
  fc.string({ minLength: 0, maxLength: 30 }),
).map(([prefix, op, suffix]) => `${prefix}${op}${suffix}`);

/**
 * Generates nested objects where the injection payload is deeply nested.
 * Example: { "user": { "login": { "$ne": "" } } }
 */
const nestedOperatorObjectArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 15 }).filter((s) => !s.startsWith('$')),
  fc.string({ minLength: 1, maxLength: 15 }).filter((s) => !s.startsWith('$')),
  operatorKeyObjectArb,
).map(([key1, key2, payload]) => ({ [key1]: { [key2]: payload } }));

/**
 * Generates arrays containing injection payloads.
 * Example: [{ "$or": [{ "a": 1 }] }]
 */
const arrayWithOperatorArb = fc.tuple(
  operatorKeyObjectArb,
  fc.nat({ max: 3 }),
).map(([payload, pos]) => {
  const arr: unknown[] = ['safe', 42, true];
  arr.splice(pos, 0, payload);
  return arr;
});

/**
 * Generates objects that embed operator strings as values (injection via string value).
 * Example: { "search": "find $regex pattern" }
 */
const stringValueInjectionArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 15 }).filter((s) => !s.startsWith('$')),
  operatorInStringArb,
).map(([key, value]) => ({ [key]: value }));

/**
 * Combined arbitrary for all forms of NoSQL injection payloads.
 */
const injectionPayloadArb = fc.oneof(
  operatorKeyObjectArb,
  nestedOperatorObjectArb,
  arrayWithOperatorArb,
  stringValueInjectionArb,
);

/**
 * Generates safe/clean values that should NOT trigger the middleware.
 * These are strings, numbers, objects without $ operators.
 */
const safeValueArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }).filter(
    (s) => !MONGO_OPERATORS.some((op) => s.includes(op)) && !s.startsWith('$'),
  ),
  fc.nat(),
  fc.boolean(),
  fc.constant(null),
  fc.constant({}),
);

/**
 * Generates a request body that is clean (no MongoDB operators).
 */
const safeObjectArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.startsWith('$')),
  safeValueArb,
);

// --- Helper Functions ---

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    path: '/api/v1/test',
    method: 'POST',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  return {} as unknown as Response;
}

// --- Property Tests ---

describe('Property 30: NoSQL Injection Prevention', () => {
  /**
   * Property: For any input containing MongoDB operators in the request body,
   * the middleware SHALL reject the request with HTTP 400.
   */
  it('rejects any request body containing MongoDB operator keys with HTTP 400', () => {
    fc.assert(
      fc.property(injectionPayloadArb, (payload) => {
        const req = createMockReq({ body: payload as Record<string, unknown> });
        const res = createMockRes();
        const next: NextFunction = jest.fn();

        try {
          mongoSanitizeMiddleware(req, res, next);
          // If next was called, the middleware did not reject — this is a failure
          expect(next).not.toHaveBeenCalled();
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppError;
          expect(appErr.statusCode).toBe(400);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any input containing MongoDB operators in query parameters,
   * the middleware SHALL reject the request with HTTP 400.
   */
  it('rejects any request query containing MongoDB operator keys with HTTP 400', () => {
    fc.assert(
      fc.property(operatorKeyObjectArb, (payload) => {
        const req = createMockReq({
          query: payload as unknown as Request['query'],
        });
        const res = createMockRes();
        const next: NextFunction = jest.fn();

        try {
          mongoSanitizeMiddleware(req, res, next);
          expect(next).not.toHaveBeenCalled();
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppError;
          expect(appErr.statusCode).toBe(400);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any input containing MongoDB operators in route params,
   * the middleware SHALL reject the request with HTTP 400.
   */
  it('rejects any request params containing MongoDB operator keys with HTTP 400', () => {
    fc.assert(
      fc.property(operatorKeyObjectArb, (payload) => {
        const req = createMockReq({
          params: payload as unknown as Request['params'],
        });
        const res = createMockRes();
        const next: NextFunction = jest.fn();

        try {
          mongoSanitizeMiddleware(req, res, next);
          expect(next).not.toHaveBeenCalled();
        } catch (err) {
          expect(err).toBeInstanceOf(AppError);
          const appErr = err as AppError;
          expect(appErr.statusCode).toBe(400);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When injection is detected, a security event MUST be logged
   * with the event type 'security:nosql_injection'.
   */
  it('logs a security event for every detected NoSQL injection attempt', () => {
    fc.assert(
      fc.property(injectionPayloadArb, (payload) => {
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
        const req = createMockReq({ body: payload as Record<string, unknown> });
        const res = createMockRes();
        const next: NextFunction = jest.fn();

        try {
          mongoSanitizeMiddleware(req, res, next);
        } catch {
          // Expected
        }

        expect(warnSpy).toHaveBeenCalledWith(
          'NoSQL injection attempt detected',
          expect.objectContaining({
            event: 'security:nosql_injection',
          }),
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Requests with safe/clean data (no MongoDB operators) should
   * pass through the middleware without being rejected.
   */
  it('allows requests with safe data that contain no MongoDB operators', () => {
    fc.assert(
      fc.property(safeObjectArb, (safeBody) => {
        // Double-check that our generator produced genuinely safe data
        if (containsMongoOperators(safeBody)) {
          return; // Skip this case (generator filter might not catch all)
        }

        const req = createMockReq({ body: safeBody });
        const res = createMockRes();
        const next: NextFunction = jest.fn();

        mongoSanitizeMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The containsMongoOperators detection function correctly
   * identifies any string that contains a $-prefixed MongoDB operator.
   */
  it('containsMongoOperators detects all generated $-prefixed operator strings', () => {
    fc.assert(
      fc.property(operatorInStringArb, (input) => {
        expect(containsMongoOperators(input)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The containsMongoOperators detection function correctly
   * identifies objects with $-prefixed keys.
   */
  it('containsMongoOperators detects all objects with $-prefixed keys', () => {
    fc.assert(
      fc.property(operatorKeyObjectArb, (input) => {
        expect(containsMongoOperators(input)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
