/**
 * Example test: bcrypt hashing failure during account creation
 *
 * Feature: secure-admin-user-management, Task 7.10
 *
 * Requirement 5.7: IF bcrypt hashing of the password fails during creation of a
 * Student_Account or Faculty_Account, THEN THE System SHALL respond with HTTP
 * status 500 and SHALL NOT persist the account.
 *
 * Strategy: mock `bcryptjs` so the model pre-save hook's `genSalt` call throws.
 * The hashing failure must surface as an `AppError` carrying HTTP 500, and the
 * collection must remain empty (nothing persisted).
 *
 * **Validates: Requirements 5.7**
 */

import { jest, describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock bcryptjs BEFORE importing any module that pulls in the models. Both the
// Student and Faculty pre-save hooks call `bcrypt.genSalt(12)` first, so making
// it throw simulates a hashing failure. The models use `import * as bcrypt`, so
// the mock exposes the functions as named exports (and a default namespace).
const hashingError = new Error('bcrypt hashing failed');
const genSalt = jest.fn<() => Promise<string>>(() => {
  throw hashingError;
});
const hash = jest.fn<() => Promise<string>>(() => {
  throw hashingError;
});
const compare = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);

jest.unstable_mockModule('bcryptjs', () => ({
  genSalt,
  hash,
  compare,
  default: { genSalt, hash, compare },
}));

const Student = (await import('../../src/models/Student.js')).default;
const Faculty = (await import('../../src/models/Faculty.js')).default;
const { studentService } = await import('../../src/services/studentService.js');
const { facultyService } = await import('../../src/services/facultyService.js');
const { AppError } = await import('../../src/middleware/errorHandler.js');
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

describe('bcrypt hashing failure during account creation (Requirement 5.7)', () => {
  it('student create responds 500 and does not persist the account when hashing throws', async () => {
    expect.assertions(4);

    try {
      await studentService.createWithCredentials(
        {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@school.edu',
          studentId: 'STU-5-7',
          grade: '10th',
          credentialDeliveryMethod: 'admin_set',
          password: 'a-valid-password',
        },
        auditContext,
      );
    } catch (err) {
      // Hashing failure surfaces as an AppError with HTTP 500.
      expect(err).toBeInstanceOf(AppError);
      expect((err as InstanceType<typeof AppError>).statusCode).toBe(500);
    }

    // bcrypt.genSalt was reached during the pre-save hook.
    expect(genSalt).toHaveBeenCalled();

    // Nothing was persisted.
    const count = await Student.countDocuments({});
    expect(count).toBe(0);
  });

  it('faculty create responds 500 and does not persist the account when hashing throws', async () => {
    expect.assertions(3);

    try {
      await facultyService.createWithCredentials(
        {
          firstName: 'Alan',
          lastName: 'Turing',
          email: 'alan@school.edu',
          employeeId: 'EMP-5-7',
          department: 'Mathematics',
          credentialDeliveryMethod: 'admin_set',
          password: 'a-valid-password',
        },
        auditContext,
      );
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as InstanceType<typeof AppError>).statusCode).toBe(500);
    }

    // Nothing was persisted.
    const count = await Faculty.countDocuments({});
    expect(count).toBe(0);
  });
});
