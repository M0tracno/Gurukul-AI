/**
 * Property-Based Test: API Error Envelope Consistency (Property 1)
 *
 * Feature: gurukul-ai-modernization, Property 1: API Error Envelope Consistency
 *
 * For any HTTP request that results in a 4xx or 5xx response from the API,
 * the response body SHALL contain at minimum the fields `error` (string,
 * machine-readable code) and `message` (string, human-readable description),
 * and for validation errors (400) SHALL additionally contain a `details` array
 * with field/value/reason entries.
 *
 * **Validates: Requirements 2.2, 2.7, 2.8**
 */

import * as fc from 'fast-check';
import express, { type Request, type Response, type NextFunction } from 'express';
import { AppError, globalErrorHandler, notFoundHandler } from '../../src/middleware/errorHandler.js';

/**
 * Helper: create a minimal Express app with an error-throwing route and
 * the global error handler attached, for testing error envelope output.
 */
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Route that throws an AppError based on query parameters
  app.get('/test-error', (req: Request, _res: Response, next: NextFunction) => {
    const statusCode = parseInt(req.query.statusCode as string, 10);
    const errorCode = req.query.errorCode as string;
    const message = req.query.message as string;
    const hasDetails = req.query.hasDetails === 'true';

    const details = hasDetails
      ? [{ field: 'testField', value: req.query.detailValue ?? null, reason: 'test reason' }]
      : undefined;

    next(new AppError(statusCode, errorCode, message, details));
  });

  // Route that throws an unhandled exception
  app.get('/test-unhandled', (_req: Request, _res: Response, _next: NextFunction) => {
    throw new Error('Unhandled exception for testing');
  });

  // 404 handler for unregistered routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(globalErrorHandler);

  return app;
}

// ----- Arbitraries (generators) -----

// Valid 4xx status codes (excluding 400 which is tested separately)
const nonValidation4xxStatusArb = fc.constantFrom(
  401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413,
  414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451
);

// 5xx status codes
const status5xxArb = fc.constantFrom(500, 501, 502, 503, 504, 505, 507, 508, 511);

// All error status codes combined (4xx and 5xx, excluding 400)
const nonValidationErrorStatusArb = fc.oneof(nonValidation4xxStatusArb, status5xxArb);

// Machine-readable error codes (uppercase, underscore-separated)
const UPPER_ALPHA_UNDERSCORE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const errorCodeArb = fc.integer({ min: 3, max: 30 }).chain(len =>
  fc.array(
    fc.integer({ min: 0, max: UPPER_ALPHA_UNDERSCORE.length - 1 }).map(i => UPPER_ALPHA_UNDERSCORE[i]),
    { minLength: len, maxLength: len }
  ).map(chars => chars.join(''))
).filter(s => s.length >= 3 && !s.startsWith('_') && !s.endsWith('_'));

// Human-readable messages (non-empty strings)
const messageArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);

// Validation detail field name
const FIELD_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789._';
const fieldNameArb = fc.integer({ min: 1, max: 50 }).chain(len =>
  fc.array(
    fc.integer({ min: 0, max: FIELD_CHARS.length - 1 }).map(i => FIELD_CHARS[i]),
    { minLength: len, maxLength: len }
  ).map(chars => chars.join(''))
).filter(s => /^[a-z]/.test(s));

// Validation detail value (any JSON-serializable value)
const detailValueArb = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null)
);

// Validation detail reason
const detailReasonArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

// A single detail entry
const detailEntryArb = fc.record({
  field: fieldNameArb,
  value: detailValueArb,
  reason: detailReasonArb,
});

// Array of detail entries (1 to 5)
const detailsArrayArb = fc.array(detailEntryArb, { minLength: 1, maxLength: 5 });

