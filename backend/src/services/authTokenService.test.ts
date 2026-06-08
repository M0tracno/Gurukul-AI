import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { AuthTokenService } from './authTokenService.js';
import RefreshToken from '../models/RefreshToken.js';
import type { UserRole } from '../types/common.js';
import type { UserModelType } from './authTokenService.js';

let mongoServer: MongoMemoryServer;
let service: AuthTokenService;

const TEST_JWT_SECRET = 'test-secret-key-for-unit-tests';

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
});

describe('AuthTokenService', () => {
  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'student';
      const userModel: UserModelType = 'Student';

      const result = await service.generateTokenPair(userId, role, userModel);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should produce a valid JWT access token with correct payload', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'teacher';
      const userModel: UserModelType = 'Faculty';

      const result = await service.generateTokenPair(userId, role, userModel);
      const decoded = jwt.verify(result.accessToken, TEST_JWT_SECRET) as { userId: string; role: string; exp: number; iat: number };

      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe('teacher');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should create access token with 15-minute expiry', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'admin';
      const userModel: UserModelType = 'Admin';

      const result = await service.generateTokenPair(userId, role, userModel);
      const decoded = jwt.verify(result.accessToken, TEST_JWT_SECRET) as { exp: number; iat: number };

      const lifetimeSeconds = decoded.exp - decoded.iat;
      expect(lifetimeSeconds).toBe(15 * 60); // 15 minutes
    });

    it('should store refresh token hash in database with 7-day expiry', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'parent';
      const userModel: UserModelType = 'Parent';

      await service.generateTokenPair(userId, role, userModel);

      const stored = await RefreshToken.findOne({ userId });
      expect(stored).not.toBeNull();
      expect(stored!.tokenHash).toBeDefined();
      expect(stored!.familyId).toBeDefined();
      expect(stored!.revokedAt).toBeNull();
      expect(stored!.replacedByTokenHash).toBeNull();

      // Check expiry is approximately 7 days from now
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const diff = stored!.expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(sevenDaysMs - 5000); // within 5 seconds
      expect(diff).toBeLessThanOrEqual(sevenDaysMs);
    });

    it('should store SHA-256 hash, not the raw token', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'student';
      const userModel: UserModelType = 'Student';

      const result = await service.generateTokenPair(userId, role, userModel);

      const stored = await RefreshToken.findOne({ userId });
      // The stored hash should NOT be the raw refresh token value
      expect(stored!.tokenHash).not.toBe(result.refreshToken);
      // The hash should be 64 hex chars (SHA-256)
      expect(stored!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('refreshTokens', () => {
    it('should issue a new token pair when given a valid refresh token', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'student';
      const userModel: UserModelType = 'Student';

      const original = await service.generateTokenPair(userId, role, userModel);
      const refreshed = await service.refreshTokens(original.refreshToken);

      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.refreshToken).toBeDefined();
      // Refresh token should always differ (random bytes)
      expect(refreshed.refreshToken).not.toBe(original.refreshToken);
      // Access token is a valid JWT
      const decoded = jwt.verify(refreshed.accessToken, TEST_JWT_SECRET) as { userId: string; role: string };
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe(role);
    });

    it('should mark the old token as revoked and link to the new one', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'teacher';
      const userModel: UserModelType = 'Faculty';

      const original = await service.generateTokenPair(userId, role, userModel);
      await service.refreshTokens(original.refreshToken);

      const tokens = await RefreshToken.find({ userId }).sort({ createdAt: 1 });
      expect(tokens).toHaveLength(2);

      // First token should be revoked with replacedByTokenHash
      expect(tokens[0].revokedAt).not.toBeNull();
      expect(tokens[0].replacedByTokenHash).toBe(tokens[1].tokenHash);

      // Second token should be active
      expect(tokens[1].revokedAt).toBeNull();
    });

    it('should preserve the familyId across rotations', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'student';
      const userModel: UserModelType = 'Student';

      const original = await service.generateTokenPair(userId, role, userModel);
      const refreshed = await service.refreshTokens(original.refreshToken);
      await service.refreshTokens(refreshed.refreshToken);

      const tokens = await RefreshToken.find({ userId });
      const familyIds = new Set(tokens.map(t => t.familyId));
      expect(familyIds.size).toBe(1); // All in same family
    });

    it('should reject an already-consumed (revoked) refresh token and revoke entire family', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'student';
      const userModel: UserModelType = 'Student';

      const original = await service.generateTokenPair(userId, role, userModel);
      // First refresh: valid
      await service.refreshTokens(original.refreshToken);

      // Second refresh with same token: replay detected
      await expect(service.refreshTokens(original.refreshToken))
        .rejects.toThrow(/revoked/i);

      // All tokens in the family should be revoked
      const tokens = await RefreshToken.find({ userId });
      for (const token of tokens) {
        expect(token.revokedAt).not.toBeNull();
      }
    });

    it('should reject an invalid (non-existent) refresh token', async () => {
      await expect(service.refreshTokens('totally-fake-token'))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should reject an expired refresh token', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const userModel: UserModelType = 'Student';

      // Directly create an expired token in the DB
      const crypto = await import('node:crypto');
      const rawToken = crypto.randomBytes(64).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await RefreshToken.create({
        userId,
        userModel,
        tokenHash,
        familyId: crypto.randomUUID(),
        expiresAt: new Date(Date.now() - 1000), // already expired
      });

      await expect(service.refreshTokens(rawToken))
        .rejects.toThrow('Refresh token has expired');
    });
  });

  describe('revokeTokenFamily', () => {
    it('should revoke all active tokens for a user', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'student';
      const userModel: UserModelType = 'Student';

      // Generate multiple token pairs (different families)
      await service.generateTokenPair(userId, role, userModel);
      await service.generateTokenPair(userId, role, userModel);

      await service.revokeTokenFamily(userId);

      const tokens = await RefreshToken.find({ userId });
      for (const token of tokens) {
        expect(token.revokedAt).not.toBeNull();
      }
    });

    it('should not affect tokens of other users', async () => {
      const userId1 = new mongoose.Types.ObjectId().toString();
      const userId2 = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'student';
      const userModel: UserModelType = 'Student';

      await service.generateTokenPair(userId1, role, userModel);
      await service.generateTokenPair(userId2, role, userModel);

      await service.revokeTokenFamily(userId1);

      const user2Tokens = await RefreshToken.find({ userId: userId2 });
      for (const token of user2Tokens) {
        expect(token.revokedAt).toBeNull();
      }
    });
  });

  describe('validateAccessToken', () => {
    it('should return decoded payload for a valid token', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const role: UserRole = 'teacher';
      const userModel: UserModelType = 'Faculty';

      const { accessToken } = await service.generateTokenPair(userId, role, userModel);
      const decoded = await service.validateAccessToken(accessToken);

      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe('teacher');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should reject an expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test', role: 'student' },
        TEST_JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a tick to ensure expiry
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(service.validateAccessToken(expiredToken))
        .rejects.toThrow('Access token has expired');
    });

    it('should reject a token with invalid signature', async () => {
      const badToken = jwt.sign(
        { userId: 'test', role: 'student' },
        'wrong-secret',
        { expiresIn: '15m' }
      );

      await expect(service.validateAccessToken(badToken))
        .rejects.toThrow('Invalid access token');
    });

    it('should reject a malformed token', async () => {
      await expect(service.validateAccessToken('not.a.real.token'))
        .rejects.toThrow('Invalid access token');
    });
  });
});
