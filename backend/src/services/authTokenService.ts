import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken.js';
import AuditLog from '../models/AuditLog.js';
import type { UserRole } from '../types/common.js';

export type UserModelType = 'Student' | 'Faculty' | 'Parent' | 'Admin';

export interface TokenPair {
  accessToken: string;   // 15 min expiry
  refreshToken: string;  // 7 day expiry, raw token (hash stored in DB)
}

export interface DecodedToken {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface IAuthTokenService {
  generateTokenPair(userId: string, role: UserRole, userModel: UserModelType): Promise<TokenPair>;
  refreshTokens(refreshToken: string): Promise<TokenPair>;
  revokeTokenFamily(userId: string): Promise<void>;
  validateAccessToken(token: string): Promise<DecodedToken>;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshTokenValue(): string {
  return crypto.randomBytes(64).toString('hex');
}

function generateFamilyId(): string {
  return crypto.randomUUID();
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export class AuthTokenService implements IAuthTokenService {
  /**
   * Generate a new access/refresh token pair for a user.
   * Stores the refresh token hash in the database with a new family ID.
   */
  async generateTokenPair(userId: string, role: UserRole, userModel: UserModelType): Promise<TokenPair> {
    const secret = getJwtSecret();

    // Generate access token (JWT)
    const accessToken = jwt.sign(
      { userId, role },
      secret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (random bytes)
    const refreshTokenValue = generateRefreshTokenValue();
    const tokenHash = hashToken(refreshTokenValue);
    const familyId = generateFamilyId();

    // Store refresh token hash in database
    await RefreshToken.create({
      userId,
      userModel,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  /**
   * Consume a refresh token and issue a new token pair.
   * Implements token rotation: marks the old token as revoked and links to the new one.
   * If an already-consumed token is presented, the entire family is revoked.
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);

    // Find the refresh token in the database
    const existingToken = await RefreshToken.findOne({ tokenHash });

    if (!existingToken) {
      throw new Error('Invalid refresh token');
    }

    // Check if token has expired
    if (existingToken.expiresAt < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Check if token was already revoked (replay detection)
    if (existingToken.revokedAt) {
      // Replay detected — revoke entire token family
      await RefreshToken.updateMany(
        { userId: existingToken.userId, familyId: existingToken.familyId },
        { $set: { revokedAt: new Date() } }
      );

      // Log security event to AuditLog
      const role = userModelToRole(existingToken.userModel);
      await AuditLog.create({
        timestamp: new Date(),
        actor: {
          userId: existingToken.userId,
          role,
          ip: '0.0.0.0', // Will be overridden by controller layer when called with context
        },
        action: 'failed_auth',
        target: {
          resource: 'RefreshToken',
          resourceId: existingToken.familyId,
        },
        correlationId: crypto.randomUUID(),
        metadata: { reason: 'token_replay_detected', familyId: existingToken.familyId },
      });

      throw new Error('Refresh token has been revoked — possible token replay detected');
    }

    const secret = getJwtSecret();

    // Decode the user info from the existing token record
    const userId = existingToken.userId.toString();
    const userModel = existingToken.userModel;

    // We need the role to put in the access token. Derive it from userModel.
    const role = userModelToRole(userModel);

    // Generate new token pair
    const accessToken = jwt.sign(
      { userId, role },
      secret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshTokenValue = generateRefreshTokenValue();
    const newTokenHash = hashToken(newRefreshTokenValue);

    // Create the new refresh token with the same familyId
    await RefreshToken.create({
      userId: existingToken.userId,
      userModel,
      tokenHash: newTokenHash,
      familyId: existingToken.familyId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    });

    // Mark the old token as consumed (revoked) and link to the new one
    existingToken.revokedAt = new Date();
    existingToken.replacedByTokenHash = newTokenHash;
    await existingToken.save();

    return {
      accessToken,
      refreshToken: newRefreshTokenValue,
    };
  }

  /**
   * Revoke ALL refresh tokens for a user (all families).
   * Used for forced logout / password change scenarios.
   */
  async revokeTokenFamily(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  /**
   * Validate a JWT access token and return the decoded payload.
   */
  async validateAccessToken(token: string): Promise<DecodedToken> {
    const secret = getJwtSecret();

    try {
      const decoded = jwt.verify(token, secret) as DecodedToken;
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw err;
    }
  }
}

/**
 * Map userModel string to UserRole for access token payload.
 */
function userModelToRole(userModel: string): UserRole {
  const mapping: Record<string, UserRole> = {
    Student: 'student',
    Faculty: 'teacher',
    Parent: 'parent',
    Admin: 'admin',
  };
  const role = mapping[userModel];
  if (!role) {
    throw new Error(`Unknown user model: ${userModel}`);
  }
  return role;
}

// Export a singleton instance for convenience
export const authTokenService = new AuthTokenService();
