import type { Request, Response } from 'express';
import type { Document } from 'mongoose';

import { AppError } from '../middleware/errorHandler.js';
import { authTokenService } from '../services/authTokenService.js';
import { passwordService } from '../services/passwordService.js';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import type { UserModelType } from '../services/authTokenService.js';
import type { ModelName } from '../services/passwordService.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Parent from '../models/Parent.js';

/**
 * Map the request body userType to internal model naming conventions.
 */
type UserType = 'student' | 'teacher' | 'parent' | 'admin' | 'faculty';

interface LoginBody {
  email: string;
  password: string;
  userType?: UserType;
  role?: UserType;
}

interface RefreshBody {
  refreshToken: string;
}

/**
 * Common shape expected from any user document for auth purposes.
 */
interface AuthUser extends Document {
  email?: string;
  firstName: string;
  lastName: string;
  password: string;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

/**
 * Look up a user by email in the appropriate model.
 * Returns null if not found.
 */
async function findUserByEmail(email: string, userType: UserType): Promise<AuthUser | null> {
  switch (userType) {
    case 'student':
      return Student.findOne({ email, deletedAt: null }).select('+password') as unknown as AuthUser | null;
    case 'teacher':
    case 'faculty':
    case 'admin':
      return Faculty.findOne({ email, deletedAt: null }).select('+password') as unknown as AuthUser | null;
    case 'parent':
      return Parent.findOne({ email, deletedAt: null }).select('+password') as unknown as AuthUser | null;
    default:
      throw AppError.badRequest(`Invalid user type: ${userType}`);
  }
}

/**
 * Map request userType to the UserModelType used by AuthTokenService.
 */
function toUserModelType(userType: UserType): UserModelType {
  const mapping: Record<UserType, UserModelType> = {
    student: 'Student',
    teacher: 'Faculty',
    faculty: 'Faculty',
    admin: 'Faculty',
    parent: 'Parent',
  };
  return mapping[userType];
}

/**
 * Map request userType to the ModelName used by PasswordService.
 */
function toPasswordModelName(userType: UserType): ModelName {
  const mapping: Record<UserType, ModelName> = {
    student: 'Student',
    teacher: 'Faculty',
    faculty: 'Faculty',
    admin: 'Faculty',
    parent: 'Parent',
  };
  return mapping[userType];
}

/**
 * Auth controller handling login, refresh, and logout endpoints.
 */
export const authController = {
  /**
   * POST /api/v1/auth/login
   *
   * Accepts email + password + userType. Looks up user in the correct model,
   * verifies password, checks account lock, generates token pair.
   * Records failed attempts on bad password, resets on success.
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password, userType, role } = req.body as LoginBody;
    const resolvedUserType = (userType || role || 'student') as UserType;

    const modelName = toPasswordModelName(resolvedUserType);

    // Look up user by email (include password field which is select: false)
    const user = await findUserByEmail(email, resolvedUserType);

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const userId = user._id.toString();

    // Check if account is locked
    const locked = await passwordService.isAccountLocked(userId, modelName);
    if (locked) {
      throw AppError.unauthorized(
        'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
      );
    }

    // Verify password
    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      // Record failed attempt
      await passwordService.recordFailedAttempt(userId, modelName);
      throw AppError.unauthorized('Invalid email or password');
    }

    // Password is valid — reset failed attempts
    await passwordService.resetFailedAttempts(userId, modelName);

    // Generate token pair
    const userModelType = toUserModelType(resolvedUserType);
    const tokens = await authTokenService.generateTokenPair(userId, resolvedUserType, userModelType);

    res.status(200).json({
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: userId,
        email: user.email || email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: resolvedUserType,
      },
    });
  },

  /**
   * POST /api/v1/auth/refresh
   *
   * Accepts a refresh token in the body and returns a new token pair.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshBody;

    try {
      const tokens = await authTokenService.refreshTokens(refreshToken);

      res.status(200).json({
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid refresh token';

      if (message.includes('expired')) {
        throw AppError.unauthorized('Refresh token has expired');
      }

      if (message.includes('revoked') || message.includes('replay')) {
        throw AppError.unauthorized('Refresh token has been revoked');
      }

      throw AppError.unauthorized('Invalid refresh token');
    }
  },

  /**
   * POST /api/v1/auth/logout
   *
   * Requires authentication. Revokes all refresh tokens for the authenticated user.
   */
  async logout(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;

    await authTokenService.revokeTokenFamily(userId);

    res.status(200).json({
      data: {
        message: 'Successfully logged out',
      },
    });
  },
};
