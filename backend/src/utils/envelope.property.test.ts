/**
 * Property-Based Tests: Response Envelope Shape, Status Code Consistency, and Validation Details
 *
 * Feature: admin-portal-overhaul, Property 3: Success envelope shape
 * Feature: admin-portal-overhaul, Property 4: Error envelope shape
 * Feature: admin-portal-overhaul, Property 5: Status code consistency
 * Feature: admin-portal-overhaul, Property 6: Validation errors populate field-level details
 *
 * Property 3: For any successful endpoint outcome with payload `p`, the response
 * SHALL equal `{ success: true, data: p }` (optionally carrying `meta`), and this
 * SHALL hold across all resource namespaces.
 * **Validates: Requirements 2.1, 2.5, 20.2**
 *
 * Property 4: For any error outcome, the response SHALL equal
 * `{ success: false, message: <string>, details?: <object> }` and SHALL hold
 * across all resource namespaces.
 * **Validates: Requirements 2.2, 2.5**
 *
 * Property 5: For any handled outcome, the HTTP status SHALL be in the 2xx class
 * when the envelope's `success` is `true` and in the 4xx or 5xx class when
 * `success` is `false`.
 * **Validates: Requirements 2.3**
 *
 * Property 6: For any request that fails input validation or contains disallowed
 * content, the API SHALL respond with status 400 and an Error_Envelope whose
 * `details` lists an entry for each failing field.
 * **Validates: Requirements 2.4, 22.5**
 */

import * as fc from 'fast-check';
import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { z } from 'zod';

import { success, failure } from './envelope.js';
import type { EnvelopeMeta, ErrorDetail } from './envelope.js';
import { AppError, globalErrorHandler } from '../middleware/errorHandler.js';
import { validateRequest } from '../middleware/validateRequest.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates any JSON-serializable value as a payload. */
const jsonPayloadArb = fc.jsonValue();

/** Generates optional pagination metadata. */
const metaArb: fc.Arbitrary<EnvelopeMeta | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.record({
    page: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
    limit: fc.option(fc.nat({ max: 100 }), { nil: undefined }),
    total: fc.option(fc.nat({ max: 100000 }), { nil: undefined }),
  }),
);

/** Generates a non-empty error message string. */
const messageArb = fc.string({ minLength: 1, maxLength: 200 });

/** Generates field-level error details. */
const errorDetailArb: fc.Arbitrary<ErrorDetail> = fc.record({
  field: fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/[^a-zA-Z0-9_.]/g, 'x') || 'field'),
  reason: fc.string({ minLength: 1, maxLength: 100 }),
});

/** Generates an optional array of error details. */
const detailsArb: fc.Arbitrary<ErrorDetail[] | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.array(errorDetailArb, { minLength: 1, maxLength: 5 }),
);

/** Generates valid error status codes (4xx and 5xx). */
const errorStatusArb = fc.oneof(
  fc.constantFrom(400, 401, 403, 404, 409),
  fc.constant(500),
);

/** Generates an AppError error code string. */
const errorCodeArb = fc.constantFrom(
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
);

/** Generates a valid field name for Zod schemas. */
const fieldNameArb = fc.string({ minLength: 1, maxLength: 20 })
  .map((s) => s.replace(/[^a-zA-Z0-9]/g, 'x') || 'field');

