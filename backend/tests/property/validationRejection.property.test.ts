/**
 * Property 11: Invalid requests are rejected with 400 and field details
 *
 * For any creation, update, or list request that fails schema validation, the
 * System SHALL respond with HTTP 400, include a `details` array identifying the
 * invalid fields, and SHALL NOT persist any change.
 *
 * Feature: secure-admin-user-management, Property 11: Invalid requests are rejected with 400 and field details
 *
 * **Validates: Requirements 4.6, 5.6, 6.5, 12.1**
 *
 * Strategy: drive the real Zod schemas wired into the student/faculty routes
 * through the `validateRequest` middleware with mocked Express objects. Because
 * `validateRequest` runs ahead of the controller in the route chain, a 400
 * rejection means `next()` is never invoked — so the controller (and therefore
 * every persistence path) is never reached. Asserting `next` was not called is
 * the deterministic proof that "no persisted change" occurs.
 */

import { jest, describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';
import { Request, Response, NextFunction } from 'express';

import {
  validateRequest,
  ValidationSchemas,
} from '../../src/middleware/validateRequest.js';
import {
  createStudentBodySchema,
  updateStudentBodySchema,
  studentListQuerySchema,
} from '../../src/routes/studentRoutes.js';
import {
  createFacultyBodySchema,
  updateFacultyBodySchema,
  facultyListQuerySchema,
} from '../../src/routes/facultyRoutes.js';

// --- Mock helpers ---

/**
 * Build mock Express req/res/next. `next` is a jest mock so we can prove the
 * controller (the next handler) is never reached on a validation failure.
 */
function createMocks(
  overrides: { body?: unknown; query?: unknown; params?: unknown } = {},
) {
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

/**
 * Run a target (body/query/params) through the middleware and assert the
 * universal "invalid request" contract: HTTP 400, an error envelope carrying a
 * non-empty `details` array, and `next` never called (controller not reached →
 * no persisted change).
 */
function assertRejectedWithDetails(
  schemas: ValidationSchemas,
  mocks: { body?: unknown; query?: unknown; params?: unknown },
): void {
  const { req, res, next } = createMocks(mocks);

  validateRequest(schemas)(req, res, next);

  // Controller (next handler) must never run → nothing is persisted.
  expect(next).not.toHaveBeenCalled();
  // Rejected with HTTP 400.
  expect(res.status).toHaveBeenCalledWith(400);
  // Standardized error envelope with a non-empty field-level details array.
  const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as Record<
    string,
    unknown
  >;
  expect(jsonCall.success).toBe(false);
  expect(jsonCall.message).toBeDefined();
  expect(Array.isArray(jsonCall.details)).toBe(true);
  expect((jsonCall.details as unknown[]).length).toBeGreaterThan(0);
}

// --- Generators ---

// A short (invalid) password: shorter than the 8-char `admin_set` minimum.
const shortPasswordArb = fc.string({ maxLength: 7 });

// A string that is not one of the three valid credential delivery methods.
const invalidDeliveryMethodArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(
    (s) =>
      s !== 'admin_set' &&
      s !== 'temporary_password' &&
      s !== 'setup_link',
  );

// Email strings that fail Zod's `.email()` check.
const invalidEmailArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => !s.includes('@') || s.endsWith('@'));

/**
 * Valid student create body — the starting point we deliberately corrupt.
 */
function validStudentCreate(): Record<string, unknown> {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@school.edu',
    studentId: 'STU-2024-001',
    grade: '10',
    credentialDeliveryMethod: 'admin_set',
    password: 'securePass123',
  };
}

/**
 * Valid faculty create body — the starting point we deliberately corrupt.
 */
function validFacultyCreate(): Record<string, unknown> {
  return {
    firstName: 'Jane',
    lastName: 'Roe',
    email: 'jane.roe@school.edu',
    employeeId: 'EMP-2024-001',
    department: 'Mathematics',
    credentialDeliveryMethod: 'admin_set',
    password: 'securePass123',
  };
}

const studentRequiredFields = [
  'firstName',
  'lastName',
  'email',
  'studentId',
  'grade',
  'credentialDeliveryMethod',
] as const;

const facultyRequiredFields = [
  'firstName',
  'lastName',
  'email',
  'employeeId',
  'department',
  'credentialDeliveryMethod',
] as const;

/**
 * Produce an invalid create body from a valid base via one guaranteed-invalid
 * mutation: drop a required field, use a sub-8-char `admin_set` password, use
 * an unknown credential delivery method, or supply a malformed email.
 */
