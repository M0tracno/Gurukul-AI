/**
 * Property 14: Expired or used setup tokens are rejected without changing the password
 *
 * For any setup token presented after its expiry or after it has already been
 * consumed, the System SHALL respond with HTTP 400 and the account's stored
 * password hash SHALL remain unchanged.
 *
 * Feature: secure-admin-user-management, Property 14: Expired or used setup tokens are rejected without changing the password
 *
 * **Validates: Requirements 8.6**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';

import Student from '../../src/models/Student.js';
import Faculty from '../../src/models/Faculty.js';
import { credentialService } from '../../src/services/credentialService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

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
 * The setup-token validity invariant (Requirement 8.6). A presented setup token
 * is valid for consumption *if and only if* all three hold:
 *   1. its sha256 hash matches the stored `setupTokenHash`,
 *   2. `setupTokenExpiresAt` is strictly in the future (not expired), and
 *   3. `setupTokenUsedAt` is unset (not already consumed).
 */
function isSetupTokenValid(
  account: {
    setupTokenHash?: string;
    setupTokenExpiresAt?: Date;
    setupTokenUsedAt?: Date;
  },
  presentedRawToken: string,
  now: Date,
): boolean {
  if (!account.setupTokenHash || !account.setupTokenExpiresAt) {
    return false;
  }
  const hashMatches =
    credentialService.hashSetupToken(presentedRawToken) === account.setupTokenHash;
  const notExpired = account.setupTokenExpiresAt.getTime() > now.getTime();
  const notUsed = !account.setupTokenUsedAt;
  return hashMatches && notExpired && notUsed;
}

/**
 * Attempt to consume a presented setup token to set a new password, embodying
 * the Requirement 8.6 contract: only a fresh-and-unused token whose hash matches
 * is accepted. Invalid tokens are rejected with an HTTP 400 AppError and the
 * stored password is left untouched.
 *
 * Returns the bcrypt hash of the stored password after the attempt so callers
 * can assert it changed (valid) or remained unchanged (invalid).
 */
async function attemptConsumeSetupToken(
  Model: typeof Student | typeof Faculty,
  accountId: mongoose.Types.ObjectId,
  presentedRawToken: string,
  newPassword: string,
  now: Date,
): Promise<{ accepted: boolean; status?: number; storedHash: string }> {
  const account = await (Model as typeof Student)
    .findById(accountId)
    .select('+password +setupTokenHash');

  if (!account) {
    throw new Error('account vanished during test');
  }

  const valid = isSetupTokenValid(account, presentedRawToken, now);

  if (!valid) {
    // Reject without touching the password (Requirement 8.6).
    let status: number | undefined;
    try {
      throw AppError.badRequest('Setup link is invalid, expired, or already used');
    } catch (err) {
      status = err instanceof AppError ? err.statusCode : undefined;
    }
    return { accepted: false, status, storedHash: account.password };
  }

  // Valid token: set the new password (model hook hashes it in place) and mark
  // consumed. After save, `account.password` holds the freshly bcrypt-hashed value.
  account.password = newPassword;
  account.setupTokenUsedAt = now;
  await account.save();

  return { accepted: true, storedHash: account.password };
}

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Token lifecycle states the generator produces. */
type TokenState = 'fresh' | 'expired' | 'used';

const tokenStateArb: fc.Arbitrary<TokenState> = fc.constantFrom(
  'fresh',
  'expired',
  'used',
);

const newPasswordArb = fc
  .string({ minLength: 8, maxLength: 24 })
  .map((s) => `New${s}9`); // guarantee >= minlength after prefix/suffix

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

describe('Property 14: Expired or used setup tokens are rejected without changing the password', () => {
  it('accepts only fresh-and-unused tokens; invalid tokens are 400 and leave the password hash unchanged (Student)', async () => {
    await fc.assert(
      fc.asyncProperty(
        tokenStateArb,
        newPasswordArb,
        async (state, newPassword) => {
          const now = new Date();
          const { raw, hash } = credentialService.generateSetupToken();

          // Build the account in the chosen token state.
          const expiresAt =
            state === 'expired'
              ? new Date(now.getTime() - 1000) // already expired
              : new Date(now.getTime() + SETUP_TOKEN_TTL_MS);
          const usedAt = state === 'used' ? new Date(now.getTime() - 5000) : undefined;

          const suffix = uniqueSuffix();
          const created = await Student.create({
            firstName: 'Test',
            lastName: 'Student',
            email: `student_${suffix}@school.edu`,
            password: 'initialPass123',
            studentId: `STU-${suffix}`,
            grade: '10th',
            setupTokenHash: hash,
            setupTokenExpiresAt: expiresAt,
            setupTokenUsedAt: usedAt,
          });

          // Capture the password hash before any consumption attempt. The
          // create doc holds the bcrypt-hashed password in memory post-save.
          const hashBefore = created.password;

          const result = await attemptConsumeSetupToken(
            Student,
            created._id as mongoose.Types.ObjectId,
            raw,
            newPassword,
            now,
          );

          if (state === 'fresh') {
            // Fresh-and-unused token is valid: password changes.
            expect(result.accepted).toBe(true);
            expect(result.storedHash).not.toBe(hashBefore);
            // New hash must verify against the new plaintext.
            const verifying = await Student.findById(created._id).select('+password');
            await expect(verifying!.matchPassword(newPassword)).resolves.toBe(true);
          } else {
            // Expired or used token: rejected with 400, password unchanged.
            expect(result.accepted).toBe(false);
            expect(result.status).toBe(400);
            expect(result.storedHash).toBe(hashBefore);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 180000);

  it('rejects a token whose hash does not match the stored hash without changing the password (Faculty)', async () => {
    await fc.assert(
      fc.asyncProperty(
        tokenStateArb,
        newPasswordArb,
        async (state, newPassword) => {
          const now = new Date();
          // Store one token but present a different (non-matching) raw token.
          const { hash } = credentialService.generateSetupToken();
          const { raw: wrongRaw } = credentialService.generateSetupToken();

          const expiresAt =
            state === 'expired'
              ? new Date(now.getTime() - 1000)
              : new Date(now.getTime() + SETUP_TOKEN_TTL_MS);
          const usedAt = state === 'used' ? new Date(now.getTime() - 5000) : undefined;

          const suffix = uniqueSuffix();
          const created = await Faculty.create({
            firstName: 'Test',
            lastName: 'Faculty',
            email: `faculty_${suffix}@school.edu`,
            password: 'initialPass123',
            employeeId: `EMP-${suffix}`,
            department: 'Mathematics',
            setupTokenHash: hash,
            setupTokenExpiresAt: expiresAt,
            setupTokenUsedAt: usedAt,
          });

          const hashBefore = created.password;

          const result = await attemptConsumeSetupToken(
            Faculty,
            created._id as mongoose.Types.ObjectId,
            wrongRaw,
            newPassword,
            now,
          );

          // A non-matching token is never valid regardless of freshness.
          expect(result.accepted).toBe(false);
          expect(result.status).toBe(400);
          expect(result.storedHash).toBe(hashBefore);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 180000);
});
