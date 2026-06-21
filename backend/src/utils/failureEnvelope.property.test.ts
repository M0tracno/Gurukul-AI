/**
 * Property-Based Test: Failure Envelope Shape
 *
 * Feature: communication-feedback-and-admin-apis, Property 24: Every error response is a well-formed failure envelope with a non-empty message
 *
 * Property 24: For any error outcome of a new endpoint, the response body
 * matches `{ success: false, message, details? }` with a present, non-empty
 * `message`; a success-shaped body is never returned for an error outcome.
 *
 * **Validates: Requirements 12.3, 12.4**
 *
 * Two complementary angles are exercised:
 *  1. The `failure(message, details?)` builder directly, over arbitrary
 *     non-empty messages and optional detail arrays.
 *  2. Arbitrary `AppError` instances (varied statusCodes/messages/details)
 *     fed through `globalErrorHandler`, plus unknown (non-AppError) throws,
 *     asserting the formatted response is always a failure envelope.
 */

import * as fc from 'fast-check';
import express, { type Request, type Response } from 'express';
import request from 'supertest';

import { failure } from './envelope.js';
import type { ErrorDetail } from './envelope.js';
import { AppError, globalErrorHandler } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a non-empty error message: at least one non-whitespace
 * character so the message is meaningfully present, never blank.
 */
const nonEmptyMessageArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .map((s) => s.replace(/\s/g, '').length === 0 ? `error ${s}` : s)
  .filter((s) => s.trim().length > 0);

/** Generates a single field-level error detail. */
const errorDetailArb: fc.Arbitrary<ErrorDetail> = fc.record({
  field: fc
    .string({ minLength: 1, maxLength: 50 })
    .map((s) => s.replace(/[^a-zA-Z0-9_.]/g, 'x') || 'field'),
  reason: fc.string({ minLength: 1, maxLength: 100 }),
});

/** Generates an optional array of error details. */
const detailsArb: fc.Arbitrary<ErrorDetail[] | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.array(errorDetailArb, { minLength: 1, maxLength: 5 }),
);

/** Generates valid error status codes (4xx and 5xx). */
const errorStatusArb = fc.constantFrom(400, 401, 403, 404, 409, 422, 500, 502, 503);

/** Generates an AppError error code string. */
const errorCodeArb = fc.constantFrom(
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
);

/**
 * Asserts the given body is a well-formed failure envelope with a present,
 * non-empty message and is never success-shaped.
 */
function assertFailureEnvelope(body: unknown): void {
  expect(typeof body).toBe('object');
  expect(body).not.toBeNull();
  const env = body as Record<string, unknown>;

  // Never success-shaped for an error outcome.
  expect(env.success).toBe(false);
  expect(env.success).not.toBe(true);
  // A failure envelope carries no success `data` payload key.
  expect(Object.prototype.hasOwnProperty.call(env, 'data')).toBe(false);

  // Message is present and non-empty.
  expect(Object.prototype.hasOwnProperty.call(env, 'message')).toBe(true);
  expect(typeof env.message).toBe('string');
  expect((env.message as string).length).toBeGreaterThan(0);

  // No keys beyond the canonical failure envelope shape.
  const allowedKeys = new Set(['success', 'message', 'details']);
  for (const key of Object.keys(env)) {
    expect(allowedKeys.has(key)).toBe(true);
  }
}

// ---------------------------------------------------------------------------
// Property 24: Failure envelope shape
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 24: Every error response is a well-formed failure envelope with a non-empty message
describe('Property 24: Every error response is a well-formed failure envelope with a non-empty message', () => {
  it('failure(message, details?) is always a well-formed failure envelope with a non-empty message', () => {
    fc.assert(
      fc.property(nonEmptyMessageArb, detailsArb, (message, details) => {
        const envelope = failure(message, details);

        assertFailureEnvelope(envelope);
        expect(envelope.message).toBe(message);

        if (details === undefined) {
          expect(Object.prototype.hasOwnProperty.call(envelope, 'details')).toBe(false);
        } else {
          expect(envelope.details).toEqual(details);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('arbitrary AppError instances format to a failure envelope with a non-empty message', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorStatusArb,
        errorCodeArb,
        nonEmptyMessageArb,
        detailsArb,
        async (status, code, message, details) => {
          const app = express();
          app.get('/test', (_req: Request, _res: Response) => {
            throw new AppError(status, code, message, details);
          });
          app.use(globalErrorHandler);

          const resp = await request(app).get('/test');

          // Status reflects the error outcome (never a 2xx success class).
          expect(resp.status).toBeGreaterThanOrEqual(400);
          expect(resp.status).toBeLessThanOrEqual(599);

          assertFailureEnvelope(resp.body);
          expect(resp.body.message).toBe(message);

          if (details !== undefined) {
            expect(resp.body.details).toEqual(details);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('unknown (non-AppError) errors still format to a failure envelope with a non-empty message', async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyMessageArb, async (message) => {
        const app = express();
        app.get('/test', () => {
          throw new Error(message);
        });
        app.use(globalErrorHandler);

        const resp = await request(app).get('/test');

        // Unknown errors collapse to a generic 500 failure envelope.
        expect(resp.status).toBe(500);
        assertFailureEnvelope(resp.body);
        // The client-facing message is static and never leaks the raw error.
        expect(resp.body.message).toBe('An internal error occurred');
      }),
      { numRuns: 200 },
    );
  });
});
