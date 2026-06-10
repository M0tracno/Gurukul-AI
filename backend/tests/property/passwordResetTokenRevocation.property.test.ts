/**
 * Property 18: Password reset revokes all active refresh tokens
 *
 * For any account with active refresh tokens, a successful password reset SHALL
 * revoke every active refresh token for that account so that no existing
 * session can be refreshed.
 *
 * Feature: secure-admin-user-management, Property 18: Password reset revokes all active refresh tokens
 *
 * **Validates: Requirements 9.3**
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
import type { UserModelType } from '../../src/services/authTokenService.js';

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

const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type AccountType = 'student' | 'faculty';
type Method = 'admin_set' | 'temporary_password';

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Create an account of the given type via the admin create path and return its id.
 */
async function createAccount(accountType: AccountType): Promise<string> {
  const suffix = uniqueSuffix();
  if (accountType === 'student') {
    const response = await studentService.createWithCredentials(
      {
        firstName: 'Test',
        lastName: 'Student',
        email: `student_${suffix}@school.edu`,
        studentId: `STU-${suffix}`,
        grade: '10th',
        credentialDeliveryMethod: 'admin_set',
        password: 'initialPassword123',
      },
      ctx,
    );
    return response.account._id;
  }
  const response = await facultyService.createWithCredentials(
    {
      firstName: 'Test',
      lastName: 'Faculty',
      email: `faculty_${suffix}@school.edu`,
      employeeId: `EMP-${suffix}`,
      department: 'Mathematics',
      credentialDeliveryMethod: 'admin_set',
      password: 'initialPassword123',
    },
    ctx,
  );
  return response.account._id;
}

/**
 * Seed `count` active (non-revoked, unexpired) refresh tokens for an account,
 * plus `alreadyRevoked` tokens that were revoked earlier. Returns nothing; the
 * caller inspects the collection after the reset.
 */
async function seedRefreshTokens(
  userId: string,
  userModel: UserModelType,
  active: number,
  alreadyRevoked: number,
): Promise<void> {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < active; i++) {
    docs.push({
      userId,
      userModel,
      tokenHash: `active_${userId}_${i}_${Math.random().toString(36).slice(2)}`,
      familyId: new mongoose.Types.ObjectId().toString(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      revokedAt: null,
    });
  }
  for (let i = 0; i < alreadyRevoked; i++) {
    docs.push({
      userId,
      userModel,
      tokenHash: `revoked_${userId}_${i}_${Math.random().toString(36).slice(2)}`,
      familyId: new mongoose.Types.ObjectId().toString(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      revokedAt: new Date(Date.now() - 1000),
    });
  }
  if (docs.length > 0) {
    await RefreshToken.create(docs);
  }
}

const scenarioArb = fc.record({
  accountType: fc.constantFrom<AccountType>('student', 'faculty'),
  method: fc.constantFrom<Method>('admin_set', 'temporary_password'),
  // At least one active token so the revocation has something to act on.
  activeTokens: fc.integer({ min: 1, max: 6 }),
  alreadyRevoked: fc.integer({ min: 0, max: 3 }),
  adminPassword: fc.string({ minLength: 8, maxLength: 24 }),
});

describe('Property 18: Password reset revokes all active refresh tokens', () => {
  it('a successful reset revokes every active refresh token for the account while leaving other accounts untouched', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        // Clean slate per run so generated identifiers never collide.
        await Student.deleteMany({});
        await Faculty.deleteMany({});
        await RefreshToken.deleteMany({});
        await AuditLog.deleteMany({});

        const service =
          scenario.accountType === 'student' ? studentService : facultyService;
        const userModel: UserModelType =
          scenario.accountType === 'student' ? 'Student' : 'Faculty';

        // Target account with a mix of active and already-revoked tokens.
        const targetId = await createAccount(scenario.accountType);
        await seedRefreshTokens(
          targetId,
          userModel,
          scenario.activeTokens,
          scenario.alreadyRevoked,
        );

        // A second, unrelated account whose active tokens must NOT be revoked.
        const otherId = await createAccount(scenario.accountType);
        await seedRefreshTokens(otherId, userModel, 2, 0);

        // Sanity: the target has the expected number of active tokens pre-reset.
        const activeBefore = await RefreshToken.countDocuments({
          userId: targetId,
          revokedAt: null,
        });
        expect(activeBefore).toBe(scenario.activeTokens);

        // Perform the reset.
        await service.resetPassword(
          targetId,
          scenario.method,
          ctx,
          scenario.method === 'admin_set' ? scenario.adminPassword : undefined,
        );

        // No active (non-revoked) refresh token remains for the target account.
        const activeAfter = await RefreshToken.countDocuments({
          userId: targetId,
          revokedAt: null,
        });
        expect(activeAfter).toBe(0);

        // Every token belonging to the target now carries a revocation timestamp.
        const targetTokens = await RefreshToken.find({ userId: targetId });
        expect(targetTokens.length).toBe(
          scenario.activeTokens + scenario.alreadyRevoked,
        );
        for (const token of targetTokens) {
          expect(token.revokedAt).not.toBeNull();
        }

        // The unrelated account's active tokens are left intact.
        const otherActive = await RefreshToken.countDocuments({
          userId: otherId,
          revokedAt: null,
        });
        expect(otherActive).toBe(2);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});
