/**
 * Property 17: Deactivation blocks authentication; reactivation restores it
 *
 * For any account, while `active` is false the System SHALL deny authentication
 * for that account's credential; and deactivating then reactivating an account
 * SHALL clear `deletedAt`, set `active` to true, and remove the
 * deactivation-based authentication block.
 *
 * Feature: secure-admin-user-management, Property 17: Deactivation blocks authentication; reactivation restores it
 *
 * **Validates: Requirements 7.3, 7.4**
 */

import type { Request, Response } from 'express';
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
import { authController } from '../../src/controllers/authController.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import type { AuditContext } from '../../src/utils/auditContext.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // The real authController.login issues a JWT access token on success, which
  // requires JWT_SECRET. Provide a deterministic test secret so the success
  // path (post-reactivation login) is fully exercisable.
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-deactivation-auth-blocking';

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

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

type AccountType = 'student' | 'faculty';

/** Outcome of an attempted authentication via the real login controller. */
interface LoginOutcome {
  ok: boolean;
  status?: number;
  errorCode?: string;
}

/**
 * Drive the real `authController.login` with a mocked request/response and
 * report whether authentication succeeded (200 with tokens) or was denied
 * (an `AppError` was thrown). This exercises the actual `active`-flag gate and
 * the `deletedAt` soft-delete filter rather than re-implementing them.
 */
async function attemptLogin(
  email: string,
  password: string,
  userType: AccountType,
): Promise<LoginOutcome> {
  const loginUserType = userType === 'student' ? 'student' : 'faculty';
  const req = { body: { email, password, userType: loginUserType } } as unknown as Request;

  let capturedStatus: number | undefined;
  let capturedBody: unknown;
  const res = {
    status(code: number) {
      capturedStatus = code;
      return this;
    },
    json(body: unknown) {
      capturedBody = body;
      return this;
    },
  } as unknown as Response;

  try {
    await authController.login(req, res);
    void capturedBody;
    return { ok: true, status: capturedStatus };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, status: err.statusCode, errorCode: err.errorCode };
    }
    throw err;
  }
}

/**
 * Create an account of the given type with a known `admin_set` password so the
 * credential can be used to drive login attempts. Returns id + email.
 */
async function createAccount(
  accountType: AccountType,
  password: string,
): Promise<{ id: string; email: string }> {
  const suffix = uniqueSuffix();
  if (accountType === 'student') {
    const email = `student_${suffix}@school.edu`;
    const response = await studentService.createWithCredentials(
      {
        firstName: 'Test',
        lastName: 'Student',
        email,
        studentId: `STU-${suffix}`,
        grade: '10th',
        credentialDeliveryMethod: 'admin_set',
        password,
      },
      ctx,
    );
    return { id: response.account._id, email };
  }

  const email = `faculty_${suffix}@school.edu`;
  const response = await facultyService.createWithCredentials(
    {
      firstName: 'Test',
      lastName: 'Faculty',
      email,
      employeeId: `EMP-${suffix}`,
      department: 'Mathematics',
      credentialDeliveryMethod: 'admin_set',
      password,
    },
    ctx,
  );
  return { id: response.account._id, email };
}

const scenarioArb = fc.record({
  accountType: fc.constantFrom<AccountType>('student', 'faculty'),
  // Admin-set passwords always satisfy the >= 8 char policy.
  password: fc.string({ minLength: 8, maxLength: 24 }).map((s) => `Pw9aZ${s}`),
});

describe('Property 17: Deactivation blocks authentication; reactivation restores it', () => {
  it('denies auth while active:false and restores it after deactivate-then-reactivate', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ accountType, password }) => {
        // Clean slate per run so generated identifiers never collide.
        await Student.deleteMany({});
        await Faculty.deleteMany({});
        await RefreshToken.deleteMany({});

        const Model = accountType === 'student' ? Student : Faculty;
        const service = accountType === 'student' ? studentService : facultyService;

        const { id, email } = await createAccount(accountType, password);

        // Control: a freshly-created active account can authenticate.
        const initial = await attemptLogin(email, password, accountType);
        expect(initial.ok).toBe(true);
        expect(initial.status).toBe(200);

        // --- Requirement 7.3: WHILE active is false, deny authentication. ---
        // Isolate the `active` gate from the soft-delete `deletedAt` filter by
        // flipping only `active` to false (deletedAt left null).
        await (Model as typeof Student)
          .findByIdAndUpdate(id, { $set: { active: false } })
          .exec();

        const blockedByActiveFlag = await attemptLogin(email, password, accountType);
        expect(blockedByActiveFlag.ok).toBe(false);
        expect(blockedByActiveFlag.status).toBe(401);
        // The dedicated active-flag gate surfaces the ACCOUNT_INACTIVE code.
        expect(blockedByActiveFlag.errorCode).toBe('ACCOUNT_INACTIVE');

        // Restore for the lifecycle portion of the property.
        await (Model as typeof Student)
          .findByIdAndUpdate(id, { $set: { active: true, deletedAt: null } })
          .exec();

        // --- Requirement 7.1/7.3: soft-delete deactivation blocks auth. ---
        await service.deactivate(id, ctx);

        const afterDeactivate = await (Model as typeof Student)
          .findById(id)
          .lean()
          .exec();
        expect(afterDeactivate).not.toBeNull();
        expect(afterDeactivate!.active).toBe(false);
        expect(afterDeactivate!.deletedAt).toBeInstanceOf(Date);

        const blockedAfterDeactivate = await attemptLogin(email, password, accountType);
        expect(blockedAfterDeactivate.ok).toBe(false);
        expect(blockedAfterDeactivate.status).toBe(401);

        // --- Requirement 7.4: reactivation clears the block. ---
        const reactivated = await service.reactivate(id, ctx);
        expect(reactivated.active).toBe(true);

        const afterReactivate = await (Model as typeof Student)
          .findById(id)
          .lean()
          .exec();
        expect(afterReactivate).not.toBeNull();
        expect(afterReactivate!.active).toBe(true);
        // deletedAt is cleared on reactivation.
        expect(afterReactivate!.deletedAt ?? null).toBeNull();

        // Authentication works again once the deactivation block is removed.
        const afterReactivateLogin = await attemptLogin(email, password, accountType);
        expect(afterReactivateLogin.ok).toBe(true);
        expect(afterReactivateLogin.status).toBe(200);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});
