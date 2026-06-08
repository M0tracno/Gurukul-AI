/**
 * Property-Based Test: Refresh Token Rotation Invalidation (Property 7)
 *
 * Feature: gurukul-ai-modernization, Property 7: Refresh Token Rotation Invalidation
 *
 * For any refresh token that is consumed to generate a new token pair,
 * the consumed token SHALL be marked as invalidated and SHALL NOT be
 * usable for generating another token pair.
 *
 * **Validates: Requirements 4.2**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { AuthTokenService } from '../../src/services/authTokenService.js';
import RefreshToken from '../../src/models/RefreshToken.js';
import type { UserRole } from '../../src/types/common.js';
import type { UserModelType } from '../../src/services/authTokenService.js';

let mongoServer: MongoMemoryServer;
let authTokenService: AuthTokenService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Set JWT_SECRET for token generation
  process.env.JWT_SECRET = 'test-secret-key-for-property-tests-minimum-length';

  authTokenService = new AuthTokenService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

afterEach(async () => {
  await RefreshToken.deleteMany({});
});

// Generator for user roles and their corresponding model types
const userModelArb = fc.constantFrom<UserModelType>('Student', 'Faculty', 'Parent', 'Admin');

const roleFromModel = (model: UserModelType): UserRole => {
  const mapping: Record<UserModelType, UserRole> = {
    Student: 'student',
    Faculty: 'teacher',
    Parent: 'parent',
    Admin: 'admin',
  };
  return mapping[model];
};

// Generator for a valid MongoDB ObjectId hex string (24 hex chars)
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
const objectIdArb = fc.array(hexChar, { minLength: 24, maxLength: 24 }).map(arr => arr.join(''));

describe('Property 7: Refresh Token Rotation Invalidation', () => {
  /**
   * Property: For any refresh token that is consumed to generate a new token pair,
   * the consumed token is marked as invalidated (revokedAt is set, replacedByTokenHash is set).
   */
  it('consumed refresh tokens are marked as invalidated after rotation', async () => {
    await fc.assert(
      fc.asyncProperty(objectIdArb, userModelArb, async (userIdHex, userModel) => {
        // Clean up from previous iteration
        await RefreshToken.deleteMany({});

        const userId = new mongoose.Types.ObjectId(userIdHex as string).toString();
        const role = roleFromModel(userModel);

        // Step 1: Generate an initial token pair
        const initialPair = await authTokenService.generateTokenPair(userId, role, userModel);

        // Step 2: Consume the refresh token to get a new pair (rotation)
        const rotatedPair = await authTokenService.refreshTokens(initialPair.refreshToken);

        // Step 3: Verify the original token is marked as invalidated in the DB
        const crypto = await import('node:crypto');
        const originalTokenHash = crypto.createHash('sha256')
          .update(initialPair.refreshToken)
          .digest('hex');

        const consumedTokenDoc = await RefreshToken.findOne({ tokenHash: originalTokenHash });

        // The consumed token MUST have revokedAt set (non-null)
        expect(consumedTokenDoc).not.toBeNull();
        expect(consumedTokenDoc!.revokedAt).toBeDefined();
        expect(consumedTokenDoc!.revokedAt).not.toBeNull();
        expect(consumedTokenDoc!.revokedAt).toBeInstanceOf(Date);

        // The consumed token MUST have replacedByTokenHash set
        expect(consumedTokenDoc!.replacedByTokenHash).toBeDefined();
        expect(consumedTokenDoc!.replacedByTokenHash).not.toBeNull();
        expect(typeof consumedTokenDoc!.replacedByTokenHash).toBe('string');
        expect(consumedTokenDoc!.replacedByTokenHash!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any refresh token that has been consumed, attempting to use it
   * again for generating another token pair SHALL fail.
   */
  it('consumed refresh tokens cannot be reused to generate another token pair', async () => {
    await fc.assert(
      fc.asyncProperty(objectIdArb, userModelArb, async (userIdHex, userModel) => {
        // Clean up from previous iteration
        await RefreshToken.deleteMany({});

        const userId = new mongoose.Types.ObjectId(userIdHex as string).toString();
        const role = roleFromModel(userModel);

        // Step 1: Generate an initial token pair
        const initialPair = await authTokenService.generateTokenPair(userId, role, userModel);

        // Step 2: Consume the refresh token (first use — should succeed)
        const rotatedPair = await authTokenService.refreshTokens(initialPair.refreshToken);
        expect(rotatedPair.accessToken).toBeDefined();
        expect(rotatedPair.refreshToken).toBeDefined();

        // Step 3: Attempt to reuse the consumed refresh token (should fail)
        await expect(
          authTokenService.refreshTokens(initialPair.refreshToken)
        ).rejects.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: After rotation, only the new refresh token can be used to generate
   * the next token pair — the consumed one is permanently invalidated.
   */
  it('after rotation, only the new refresh token is valid for subsequent rotation', async () => {
    await fc.assert(
      fc.asyncProperty(objectIdArb, userModelArb, async (userIdHex, userModel) => {
        // Clean up from previous iteration
        await RefreshToken.deleteMany({});

        const userId = new mongoose.Types.ObjectId(userIdHex as string).toString();
        const role = roleFromModel(userModel);

        // Step 1: Generate initial token pair
        const initialPair = await authTokenService.generateTokenPair(userId, role, userModel);

        // Step 2: First rotation — consume initial token
        const secondPair = await authTokenService.refreshTokens(initialPair.refreshToken);

        // Step 3: The new token from rotation should be usable
        const thirdPair = await authTokenService.refreshTokens(secondPair.refreshToken);
        expect(thirdPair.accessToken).toBeDefined();
        expect(thirdPair.refreshToken).toBeDefined();

        // Step 4: The original consumed token should still be unusable
        await expect(
          authTokenService.refreshTokens(initialPair.refreshToken)
        ).rejects.toThrow();

        // Step 5: The second token (now consumed) should also be unusable
        await expect(
          authTokenService.refreshTokens(secondPair.refreshToken)
        ).rejects.toThrow();
      }),
      { numRuns: 100 }
    );
  });
});
