import type { Request, Response } from 'express';
import type { Document } from 'mongoose';

import { AppError } from '../middleware/errorHandler.js';
import { success, failure } from '../utils/envelope.js';
import { authTokenService } from '../services/authTokenService.js';
import { passwordService } from '../services/passwordService.js';
import { otpService } from '../services/otpService.js';
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
  active?: boolean;
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

    // Enforce the account `active` flag (Requirement 7.3, 7.4).
    // A deactivated account must not be able to authenticate. Use the standard
    // invalid-credentials message so account existence is not revealed, while
    // surfacing a machine-readable ACCOUNT_INACTIVE code for clients that need it.
    if (user.active === false) {
      throw new AppError(401, 'ACCOUNT_INACTIVE', 'Invalid email or password');
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
   * POST /api/auth/parent/otp/request
   *
   * Initiates the verified parent OTP login flow. Delegates entirely to
   * `otpService.request`, which matches the submitted `(studentId, phoneNumber)`
   * pair against an active `ParentStudentRelation`, and — only on a match —
   * creates a hashed, single-use, time-limited challenge and dispatches the OTP
   * via the SMS service.
   *
   * Anti-enumeration (Req 4.3, 4.4): the non-throttled path ALWAYS returns the
   * same generic acknowledgement body and HTTP 200, whether or not the pair
   * matched, so the response never reveals whether the student, phone, or
   * linkage exists. The only divergent path is the resend throttle (Req 6.5),
   * which is reachable only after a successful match and returns HTTP 429 with
   * a body that reuses the same generic wording.
   */
  async parentOtpRequest(req: Request, res: Response): Promise<void> {
    const { studentId, phoneNumber } = req.body as { studentId: string; phoneNumber: string };

    const result = await otpService.request(studentId, phoneNumber, {
      ip: req.ip ?? 'unknown',
      correlationId: req.correlationId,
    });

    if (result.throttled) {
      // Resend requested inside the minimum interval (Req 6.5). Reuse the
      // generic acknowledgement wording so no extra information is leaked.
      res.status(429).json(failure(result.acknowledgement.message));
      return;
    }

    res.status(200).json(result.acknowledgement);
  },

  /**
   * POST /api/auth/parent/otp/verify
   *
   * Completes the parent OTP login flow. Delegates to `otpService.verify`,
   * which validates the submitted code against the active challenge, enforces
   * expiry/attempt/single-use rules, and — on success — issues a parent token
   * pair. Every failure path raises an `AppError` (401) that propagates to the
   * global error handler with a constant body (Req 6.2).
   */
  async parentOtpVerify(req: Request, res: Response): Promise<void> {
    const { challengeId, otp } = req.body as { challengeId: string; otp: string };

    const tokens = await otpService.verify(challengeId, otp, {
      ip: req.ip ?? 'unknown',
      correlationId: req.correlationId,
    });

    res.status(200).json(success({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      role: 'parent',
    }));
  },
};