// ---------------------------------------------------------------------------
// Property 3: Success envelope shape
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 3: Success envelope shape
describe('Property 3: Success envelope shape', () => {
  it('success(p) returns { success: true, data: p } for any payload', () => {
    fc.assert(
      fc.property(jsonPayloadArb, (payload) => {
        const envelope = success(payload);

        expect(envelope.success).toBe(true);
        expect(envelope.data).toEqual(payload);
        expect(Object.prototype.hasOwnProperty.call(envelope, 'success')).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(envelope, 'data')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('success(p, meta) includes meta only when provided', () => {
    fc.assert(
      fc.property(jsonPayloadArb, metaArb, (payload, meta) => {
        const envelope = success(payload, meta);

        expect(envelope.success).toBe(true);
        expect(envelope.data).toEqual(payload);

        if (meta === undefined) {
          expect(Object.prototype.hasOwnProperty.call(envelope, 'meta')).toBe(false);
        } else {
          expect(envelope.meta).toEqual(meta);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('success envelope contains no extra keys beyond success, data, and optional meta', () => {
    fc.assert(
      fc.property(jsonPayloadArb, metaArb, (payload, meta) => {
        const envelope = success(payload, meta);
        const keys = Object.keys(envelope);
        const allowedKeys = new Set(['success', 'data', 'meta']);

        for (const key of keys) {
          expect(allowedKeys.has(key)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Error envelope shape
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 4: Error envelope shape
describe('Property 4: Error envelope shape', () => {
  it('failure(msg) returns { success: false, message: msg } for any message', () => {
    fc.assert(
      fc.property(messageArb, (msg) => {
        const envelope = failure(msg);

        expect(envelope.success).toBe(false);
        expect(envelope.message).toBe(msg);
        expect(typeof envelope.message).toBe('string');
        expect(Object.prototype.hasOwnProperty.call(envelope, 'success')).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(envelope, 'message')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('failure(msg, details) includes details only when provided', () => {
    fc.assert(
      fc.property(messageArb, detailsArb, (msg, details) => {
        const envelope = failure(msg, details);

        expect(envelope.success).toBe(false);
        expect(envelope.message).toBe(msg);

        if (details === undefined) {
          expect(Object.prototype.hasOwnProperty.call(envelope, 'details')).toBe(false);
        } else {
          expect(envelope.details).toEqual(details);
          // Each detail has field and reason
          for (const d of envelope.details!) {
            expect(typeof d.field).toBe('string');
            expect(typeof d.reason).toBe('string');
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('error envelope contains no extra keys beyond success, message, and optional details', () => {
    fc.assert(
      fc.property(messageArb, detailsArb, (msg, details) => {
        const envelope = failure(msg, details);
        const keys = Object.keys(envelope);
        const allowedKeys = new Set(['success', 'message', 'details']);

        for (const key of keys) {
          expect(allowedKeys.has(key)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Status code consistency
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 5: Status code consistency
describe('Property 5: Status code consistency', () => {
  it('success responses carry 2xx status codes', async () => {
    await fc.assert(
      fc.asyncProperty(jsonPayloadArb, async (payload) => {
        const app = express();
        app.get('/test', (_req: Request, res: Response) => {
          res.status(200).json(success(payload));
        });

        const resp = await request(app).get('/test');
        expect(resp.status).toBeGreaterThanOrEqual(200);
        expect(resp.status).toBeLessThan(300);
        expect(resp.body.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('AppError responses carry 4xx/5xx status codes with success: false', async () => {
    await fc.assert(
      fc.asyncProperty(errorStatusArb, errorCodeArb, messageArb, async (status, code, msg) => {
        const app = express();
        app.get('/test', (_req: Request, _res: Response) => {
          throw new AppError(status, code, msg);
        });
        app.use(globalErrorHandler);

        const resp = await request(app).get('/test');
        expect(resp.status).toBeGreaterThanOrEqual(400);
        expect(resp.status).toBeLessThanOrEqual(599);
        expect(resp.body.success).toBe(false);
        expect(typeof resp.body.message).toBe('string');
      }),
      { numRuns: 100 },
    );
  });

  it('unknown errors produce 500 with success: false', async () => {
    await fc.assert(
      fc.asyncProperty(messageArb, async (msg) => {
        const app = express();
        app.get('/test', () => {
          throw new Error(msg);
        });
        app.use(globalErrorHandler);

        const resp = await request(app).get('/test');
        expect(resp.status).toBe(500);
        expect(resp.body.success).toBe(false);
        expect(resp.body.message).toBe('An internal error occurred');
      }),
      { numRuns: 100 },
    );
  });

  it('AppError with details forwards them into the error envelope', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(errorDetailArb, { minLength: 1, maxLength: 5 }),
        async (details) => {
          const app = express();
          app.get('/test', (_req: Request, _res: Response) => {
            throw new AppError(400, 'BAD_REQUEST', 'Validation failed', details);
          });
          app.use(globalErrorHandler);

          const resp = await request(app).get('/test');
          expect(resp.status).toBe(400);
          expect(resp.body.success).toBe(false);
          expect(resp.body.details).toEqual(details);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Validation errors populate field-level details
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 6: Validation errors populate field-level details
describe('Property 6: Validation errors populate field-level details', () => {
  it('validateRequest rejects invalid body with 400 and field-level details', async () => {
    // Schema requires specific string fields; we send numeric values to trigger failures
    await fc.assert(
      fc.asyncProperty(
        fc.array(fieldNameArb, { minLength: 1, maxLength: 5 }).map((names) =>
          [...new Set(names)].slice(0, 5),
        ).filter((names) => names.length > 0),
        async (fieldNames) => {
          // Build a Zod schema requiring each field as a non-empty string
          const shape: Record<string, z.ZodTypeAny> = {};
          for (const name of fieldNames) {
            shape[name] = z.string().min(1);
          }
          const schema = z.object(shape).strict();

          // Build an app using validateRequest with this schema
          const app = express();
          app.use(express.json());
          app.post('/test', validateRequest({ body: schema }), (_req: Request, res: Response) => {
            res.status(200).json(success({ ok: true }));
          });

          // Send a body where every required field has wrong type (number instead of string)
          const invalidBody: Record<string, number> = {};
          for (const name of fieldNames) {
            invalidBody[name] = 12345;
          }

          const resp = await request(app).post('/test').send(invalidBody);

          // Must get 400
          expect(resp.status).toBe(400);
          // Must be an error envelope
          expect(resp.body.success).toBe(false);
          expect(typeof resp.body.message).toBe('string');
          // Must have details array with at least one entry per failing field
          expect(Array.isArray(resp.body.details)).toBe(true);
          expect(resp.body.details.length).toBeGreaterThanOrEqual(fieldNames.length);

          // Each detail must have field and reason
          for (const detail of resp.body.details) {
            expect(typeof detail.field).toBe('string');
            expect(typeof detail.reason).toBe('string');
            // Field should be prefixed with 'body.'
            expect(detail.field.startsWith('body.')).toBe(true);
          }

          // Each failing field should appear in the details
          for (const name of fieldNames) {
            const found = resp.body.details.some(
              (d: ErrorDetail) => d.field === `body.${name}`,
            );
            expect(found).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('validateRequest rejects unexpected fields with strict schemas', async () => {
    await fc.assert(
      fc.asyncProperty(
        fieldNameArb,
        fieldNameArb.filter((n) => n.length > 0),
        async (requiredField, extraField) => {
          // Avoid collision where required and extra are the same
          const extra = extraField === requiredField ? `${extraField}Extra` : extraField;

          const schema = z.object({
            [requiredField]: z.string(),
          }).strict();

          const app = express();
          app.use(express.json());
          app.post('/test', validateRequest({ body: schema }), (_req: Request, res: Response) => {
            res.status(200).json(success({ ok: true }));
          });

          // Send body with required field valid but also an extra unknown field
          const body: Record<string, string> = {
            [requiredField]: 'valid',
            [extra]: 'disallowed',
          };

          const resp = await request(app).post('/test').send(body);

          // Strict schema rejects unknown fields
          expect(resp.status).toBe(400);
          expect(resp.body.success).toBe(false);
          expect(Array.isArray(resp.body.details)).toBe(true);
          expect(resp.body.details.length).toBeGreaterThanOrEqual(1);

          // Details should mention field-level issue
          for (const detail of resp.body.details) {
            expect(typeof detail.field).toBe('string');
            expect(typeof detail.reason).toBe('string');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('valid requests pass through validateRequest without error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fieldNameArb, { minLength: 1, maxLength: 3 }).map((names) =>
          [...new Set(names)].slice(0, 3),
        ).filter((names) => names.length > 0),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        async (fieldNames, values) => {
          const shape: Record<string, z.ZodTypeAny> = {};
          for (const name of fieldNames) {
            shape[name] = z.string().min(1);
          }
          const schema = z.object(shape);

          const app = express();
          app.use(express.json());
          app.post('/test', validateRequest({ body: schema }), (_req: Request, res: Response) => {
            res.status(200).json(success({ ok: true }));
          });

          // Build a valid body
          const validBody: Record<string, string> = {};
          for (let i = 0; i < fieldNames.length; i++) {
            validBody[fieldNames[i]] = values[i % values.length] || 'val';
          }

          const resp = await request(app).post('/test').send(validBody);

          // Valid request should pass (2xx, success: true)
          expect(resp.status).toBe(200);
          expect(resp.body.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
