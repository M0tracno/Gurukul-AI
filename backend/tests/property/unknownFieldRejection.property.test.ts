/**
 * Property-Based Test: Request Validation Rejects Unknown Fields (Property 3)
 *
 * Feature: gurukul-ai-modernization, Property 3: Request Validation Rejects Unknown Fields
 *
 * For any HTTP request body containing fields not defined in the endpoint's Zod
 * validation schema, the Backend_Service SHALL reject the request with HTTP 400
 * before executing controller logic.
 *
 * **Validates: Requirements 2.3**
 */

import { jest, describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest, ValidationSchemas } from '../../src/middleware/validateRequest.js';

// --- Helpers ---

/**
 * Creates mock Express request/response/next objects for testing the middleware.
 */
function createMocks(overrides: {
  body?: unknown;
  query?: unknown;
  params?: unknown;
} = {}) {
  const req = {
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    params: overrides.params ?? {},
  } as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next: NextFunction = jest.fn();

  return { req, res, next };
}

// --- Generators ---

/**
 * Generates a random field name that is NOT in the set of known fields.
 * Uses alphanumeric strings that won't collide with the small known schema fields.
 */
function unknownFieldNameArb(knownFields: string[]): fc.Arbitrary<string> {
  return fc
    .string({ minLength: 1, maxLength: 30, unit: fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')
    )})
    .filter((s) => !knownFields.includes(s) && s.length > 0);
}

/**
 * Generates arbitrary JSON-compatible values for unknown fields.
 */
const arbitraryValue: fc.Arbitrary<unknown> = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.double({ noNaN: true }),
  fc.boolean(),
  fc.constant(null),
  fc.array(fc.string(), { maxLength: 3 }),
  fc.dictionary(fc.string({ minLength: 1, maxLength: 5 }), fc.string(), { maxKeys: 3 }),
);

// --- Test Schemas ---

// A representative strict Zod schema (similar to createStudentBodySchema)
const testBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
}).strict();

const knownBodyFields = ['name', 'email', 'age'];

// A representative strict query schema
const testQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
}).strict();

const knownQueryFields = ['page', 'limit'];

// A representative strict params schema
const testParamsSchema = z.object({
  id: z.string().min(1),
}).strict();

const knownParamsFields = ['id'];

// --- Property Tests ---

describe('Property 3: Request Validation Rejects Unknown Fields', () => {
  /**
   * Property: For any request body containing at least one field not defined in the
   * endpoint's strict Zod schema, the middleware rejects with HTTP 400 and does NOT
   * call next() (controller logic never executes).
   */
  it('should reject request bodies with unknown fields before controller logic executes', async () => {
    await fc.assert(
      fc.property(
        // Generate 1-5 unknown field names with arbitrary values
        fc.array(
          fc.tuple(unknownFieldNameArb(knownBodyFields), arbitraryValue),
          { minLength: 1, maxLength: 5 }
        ),
        (unknownFields) => {
          // Build a body with valid known fields + unknown fields
          const body: Record<string, unknown> = {
            name: 'ValidName',
            email: 'valid@example.com',
          };
          for (const [key, value] of unknownFields) {
            body[key] = value;
          }

          const { req, res, next } = createMocks({ body });
          const schemas: ValidationSchemas = { body: testBodySchema };

          validateRequest(schemas)(req, res, next);

          // Controller logic (next) must NOT be called
          expect(next).not.toHaveBeenCalled();
          // Must respond with 400
          expect(res.status).toHaveBeenCalledWith(400);
          // Response must contain the ErrorEnvelope structure
          const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
          expect(jsonCall.success).toBe(false);
          expect(jsonCall.message).toBeDefined();
          expect(Array.isArray(jsonCall.details)).toBe(true);
          expect((jsonCall.details as unknown[]).length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any request query containing unknown parameters not in the strict
   * query schema, the middleware rejects with HTTP 400 before controller execution.
   */
  it('should reject query parameters with unknown fields before controller logic executes', async () => {
    await fc.assert(
      fc.property(
        fc.array(
          fc.tuple(unknownFieldNameArb(knownQueryFields), fc.string({ minLength: 1, maxLength: 20 })),
          { minLength: 1, maxLength: 5 }
        ),
        (unknownFields) => {
          // Build a query with valid known fields + unknown fields
          const query: Record<string, unknown> = {
            page: '1',
            limit: '10',
          };
          for (const [key, value] of unknownFields) {
            query[key] = value;
          }

          const { req, res, next } = createMocks({ query });
          const schemas: ValidationSchemas = { query: testQuerySchema };

          validateRequest(schemas)(req, res, next);

          // Controller logic (next) must NOT be called
          expect(next).not.toHaveBeenCalled();
          // Must respond with 400
          expect(res.status).toHaveBeenCalledWith(400);
          const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
          expect(jsonCall.success).toBe(false);
          expect(Array.isArray(jsonCall.details)).toBe(true);
          expect((jsonCall.details as unknown[]).length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any request params containing unknown fields not in the strict
   * params schema, the middleware rejects with HTTP 400 before controller execution.
   */
  it('should reject path params with unknown fields before controller logic executes', async () => {
    await fc.assert(
      fc.property(
        fc.array(
          fc.tuple(unknownFieldNameArb(knownParamsFields), fc.string({ minLength: 1, maxLength: 20 })),
          { minLength: 1, maxLength: 3 }
        ),
        (unknownFields) => {
          // Build params with valid known field + unknown fields
          const params: Record<string, unknown> = {
            id: 'valid-id-123',
          };
          for (const [key, value] of unknownFields) {
            params[key] = value;
          }

          const { req, res, next } = createMocks({ params });
          const schemas: ValidationSchemas = { params: testParamsSchema };

          validateRequest(schemas)(req, res, next);

          // Controller logic (next) must NOT be called
          expect(next).not.toHaveBeenCalled();
          // Must respond with 400
          expect(res.status).toHaveBeenCalledWith(400);
          const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
          expect(jsonCall.success).toBe(false);
          expect(Array.isArray(jsonCall.details)).toBe(true);
          expect((jsonCall.details as unknown[]).length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid request body with ONLY known fields and correct types,
   * the middleware passes through (next is called). This confirms the inverse —
   * rejection only happens when unknown fields are present.
   */
  it('should allow request bodies with only known valid fields (inverse check)', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.constant('test@example.com'),
          age: fc.option(fc.integer({ min: 1, max: 150 }), { nil: undefined }),
        }),
        (body) => {
          // Remove undefined values to match what a real request would have
          const cleanBody: Record<string, unknown> = { name: body.name, email: body.email };
          if (body.age !== undefined) {
            cleanBody.age = body.age;
          }

          const { req, res, next } = createMocks({ body: cleanBody });
          const schemas: ValidationSchemas = { body: testBodySchema };

          validateRequest(schemas)(req, res, next);

          // Controller should be called (next invoked)
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
