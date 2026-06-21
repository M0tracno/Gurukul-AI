/**
 * Property 9: Valid account creation succeeds with an active account
 *
 * For any valid Student or Faculty creation request, the created account SHALL
 * be persisted active (`active: true`). Additionally, a faculty account created
 * without administrative privileges (the `isAdmin` flag omitted or false) SHALL
 * have `isAdmin: false` and `role: 'faculty'`.
 *
 * Feature: secure-admin-user-management, Property 9: Valid account creation succeeds with an active account
 *
 * **Validates: Requirements 4.1, 4.7, 5.1, 5.8**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';

import Student from '../../src/models/Student.js';
import Faculty from '../../src/models/Faculty.js';
import { studentService } from '../../src/services/studentService.js';
import { facultyService } from '../../src/services/facultyService.js';
import type { CredentialDeliveryMethod } from '../../src/services/credentialService.js';
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
});

/** Stub audit context standing in for the authenticated admin actor. */
const auditContext: AuditContext = {
  userId: '000000000000000000000001',
  role: 'admin',
  ip: '127.0.0.1',
  correlationId: 'test-correlation-id',
};

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Delivery methods that yield a usable credential without requiring an email
 * transport. `setup_link` is intentionally excluded here because it invokes
 * `emailService.sendSetupLink`, which rejects (502) when the transport is
 * unavailable in the test environment; the creation-outcome invariant is fully
 * exercised by the password-bearing methods.
 */
const deliveryMethodArb: fc.Arbitrary<Exclude<CredentialDeliveryMethod, 'setup_link'>> =
  fc.constantFrom('admin_set', 'temporary_password');

/** A non-empty, trimmed name fragment. */
const nameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .map((s) => `N${s.replace(/\s/g, '')}`)
  .filter((s) => s.length > 0);

/** An admin-set password that always satisfies the >= 8 char policy. */
const adminPasswordArb = fc
  .string({ minLength: 8, maxLength: 24 })
  .map((s) => `Pw${s}9aZ`);

describe('Property 9: Valid account creation succeeds with an active account', () => {
  it('valid student creation always yields an active account', async () => {
    await fc.assert(
      fc.asyncProperty(
        deliveryMethodArb,
        nameArb,
        nameArb,
        adminPasswordArb,
        async (method, firstName, lastName, password) => {
          const suffix = uniqueSuffix();
          const result = await studentService.createWithCredentials(
            {
              firstName,
              lastName,
              email: `student_${suffix}@school.edu`,
              studentId: `STU-${suffix}`,
              grade: '10th',
              credentialDeliveryMethod: method,
              password: method === 'admin_set' ? password : undefined,
            },
            auditContext,
          );

          // The created account is reported active (Requirement 4.1, 4.7).
          expect(result.account.active).toBe(true);

          // And the persisted record is active, too.
          const persisted = await Student.findById(result.account._id);
          expect(persisted).not.toBeNull();
          expect(persisted!.active).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 180000);

  it('valid faculty creation yields an active account; without admin privileges it is a plain faculty member', async () => {
    await fc.assert(
      fc.asyncProperty(
        deliveryMethodArb,
        nameArb,
        nameArb,
        adminPasswordArb,
        // isAdmin: undefined (omitted) or false → no admin privileges.
        fc.constantFrom<undefined | false>(undefined, false),
        async (method, firstName, lastName, password, isAdmin) => {
          const suffix = uniqueSuffix();
          const result = await facultyService.createWithCredentials(
            {
              firstName,
              lastName,
              email: `faculty_${suffix}@school.edu`,
              employeeId: `EMP-${suffix}`,
              department: 'Mathematics',
              credentialDeliveryMethod: method,
              password: method === 'admin_set' ? password : undefined,
              isAdmin,
            },
            auditContext,
          );

          // The created account is reported active (Requirement 5.1).
          expect(result.account.active).toBe(true);

          // Without admin privileges, the account is a plain faculty member
          // (Requirement 5.8).
          expect(result.account.isAdmin).toBe(false);
          expect(result.account.role).toBe('faculty');

          // And the persisted record agrees.
          const persisted = await Faculty.findById(result.account._id);
          expect(persisted).not.toBeNull();
          expect(persisted!.active).toBe(true);
          expect(persisted!.isAdmin).toBe(false);
          expect(persisted!.role).toBe('faculty');
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 180000);
});
