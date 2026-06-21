/**
 * Property 8: Passwords are always stored hashed and never returned
 *
 * For any account creation, update, or password reset across Student_Accounts
 * and Faculty_Accounts, the persisted password SHALL be a bcrypt hash that
 * verifies against the originating plaintext and never equals the plaintext,
 * and no response body SHALL contain any password field (the deliberate
 * one-time Temporary_Password value excepted).
 *
 * Feature: secure-admin-user-management, Property 8: Passwords are always stored hashed and never returned
 *
 * **Validates: Requirements 4.2, 4.3, 5.2, 5.3, 6.4, 8.1, 9.5**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';

import Student from '../../src/models/Student.js';
import Faculty from '../../src/models/Faculty.js';
import RefreshToken from '../../src/models/RefreshToken.js';
import AuditLog from '../../src/models/AuditLog.js';
import { studentService } from '../../src/services/studentService.js';
import { facultyService } from '../../src/services/facultyService.js';
import type { AuditContext } from '../../src/utils/auditContext.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Student.deleteMany({});
  await Faculty.deleteMany({});
  await RefreshToken.deleteMany({});
  await AuditLog.deleteMany({});
});

/** Fixed audit context stub — the services only read these fields. */
const ctx: AuditContext = {
  userId: '507f1f77bcf86cd799439011',
  role: 'admin',
  ip: '127.0.0.1',
  correlationId: 'test-correlation-id',
};

/**
 * Recursively determine whether any object/array (at any depth) contains a key
 * named exactly `password` (case-insensitive). The deliberate one-time
 * `temporaryPassword` reveal is NOT a `password` key and is therefore allowed.
 */
function containsPasswordField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsPasswordField);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.toLowerCase() === 'password') {
        return true;
      }
      if (containsPasswordField(val)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Assert the stored password for an account is a bcrypt hash that verifies
 * against `plaintext` and never equals it (Requirements 4.2, 5.2).
 */
async function assertStoredPasswordIsHashed(
  Model: typeof Student | typeof Faculty,
  id: string,
  plaintext: string,
): Promise<void> {
  const stored = await (Model as typeof Student).findById(id).select('+password');
  expect(stored).not.toBeNull();
  // bcrypt hashes carry the `$2a$` / `$2b$` / `$2y$` prefix.
  expect(stored!.password).toMatch(/^\$2[aby]\$/);
  // Never stored in plaintext.
  expect(stored!.password).not.toBe(plaintext);
  // The hash verifies against the originating plaintext.
  await expect(stored!.matchPassword(plaintext)).resolves.toBe(true);
}

type AccountType = 'student' | 'faculty';
type Operation = 'create' | 'update' | 'reset';
type Method = 'admin_set' | 'temporary_password';

const scenarioArb = fc.record({
  accountType: fc.constantFrom<AccountType>('student', 'faculty'),
  operation: fc.constantFrom<Operation>('create', 'update', 'reset'),
  method: fc.constantFrom<Method>('admin_set', 'temporary_password'),
  // Admin-supplied passwords are always >= 8 characters (Requirement 8.1).
  adminPassword: fc.string({ minLength: 8, maxLength: 24 }),
  resetPassword: fc.string({ minLength: 8, maxLength: 24 }),
});

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Create an account of the given type via the admin create path. Returns the
 * id, the creation response, and the plaintext that should verify against the
 * stored hash.
 */
async function createAccount(
  accountType: AccountType,
  method: Method,
  adminPassword: string,
): Promise<{ id: string; response: unknown; plaintext: string }> {
  const suffix = uniqueSuffix();
  if (accountType === 'student') {
    const response = await studentService.createWithCredentials(
      {
        firstName: 'Test',
        lastName: 'Student',
        email: `student_${suffix}@school.edu`,
        studentId: `STU-${suffix}`,
        grade: '10th',
        credentialDeliveryMethod: method,
        password: method === 'admin_set' ? adminPassword : undefined,
      },
      ctx,
    );
    const plaintext =
      method === 'admin_set' ? adminPassword : response.temporaryPassword!;
    return { id: response.account._id, response, plaintext };
  }

  const response = await facultyService.createWithCredentials(
    {
      firstName: 'Test',
      lastName: 'Faculty',
      email: `faculty_${suffix}@school.edu`,
      employeeId: `EMP-${suffix}`,
      department: 'Mathematics',
      credentialDeliveryMethod: method,
      password: method === 'admin_set' ? adminPassword : undefined,
    },
    ctx,
  );
  const plaintext =
    method === 'admin_set' ? adminPassword : response.temporaryPassword!;
  return { id: response.account._id, response, plaintext };
}

describe('Property 8: Passwords are always stored hashed and never returned', () => {
  it('across create/update/reset for students and faculty, the stored password is a verifying bcrypt hash and no response contains a password field', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        // Clean slate per run so generated identifiers never collide.
        await Student.deleteMany({});
        await Faculty.deleteMany({});
        await RefreshToken.deleteMany({});

        const Model = scenario.accountType === 'student' ? Student : Faculty;
        const service =
          scenario.accountType === 'student' ? studentService : facultyService;

        if (scenario.operation === 'create') {
          const { id, response, plaintext } = await createAccount(
            scenario.accountType,
            scenario.method,
            scenario.adminPassword,
          );

          // No `password` field anywhere in the creation response.
          expect(containsPasswordField(response)).toBe(false);
          // Stored password is a verifying bcrypt hash, never the plaintext.
          await assertStoredPasswordIsHashed(Model, id, plaintext);
          return;
        }

        if (scenario.operation === 'update') {
          // Seed an account via admin_set so we know the originating plaintext.
          const { id, plaintext } = await createAccount(
            scenario.accountType,
            'admin_set',
            scenario.adminPassword,
          );

          // Update a non-credential profile field; the password must be left
          // untouched and the response must never expose it (Requirement 6.4).
          const updated =
            scenario.accountType === 'student'
              ? await studentService.updateAccount(
                  id,
                  { firstName: `Updated_${uniqueSuffix()}` },
                  ctx,
                )
              : await facultyService.updateAccount(
                  id,
                  { firstName: `Updated_${uniqueSuffix()}` },
                  ctx,
                );

          expect(containsPasswordField(updated)).toBe(false);
          // The originally-set password still verifies and is still hashed.
          await assertStoredPasswordIsHashed(Model, id, plaintext);
          return;
        }

        // operation === 'reset'
        // Seed with admin_set, then reset using the generated method.
        const { id } = await createAccount(
          scenario.accountType,
          'admin_set',
          scenario.adminPassword,
        );

        const resetResult = await service.resetPassword(
          id,
          scenario.method,
          ctx,
          scenario.method === 'admin_set' ? scenario.resetPassword : undefined,
        );

        const newPlaintext =
          scenario.method === 'admin_set'
            ? scenario.resetPassword
            : resetResult.temporaryPassword!;

        // No `password` field in the reset response (Requirement 9.5).
        expect(containsPasswordField(resetResult)).toBe(false);
        // The newly-set password is a verifying bcrypt hash, never plaintext.
        await assertStoredPasswordIsHashed(Model, id, newPlaintext);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});
