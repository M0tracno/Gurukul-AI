import type { Request, Response } from 'express';
import type { Document } from 'mongoose';
import crypto from 'node:crypto';

import { AppError } from '../middleware/errorHandler.js';
import { success } from '../utils/envelope.js';
import { authTokenService } from '../services/authTokenService.js';
import { passwordService } from '../services/passwordService.js';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import type { UserModelType } from '../services/authTokenService.js';
import type { ModelName } from '../services/passwordService.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Parent from '../models/Parent.js';

/**
 * In-memory OTP storage with TTL.
 * Key: otpId, Value: { otp, phoneNumber, expiresAt }
 */
interface OtpEntry {
  otp: string;
  phoneNumber: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();

/** OTP validity duration: 5 minutes */
const OTP_TTL_MS = 5 * 60 * 1000;

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

    res.status(200).json(success({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: userId,
        email: user.email || email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: resolvedUserType,
      },
    }));
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

      res.status(200).json(success({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }));
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
   * GET /api/v1/auth/me
   *
   * Requires authentication. Returns the current user's profile based on JWT claims.
   * Looks up the correct model (Student/Faculty/Parent) based on the token's role.
   */
  async me(req: Request, res: Response): Promise<void> {
    const { userId, role } = (req as AuthenticatedRequest).user;

    let user: AuthUser | null = null;

    switch (role) {
      case 'student':
        user = await Student.findById(userId).select('-password') as unknown as AuthUser | null;
        break;
      case 'teacher':
      case 'faculty':
      case 'admin':
        user = await Faculty.findById(userId).select('-password') as unknown as AuthUser | null;
        break;
      case 'parent':
        user = await Parent.findById(userId).select('-password') as unknown as AuthUser | null;
        break;
      default:
        throw AppError.badRequest(`Invalid role: ${role}`);
    }

    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    res.status(200).json(success({
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role,
    }));
  },

  /**
   * POST /api/v1/auth/logout
   *
   * Requires authentication. Revokes all refresh tokens for the authenticated user.
   */
  async logout(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;

    await authTokenService.revokeTokenFamily(userId);

    res.status(200).json(success({ message: 'Successfully logged out' }));
  },

  /**
   * POST /api/v1/auth/register/student
   *
   * Creates a new student account. Validates required fields, checks for duplicate
   * email, and creates the document. The model's pre-save hook hashes the password.
   */
  async registerStudent(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName, studentId, grade } = req.body;

    // Check for existing email
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      throw AppError.badRequest('A user with this email already exists');
    }

    // Create student (model pre-save hook handles password hashing)
    const student = await Student.create({
      email,
      password,
      firstName,
      lastName,
      studentId,
      grade,
    });

    res.status(201).json(success({
      message: 'Registration successful',
      user: {
        id: student._id.toString(),
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        role: 'student',
      },
    }));
  },

  /**
   * POST /api/v1/auth/register/faculty
   *
   * Creates a new faculty account. Validates required fields, checks for duplicate
   * email, and creates the document. The model's pre-save hook hashes the password.
   */
  async registerFaculty(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName, employeeId, department } = req.body;

    // Check for existing email
    const existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      throw AppError.badRequest('A user with this email already exists');
    }

    // Create faculty (model pre-save hook handles password hashing)
    const faculty = await Faculty.create({
      email,
      password,
      firstName,
      lastName,
      employeeId,
      department,
    });

    res.status(201).json(success({
      message: 'Registration successful',
      user: {
        id: faculty._id.toString(),
        email: faculty.email,
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        role: 'faculty',
      },
    }));
  },

  /**
   * POST /api/auth/parent/login
   *
   * Parent-specific login. Forces userType to 'parent' and reuses existing login logic.
   */
  async parentLogin(req: Request, res: Response): Promise<void> {
    // Force the role/userType to 'parent' regardless of what was sent
    req.body.userType = 'parent';
    req.body.role = 'parent';

    // Reuse the standard login logic
    await authController.login(req, res);
  },

  /**
   * POST /api/auth/parent/send-otp
   *
   * Looks up a parent by phoneNumber, generates a 6-digit OTP,
   * stores it in-memory with a 5-min TTL, and returns the otpId.
   */
  async sendOtp(req: Request, res: Response): Promise<void> {
    const { phoneNumber } = req.body as { phoneNumber: string; studentId?: string };

    // Look up parent by phone number
    const parent = await Parent.findOne({ phoneNumber, deletedAt: null });

    if (!parent) {
      throw AppError.notFound('No parent found with this phone number');
    }

    // Generate 6-digit OTP and unique otpId
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpId = crypto.randomUUID();

    // Store OTP with 5-minute TTL
    otpStore.set(otpId, {
      otp,
      phoneNumber,
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    // In production, send the OTP via SMS here.
    // For development, log it (remove in production).
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`);
    }

    res.status(200).json(success({
      otpId,
      message: 'OTP sent successfully',
    }));
  },

  /**
   * POST /api/auth/parent/verify-otp
   *
   * Validates the OTP against the stored value. If valid, generates a token pair
   * for the parent and returns it along with parent info.
   */
  async verifyOtp(req: Request, res: Response): Promise<void> {
    const { phoneNumber, otp, otpId } = req.body as { phoneNumber: string; otp: string; otpId: string };

    // Look up stored OTP entry
    const entry = otpStore.get(otpId);

    if (!entry) {
      throw AppError.badRequest('Invalid or expired OTP');
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(otpId);
      throw AppError.badRequest('OTP has expired');
    }

    // Validate phone number matches
    if (entry.phoneNumber !== phoneNumber) {
      throw AppError.badRequest('Invalid or expired OTP');
    }

    // Validate OTP value
    if (entry.otp !== otp) {
      throw AppError.badRequest('Invalid or expired OTP');
    }

    // OTP is valid — remove it (single use)
    otpStore.delete(otpId);

    // Look up the parent
    const parent = await Parent.findOne({ phoneNumber, deletedAt: null });

    if (!parent) {
      throw AppError.notFound('Parent not found');
    }

    // Generate token pair
    const tokens = await authTokenService.generateTokenPair(
      parent._id.toString(),
      'parent',
      'Parent',
    );

    res.status(200).json(success({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      parent: {
        id: parent._id.toString(),
        firstName: parent.firstName,
        lastName: parent.lastName,
        phoneNumber: parent.phoneNumber,
        role: 'parent',
      },
    }));
  },
};