function invalidCreateArb(
  base: () => Record<string, unknown>,
  requiredFields: readonly string[],
): fc.Arbitrary<Record<string, unknown>> {
  const dropRequired = fc
    .constantFrom(...requiredFields)
    .map((field) => {
      const body = base();
      delete body[field];
      return body;
    });

  const shortPassword = shortPasswordArb.map((pw) => ({
    ...base(),
    credentialDeliveryMethod: 'admin_set',
    password: pw,
  }));

  const badMethod = invalidDeliveryMethodArb.map((method) => {
    const body = base();
    body.credentialDeliveryMethod = method;
    delete body.password;
    return body;
  });

  const badEmail = invalidEmailArb.map((email) => ({
    ...base(),
    email,
  }));

  return fc.oneof(dropRequired, shortPassword, badMethod, badEmail);
}

/**
 * Produce an invalid update body: malformed email, empty-string name (violates
 * `.min(1)`), or an unknown/forbidden field rejected by the `.strict()` schema
 * (e.g. the immutable identifier or credential material).
 */
function invalidUpdateArb(
  unknownField: string,
): fc.Arbitrary<Record<string, unknown>> {
  const badEmail = invalidEmailArb.map((email) => ({ email }));
  const emptyName = fc.constantFrom('firstName', 'lastName').map((f) => ({
    [f]: '',
  }));
  const unknownKey = fc
    .anything()
    .map((value) => ({ [unknownField]: value as unknown }));
  const passwordField = fc
    .string()
    .map((pw) => ({ password: pw }));

  return fc.oneof(badEmail, emptyName, unknownKey, passwordField);
}

/**
 * Produce an invalid list query: out-of-range limit/page (0, negative, or
 * > 100), an unknown query parameter, or a bad `active` enum value. Values are
 * strings because Express query params arrive as strings (the schema coerces).
 */
function invalidListQueryArb(): fc.Arbitrary<Record<string, unknown>> {
  const badLimit = fc
    .oneof(
      fc.integer({ min: 101, max: 100000 }),
      fc.integer({ min: -1000, max: 0 }),
    )
    .map((n) => ({ limit: String(n) }));

  const badPage = fc
    .integer({ min: -1000, max: 0 })
    .map((n) => ({ page: String(n) }));

  const unknownParam = fc
    .string({ minLength: 1, maxLength: 15 })
    .filter(
      (s) =>
        ![
          'page',
          'limit',
          'sortBy',
          'sortOrder',
          'grade',
          'department',
          'active',
          'search',
        ].includes(s),
    )
    .map((key) => ({ [key]: 'x' }));

  const badActive = fc
    .string({ minLength: 1, maxLength: 10 })
    .filter((s) => s !== 'true' && s !== 'false')
    .map((v) => ({ active: v }));

  return fc.oneof(badLimit, badPage, unknownParam, badActive);
}

// --- Tests ---

describe('Property 11: Invalid requests are rejected with 400 and field details', () => {
  it('rejects invalid student create bodies with 400 + details, never reaching the controller', () => {
    fc.assert(
      fc.property(
        invalidCreateArb(validStudentCreate, studentRequiredFields),
        (body) => {
          assertRejectedWithDetails(
            { body: createStudentBodySchema },
            { body },
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects invalid faculty create bodies with 400 + details, never reaching the controller', () => {
    fc.assert(
      fc.property(
        invalidCreateArb(validFacultyCreate, facultyRequiredFields),
        (body) => {
          assertRejectedWithDetails(
            { body: createFacultyBodySchema },
            { body },
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects invalid student update bodies with 400 + details, never reaching the controller', () => {
    fc.assert(
      fc.property(invalidUpdateArb('studentId'), (body) => {
        assertRejectedWithDetails(
          { body: updateStudentBodySchema },
          { body },
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects invalid faculty update bodies with 400 + details, never reaching the controller', () => {
    fc.assert(
      fc.property(invalidUpdateArb('employeeId'), (body) => {
        assertRejectedWithDetails(
          { body: updateFacultyBodySchema },
          { body },
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects invalid student list queries with 400 + details, never reaching the controller', () => {
    fc.assert(
      fc.property(invalidListQueryArb(), (query) => {
        assertRejectedWithDetails(
          { query: studentListQuerySchema },
          { query },
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects invalid faculty list queries with 400 + details, never reaching the controller', () => {
    fc.assert(
      fc.property(invalidListQueryArb(), (query) => {
        assertRejectedWithDetails(
          { query: facultyListQuerySchema },
          { query },
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