describe('Property 1: API Error Envelope Consistency', () => {
  /**
   * Property: For any 4xx/5xx error (non-400), the response body contains
   * `error` (string) and `message` (string) fields.
   */
  it('all 4xx/5xx responses contain "error" and "message" string fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonValidationErrorStatusArb,
        errorCodeArb,
        messageArb,
        async (statusCode, errorCode, message) => {
          const app = createTestApp();

          // Use dynamic import for supertest (ESM)
          const { default: request } = await import('supertest');

          const response = await request(app)
            .get('/test-error')
            .query({ statusCode: statusCode.toString(), errorCode, message, hasDetails: 'false' });

          // Status code must match
          expect(response.status).toBe(statusCode);

          // Body must have `error` as a string
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');

          // Body must have `message` as a string
          expect(response.body).toHaveProperty('message');
          expect(typeof response.body.message).toBe('string');

          // Error and message must be non-empty
          expect(response.body.error.length).toBeGreaterThan(0);
          expect(response.body.message.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For any 400 validation error, the response body contains
   * `error` (string), `message` (string), AND a `details` array where each
   * entry has `field`, `value`, and `reason` fields.
   */
  it('400 validation errors additionally contain a "details" array with field/value/reason entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorCodeArb,
        messageArb,
        detailsArrayArb,
        async (errorCode, message, details) => {
          // Create a fresh app with a route that throws a 400 AppError with details
          const app = express();
          app.use(express.json());

          app.get('/test-validation-error', (_req: Request, _res: Response, next: NextFunction) => {
            next(new AppError(400, errorCode, message, details));
          });

          app.use(globalErrorHandler);

          const { default: request } = await import('supertest');

          const response = await request(app).get('/test-validation-error');

          // Status code must be 400
          expect(response.status).toBe(400);

          // Body must have `error` as a string
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);

          // Body must have `message` as a string
          expect(response.body).toHaveProperty('message');
          expect(typeof response.body.message).toBe('string');
          expect(response.body.message.length).toBeGreaterThan(0);

          // Body must have `details` as an array
          expect(response.body).toHaveProperty('details');
          expect(Array.isArray(response.body.details)).toBe(true);
          expect(response.body.details.length).toBeGreaterThan(0);

          // Each detail entry must have field, value, and reason
          for (const detail of response.body.details) {
            expect(detail).toHaveProperty('field');
            expect(typeof detail.field).toBe('string');

            expect(detail).toHaveProperty('value');
            // value can be any type, so we just ensure it exists

            expect(detail).toHaveProperty('reason');
            expect(typeof detail.reason).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For unhandled exceptions, the response is 500 with `error`
   * and `message` fields (consistent envelope).
   */
  it('unhandled exceptions return 500 with consistent error envelope', async () => {
    const app = createTestApp();
    const { default: request } = await import('supertest');

    // This is a simple property check — any unhandled error always
    // returns a consistent 500 envelope
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (_randomContext) => {
          const response = await request(app).get('/test-unhandled');

          expect(response.status).toBe(500);
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error).toBe('INTERNAL_ERROR');

          expect(response.body).toHaveProperty('message');
          expect(typeof response.body.message).toBe('string');
          expect(response.body.message).toBe('An internal error occurred');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For any request to a non-existent route (404), the response
   * follows the consistent error envelope with `error` and `message` fields.
   */
  it('404 for unregistered routes returns consistent error envelope', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random path segments
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-z0-9\-_]/g, 'x') || 'x'),
          { minLength: 1, maxLength: 4 }
        ),
        async (pathSegments) => {
          const app = createTestApp();
          const { default: request } = await import('supertest');

          const randomPath = '/' + pathSegments.join('/');
          const response = await request(app).get(randomPath);

          expect(response.status).toBe(404);

          // Body must have `error` as a string
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
          expect(response.body.error.length).toBeGreaterThan(0);

          // Body must have `message` as a string
          expect(response.body).toHaveProperty('message');
          expect(typeof response.body.message).toBe('string');
          expect(response.body.message.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
