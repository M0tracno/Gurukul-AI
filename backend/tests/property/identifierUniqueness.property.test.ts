/**
 * Property 10: Identifier uniqueness is enforced on create and update
 *
 * For any create or update that would cause a duplicate `email`, `studentId`,
 * or `employeeId` within the same account type, the System SHALL respond with
 * HTTP 409 and SHALL NOT create or modify the conflicting record.
 *
 * Feature: secure-admin-user-management, Property 10: Identifier uniqueness is enforced on create and update
 *
 * **Validates: Requirements 4.4, 4.5, 5.4, 5.5, 6.3, 12.3**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';

import Student from '../../src/models/Student.js';
import Faculty from '../../src/models/Faculty.js';
import { studentService } from '../../src/services/studentService.js';
import { facultyService } from '../../src/services/facultyService.js';
import { AppError } from '../../src/middleware/errorHandler.js';
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

/**
 * Stub audit context — services forward this to the (in-memory) audit store.
 * `userId` must be a valid ObjectId because the AuditLog `actor.userId` path is
 * typed as an ObjectId reference.
 */
const ctx: AuditContext = {
  userId: new mongoose.Types.ObjectId().toString(),
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
 * Capture the AppError status code thrown by an operation, or `undefined` if it
 * resolved without throwing (which would itself fail the property).
 */
async function statusOf(op: () => Promise<unknown>): Promise<number | undefined> {
  try {
    await op();
    return undefined;
  } catch (err) {
    return err instanceof AppError ? err.statusCode : -1;
  }
}

// A safe profile-name fragment that always satisfies model validation.
const nameArb = fc
  .string({ minLength: 1, maxLength: 8 })
  .map((s) => s.replace(/[^a-zA-Z]/g, 'x') || 'x');

// Admin-supplied password (>= 8 chars) for the `admin_set` delivery method.
const passwordArb = fc.string({ minLength: 8, maxLength: 20 }).map((s) => `Pw1${s}`);

// Which identifier(s) the second create duplicates.
const dupChoiceArb = fc.constantFrom('email', 'identifier', 'both');

describe('Property 10: Identifier uniqueness is enforced on create and update', () => {
  it('rejects a duplicate student email or studentId on create with 409 and creates no second record', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArb,
        nameArb,
        passwordArb,
        dupChoiceArb,
        async (firstName, lastName, password, dup) => {
          // Clear state so the absolute counts below reflect only this run.
          await Student.deleteMany({});

          const suffix = uniqueSuffix();
          const seedEmail = `seed_${suffix}@school.edu`;
          const seedStudentId = `STU-${suffix}`;

          // Seed an existing student.
          await studentService.createWithCredentials(
            {
              firstName,
              lastName,
              email: seedEmail,
              studentId: seedStudentId,
              grade: '10th',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );

          // Build a second create that duplicates email, studentId, or both.
          const dupEmail = dup === 'identifier' ? `other_${suffix}@school.edu` : seedEmail;
          const dupStudentId = dup === 'email' ? `STU-OTHER-${suffix}` : seedStudentId;

          const status = await statusOf(() =>
            studentService.createWithCredentials(
              {
                firstName,
                lastName,
                email: dupEmail,
                studentId: dupStudentId,
                grade: '11th',
                credentialDeliveryMethod: 'admin_set',
                password,
              },
              ctx,
            ),
          );

          // Conflict → 409, and only the single seed record exists.
          expect(status).toBe(409);
          await expect(Student.countDocuments({})).resolves.toBe(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);

  it('rejects a duplicate faculty email or employeeId on create with 409 and creates no second record', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArb,
        nameArb,
        passwordArb,
        dupChoiceArb,
        async (firstName, lastName, password, dup) => {
          await Faculty.deleteMany({});

          const suffix = uniqueSuffix();
          const seedEmail = `seed_${suffix}@school.edu`;
          const seedEmployeeId = `EMP-${suffix}`;

          await facultyService.createWithCredentials(
            {
              firstName,
              lastName,
              email: seedEmail,
              employeeId: seedEmployeeId,
              department: 'Mathematics',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );

          const dupEmail = dup === 'identifier' ? `other_${suffix}@school.edu` : seedEmail;
          const dupEmployeeId = dup === 'email' ? `EMP-OTHER-${suffix}` : seedEmployeeId;

          const status = await statusOf(() =>
            facultyService.createWithCredentials(
              {
                firstName,
                lastName,
                email: dupEmail,
                employeeId: dupEmployeeId,
                department: 'Science',
                credentialDeliveryMethod: 'admin_set',
                password,
              },
              ctx,
            ),
          );

          expect(status).toBe(409);
          await expect(Faculty.countDocuments({})).resolves.toBe(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);

  it('rejects updating a student email to one already used by another student with 409 and leaves the record unmodified', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArb,
        nameArb,
        passwordArb,
        async (firstName, lastName, password) => {
          await Student.deleteMany({});

          const suffix = uniqueSuffix();
          const emailA = `a_${suffix}@school.edu`;
          const emailB = `b_${suffix}@school.edu`;

          const a = await studentService.createWithCredentials(
            {
              firstName,
              lastName,
              email: emailA,
              studentId: `STU-A-${suffix}`,
              grade: '10th',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );
          await studentService.createWithCredentials(
            {
              firstName,
              lastName,
              email: emailB,
              studentId: `STU-B-${suffix}`,
              grade: '10th',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );

          // Update A's email to B's email → 409.
          const status = await statusOf(() =>
            studentService.updateAccount(a.account._id, { email: emailB }, ctx),
          );

          expect(status).toBe(409);
          // A is unmodified: its email is still emailA.
          const reloaded = await Student.findById(a.account._id);
          expect(reloaded?.email).toBe(emailA);
          await expect(Student.countDocuments({})).resolves.toBe(2);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);

  it('rejects updating a faculty email to one already used by another faculty with 409 and leaves the record unmodified', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArb,
        nameArb,
        passwordArb,
        async (firstName, lastName, password) => {
          await Faculty.deleteMany({});

          const suffix = uniqueSuffix();
          const emailA = `a_${suffix}@school.edu`;
          const emailB = `b_${suffix}@school.edu`;

          const a = await facultyService.createWithCredentials(
            {
              firstName,
              lastName,
              email: emailA,
              employeeId: `EMP-A-${suffix}`,
              department: 'Mathematics',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );
          await facultyService.createWithCredentials(
            {
              firstName,
              lastName,
              email: emailB,
              employeeId: `EMP-B-${suffix}`,
              department: 'Mathematics',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );

          const status = await statusOf(() =>
            facultyService.updateAccount(a.account._id, { email: emailB }, ctx),
          );

          expect(status).toBe(409);
          const reloaded = await Faculty.findById(a.account._id);
          expect(reloaded?.email).toBe(emailA);
          await expect(Faculty.countDocuments({})).resolves.toBe(2);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);
});
