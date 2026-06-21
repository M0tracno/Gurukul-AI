/**
 * Property 16: Update of a missing account is a not-found, and delete is a soft-delete
 *
 * For any update, delete, or password-reset targeting a non-existent account id,
 * the System SHALL respond with HTTP 404 and SHALL NOT create any record. For a
 * delete of an existing account, the System SHALL perform a soft-delete:
 * `active` becomes false, `deletedAt` is recorded, the record is retained, and
 * the operation succeeds (HTTP 200).
 *
 * Feature: secure-admin-user-management, Property 16: Update of a missing account is a not-found, and delete is a soft-delete
 *
 * **Validates: Requirements 6.2, 7.1, 7.2, 12.2**
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
  await RefreshToken.deleteMany({});
  await AuditLog.deleteMany({});
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
 * resolved without throwing (which would itself fail the property), or `-1`
 * when a non-AppError escapes.
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

// A fresh, syntactically valid ObjectId that no seeded record will own.
const missingIdArb = fc.constant(null).map(() => new mongoose.Types.ObjectId().toString());

describe('Property 16: Update of a missing account is a not-found, and delete is a soft-delete', () => {
  it('returns 404 (and creates no record) for update/deactivate/reset of a missing student id', async () => {
    await fc.assert(
      fc.asyncProperty(
        missingIdArb,
        nameArb,
        passwordArb,
        async (missingId, firstName, password) => {
          await Student.deleteMany({});

          const updateStatus = await statusOf(() =>
            studentService.updateAccount(missingId, { firstName }, ctx),
          );
          const deactivateStatus = await statusOf(() =>
            studentService.deactivate(missingId, ctx),
          );
          const resetStatus = await statusOf(() =>
            studentService.resetPassword(missingId, 'admin_set', ctx, password),
          );

          expect(updateStatus).toBe(404);
          expect(deactivateStatus).toBe(404);
          expect(resetStatus).toBe(404);

          // None of the not-found operations created a record.
          await expect(Student.countDocuments({})).resolves.toBe(0);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);

  it('returns 404 (and creates no record) for update/deactivate/reset of a missing faculty id', async () => {
    await fc.assert(
      fc.asyncProperty(
        missingIdArb,
        nameArb,
        passwordArb,
        async (missingId, firstName, password) => {
          await Faculty.deleteMany({});

          const updateStatus = await statusOf(() =>
            facultyService.updateAccount(missingId, { firstName }, ctx),
          );
          const deactivateStatus = await statusOf(() =>
            facultyService.deactivate(missingId, ctx),
          );
          const resetStatus = await statusOf(() =>
            facultyService.resetPassword(missingId, 'admin_set', ctx, password),
          );

          expect(updateStatus).toBe(404);
          expect(deactivateStatus).toBe(404);
          expect(resetStatus).toBe(404);

          await expect(Faculty.countDocuments({})).resolves.toBe(0);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);

  it('soft-deletes an existing student: active becomes false, deletedAt is recorded, the record is retained', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArb,
        nameArb,
        passwordArb,
        async (firstName, lastName, password) => {
          await Student.deleteMany({});

          const suffix = uniqueSuffix();
          const created = await studentService.createWithCredentials(
            {
              firstName,
              lastName,
              email: `student_${suffix}@school.edu`,
              studentId: `STU-${suffix}`,
              grade: '10th',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );
          const id = created.account._id;

          // The newly-created account is active and not soft-deleted.
          const before = await Student.findById(id);
          expect(before?.active).toBe(true);

          // Deactivate resolves without throwing (the controller maps this to 200).
          const status = await statusOf(() => studentService.deactivate(id, ctx));
          expect(status).toBeUndefined();

          // The record is retained, marked inactive, with a deletedAt timestamp.
          const after = await Student.findById(id);
          expect(after).not.toBeNull();
          expect(after?.active).toBe(false);
          expect(after?.deletedAt).toBeInstanceOf(Date);
          await expect(Student.countDocuments({})).resolves.toBe(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);

  it('soft-deletes an existing faculty member: active becomes false, deletedAt is recorded, the record is retained', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArb,
        nameArb,
        passwordArb,
        async (firstName, lastName, password) => {
          await Faculty.deleteMany({});

          const suffix = uniqueSuffix();
          const created = await facultyService.createWithCredentials(
            {
              firstName,
              lastName,
              email: `faculty_${suffix}@school.edu`,
              employeeId: `EMP-${suffix}`,
              department: 'Mathematics',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );
          const id = created.account._id;

          const before = await Faculty.findById(id);
          expect(before?.active).toBe(true);

          const status = await statusOf(() => facultyService.deactivate(id, ctx));
          expect(status).toBeUndefined();

          const after = await Faculty.findById(id);
          expect(after).not.toBeNull();
          expect(after?.active).toBe(false);
          expect(after?.deletedAt).toBeInstanceOf(Date);
          await expect(Faculty.countDocuments({})).resolves.toBe(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 300000);
});
