/**
 * Property 8: Token Family Revocation on Replay
 *
 * For any refresh token that has already been consumed (invalidated), if it is presented
 * again for refresh, the Auth_System SHALL revoke all tokens in that token's family,
 * requiring full re-authentication.
 *
 * Feature: gurukul-ai-modernization, Property 8: Token Family Revocation on Replay
 *
 * **Validates: Requirements 4.8**
 */

import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';
import { AuthTokenService } from '../../src/services/authTokenService.js';
import RefreshToken from '../../src/models/RefreshToken.js';
import AuditLog from '../../src/models/AuditLog.js';
import type { UserRole } from '../../src/types/common.js';
import type { UserModelType } from '../../src/services/authTokenService.js';

let mongoServer: MongoMemoryServer;
let service: AuthTokenService;

const TEST_JWT_SECRET = 'test-secret-key-for-pbt-token-family-revocation';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  service = new AuthTokenService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

afterEach(async () => {
  await RefreshToken.deleteMany({});
  await AuditLog.deleteMany({});
});

/**
 * Arbitrary for generating user roles and their corresponding user model types.
 */
const userRoleArb: fc.Arbitrary<{ role: UserRole; userModel: UserModelType }> = fc.constantFrom(
  { role: 'student' as UserRole, userModel: 'Student' as UserModelType },
  { role: 'teacher' as UserRole, userModel: 'Faculty' as UserModelType },
  { role: 'parent' as UserRole, userModel: 'Parent' as UserModelType },
  { role: 'admin' as UserRole, userModel: 'Admin' as UserModelType }
);

/**
 * Arbitrary for generating random user IDs (valid MongoDB ObjectId strings).
 */
const userIdArb: fc.Arbitrary<string> = fc.constant(null).map(() => new mongoose.Types.ObjectId().toString());

/**
 * Arbitrary for generating the number of token rotations to perform before the replay.
 * After rotating N times, we replay one of the consumed tokens.
 * Range [1, 5] keeps the test fast while covering chains of varying length.
 */
const rotationCountArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 5 });

describe('Property 8: Token Family Revocation on Replay', () => {
  it('should revoke ALL tokens in the family when an already-consumed refresh token is replayed', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userRoleArb,
        rotationCountArb,
        async (userId, { role, userModel }, rotationCount) => {
          // Clean state for each run
          await RefreshToken.deleteMany({});
          await AuditLog.deleteMany({});

          // Step 1: Generate initial token pair (creates a new family)
          const initial = await service.generateTokenPair(userId, role, userModel);
          const consumedTokens: string[] = [initial.refreshToken];

          // Step 2: Perform N rotations, building up the family chain
          let currentRefreshToken = initial.refreshToken;
          for (let i = 0; i < rotationCount; i++) {
            const rotated = await service.refreshTokens(currentRefreshToken);
            consumedTokens.push(currentRefreshToken); // track consumed ones
            currentRefreshToken = rotated.refreshToken;
          }

          // At this point:
          // - consumedTokens[0..rotationCount-1] are consumed (revoked) tokens
          // - currentRefreshToken is the only active token in the family

          // Step 3: Replay an already-consumed token (pick the first consumed one)
          const replayedToken = consumedTokens[0];

          // The replay should throw an error
          await expect(service.refreshTokens(replayedToken))
            .rejects.toThrow(/revoked/i);

          // Step 4: Verify ALL tokens in the family are now revoked
          const allTokens = await RefreshToken.find({ userId });
          expect(allTokens.length).toBeGreaterThan(0);

          for (const token of allTokens) {
            expect(token.revokedAt).not.toBeNull();
          }

          // Step 5: The current (previously active) token should also be revoked
          // Try to use it — it should fail
          await expect(service.refreshTokens(currentRefreshToken))
            .rejects.toThrow(/revoked/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log a security audit event when replay is detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userRoleArb,
        async (userId, { role, userModel }) => {
          // Clean state for each run
          await RefreshToken.deleteMany({});
          await AuditLog.deleteMany({});

          // Generate initial token pair and rotate once
          const initial = await service.generateTokenPair(userId, role, userModel);
          await service.refreshTokens(initial.refreshToken);

          // Replay the consumed token
          await expect(service.refreshTokens(initial.refreshToken))
            .rejects.toThrow(/revoked/i);

          // Verify an audit log entry was created for this security event
          const auditEntries = await AuditLog.find({ 'actor.userId': userId });
          expect(auditEntries.length).toBeGreaterThanOrEqual(1);

          // Find the replay-detection audit entry
          const replayEntry = auditEntries.find(
            (entry) => entry.action === 'failed_auth' &&
              entry.metadata &&
              (entry.metadata as Record<string, unknown>).reason === 'token_replay_detected'
          );
          expect(replayEntry).toBeDefined();
          expect(replayEntry!.target.resource).toBe('RefreshToken');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should NOT revoke tokens from other families when replay is detected in one family', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userRoleArb,
        async (userId, { role, userModel }) => {
          // Clean state for each run
          await RefreshToken.deleteMany({});
          await AuditLog.deleteMany({});

          // Create two separate token families for the same user
          const family1 = await service.generateTokenPair(userId, role, userModel);
          const family2 = await service.generateTokenPair(userId, role, userModel);

          // Rotate family1 once (consume the initial token)
          await service.refreshTokens(family1.refreshToken);

          // Replay the consumed token from family1
          await expect(service.refreshTokens(family1.refreshToken))
            .rejects.toThrow(/revoked/i);

          // Find the familyId of family1 by hashing the original refresh token
          const family1TokenHash = crypto.createHash('sha256').update(family1.refreshToken).digest('hex');

          const allTokens = await RefreshToken.find({ userId }).lean();
          const family1Token = allTokens.find(t => t.tokenHash === family1TokenHash);
          const family1FamilyId = family1Token?.familyId;

          // All tokens NOT in family1 should still have their original revocation state
          const otherFamilyTokens = allTokens.filter(t => t.familyId !== family1FamilyId);

          // Family2 tokens should still be active (not revoked by family1's replay)
          for (const token of otherFamilyTokens) {
            // Family2 was never rotated, so its token should still be active
            expect(token.revokedAt).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
