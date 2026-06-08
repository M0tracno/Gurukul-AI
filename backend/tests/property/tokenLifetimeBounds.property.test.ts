/**
 * Property 6: Token Lifetime Bounds
 *
 * For any generated token pair, the access token's expiration SHALL be at most
 * 15 minutes from issuance and the refresh token's expiration SHALL be at most
 * 7 days from issuance.
 *
 * Feature: gurukul-ai-modernization, Property 6: Token Lifetime Bounds
 *
 * **Validates: Requirements 4.1**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { AuthTokenService } from '../../src/services/authTokenService.js';
import type { UserRole } from '../../src/types/common.js';
import type { UserModelType } from '../../src/services/authTokenService.js';
import RefreshToken from '../../src/models/RefreshToken.js';

let mongoServer: MongoMemoryServer;

const TEST_JWT_SECRET = 'test-secret-for-property-testing-only';

beforeAll(async () => {
  // Set JWT_SECRET for test environment
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

afterEach(async () => {
  await RefreshToken.deleteMany({});
});

// Constants for time bounds
const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60;
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

// Valid roles and their corresponding user model types
const ROLE_TO_MODEL: Record<UserRole, UserModelType> = {
  student: 'Student',
  teacher: 'Faculty',
  parent: 'Parent',
  admin: 'Admin',
};

/**
 * Arbitrary that generates valid user IDs (24-char hex strings like MongoDB ObjectIds)
 */
const userIdArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 24, maxLength: 24 })
  .map((chars) => chars.join(''));

/**
 * Arbitrary that generates valid user roles
 */
const roleArb: fc.Arbitrary<UserRole> = fc.constantFrom<UserRole>('student', 'teacher', 'parent', 'admin');

describe('Property 6: Token Lifetime Bounds', () => {
  const authTokenService = new AuthTokenService();

  it('access token expiration is at most 15 minutes from issuance for any user/role', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        roleArb,
        async (userId: string, role: UserRole) => {
          const userModel = ROLE_TO_MODEL[role];
          const beforeIssuance = Math.floor(Date.now() / 1000);

          const tokenPair = await authTokenService.generateTokenPair(userId, role, userModel);

          const afterIssuance = Math.floor(Date.now() / 1000);

          // Decode the access token to inspect exp and iat claims
          const decoded = jwt.decode(tokenPair.accessToken) as {
            userId: string;
            role: string;
            iat: number;
            exp: number;
          };

          expect(decoded).not.toBeNull();
          expect(decoded.exp).toBeDefined();
          expect(decoded.iat).toBeDefined();

          // The token lifetime (exp - iat) must be at most 15 minutes
          const lifetime = decoded.exp - decoded.iat;
          expect(lifetime).toBeLessThanOrEqual(FIFTEEN_MINUTES_IN_SECONDS);
          expect(lifetime).toBeGreaterThan(0);

          // Additionally, exp should be within 15 minutes from when we issued it
          // (accounting for slight clock differences during test execution)
          expect(decoded.exp).toBeLessThanOrEqual(beforeIssuance + FIFTEEN_MINUTES_IN_SECONDS + 1);
          expect(decoded.iat).toBeGreaterThanOrEqual(beforeIssuance - 1);
          expect(decoded.iat).toBeLessThanOrEqual(afterIssuance + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('refresh token expiration is at most 7 days from issuance for any user/role', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        roleArb,
        async (userId: string, role: UserRole) => {
          const userModel = ROLE_TO_MODEL[role];
          const beforeIssuance = Date.now();

          await authTokenService.generateTokenPair(userId, role, userModel);

          const afterIssuance = Date.now();

          // Find the most recently created refresh token for this userId
          const refreshTokenDoc = await RefreshToken.findOne({ userId }).sort({ createdAt: -1 }).lean();

          expect(refreshTokenDoc).not.toBeNull();
          expect(refreshTokenDoc!.expiresAt).toBeDefined();

          // The refresh token's expiresAt must be at most 7 days from issuance
          const expiresAtMs = new Date(refreshTokenDoc!.expiresAt).getTime();

          // expiresAt should be at most 7 days from before issuance
          // (with a small tolerance for test execution time)
          expect(expiresAtMs).toBeLessThanOrEqual(beforeIssuance + SEVEN_DAYS_IN_MS + 1000);

          // expiresAt should be in the future (at least close to 7 days from now)
          expect(expiresAtMs).toBeGreaterThan(afterIssuance);

          // The difference between expiresAt and creation time should be at most 7 days
          const createdAtMs = new Date(refreshTokenDoc!.createdAt).getTime();
          const refreshLifetime = expiresAtMs - createdAtMs;
          expect(refreshLifetime).toBeLessThanOrEqual(SEVEN_DAYS_IN_MS + 1000);
          expect(refreshLifetime).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
