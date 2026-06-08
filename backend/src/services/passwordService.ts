import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Parent from '../models/Parent.js';
import type { IStudent } from '../models/Student.js';
import type { IFaculty } from '../models/Faculty.js';
import type { IParent } from '../models/Parent.js';

const BCRYPT_COST_FACTOR = 12;
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export type ModelName = 'Student' | 'Faculty' | 'Parent';

export interface IPasswordService {
  hashPassword(plaintext: string): Promise<string>;
  comparePassword(plaintext: string, hash: string): Promise<boolean>;
  recordFailedAttempt(
    userId: string,
    modelName: ModelName
  ): Promise<{ locked: boolean; attemptsRemaining: number }>;
  resetFailedAttempts(userId: string, modelName: ModelName): Promise<void>;
  isAccountLocked(userId: string, modelName: ModelName): Promise<boolean>;
}

/**
 * Resolve the Mongoose model for a given model name.
 */
function getModel(modelName: ModelName): Model<IStudent | IFaculty | IParent> {
  switch (modelName) {
    case 'Student':
      return Student as unknown as Model<IStudent | IFaculty | IParent>;
    case 'Faculty':
      return Faculty as unknown as Model<IStudent | IFaculty | IParent>;
    case 'Parent':
      return Parent as unknown as Model<IStudent | IFaculty | IParent>;
    default:
      throw new Error(`Unknown model name: ${modelName}`);
  }
}

/**
 * Send email notification when an account is locked.
 * Uses the legacy email service if available, otherwise logs.
 */
async function sendAccountLockedEmail(
  email: string,
  name: string
): Promise<void> {
  try {
    // Attempt to use the legacy email service (CJS module)
    const emailServicePath = '../../services/emailService.js';
    const emailModule = (await import(
      /* @vite-ignore */ emailServicePath
    )) as Record<string, unknown>;
    const service = (emailModule.default || emailModule) as {
      transporter?: { sendMail: (options: Record<string, unknown>) => Promise<unknown> };
    };

    if (service && typeof service.transporter?.sendMail === 'function') {
      await service.transporter.sendMail({
        from: {
          name: 'GDC Academic System',
          address: process.env.EMAIL_FROM || 'noreply@gdc-system.com',
        },
        to: email,
        subject: 'Account Locked — GDC Academic System',
        html: `
          <h2>Account Locked</h2>
          <p>Hello ${name},</p>
          <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
          <p>The account will be automatically unlocked after 15 minutes. If you did not attempt to log in, please contact the system administrator immediately.</p>
          <p>— GDC Academic System</p>
        `,
        text: `Hello ${name},\n\nYour account has been temporarily locked due to multiple failed login attempts.\nThe account will be automatically unlocked after 15 minutes.\nIf you did not attempt to log in, please contact the system administrator immediately.\n\n— GDC Academic System`,
      });
    } else {
      console.warn(
        `[PasswordService] Account locked notification for ${email} — email service not available`
      );
    }
  } catch {
    // Email sending is best-effort; log and continue
    console.warn(
      `[PasswordService] Failed to send account lock email to ${email}`
    );
  }
}

export class PasswordService implements IPasswordService {
  /**
   * Hash a plaintext password using bcrypt with cost factor 12.
   */
  async hashPassword(plaintext: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_COST_FACTOR);
    return bcrypt.hash(plaintext, salt);
  }

  /**
   * Compare a plaintext password against a bcrypt hash.
   */
  async comparePassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Record a failed login attempt for a user.
   * If the user reaches 5 failed attempts within 10 minutes, lock the account for 15 minutes.
   * Returns the lock status and remaining attempts.
   */
  async recordFailedAttempt(
    userId: string,
    modelName: ModelName
  ): Promise<{ locked: boolean; attemptsRemaining: number }> {
    const UserModel = getModel(modelName);

    const user = await UserModel.findById(userId).select(
      '+failedLoginAttempts +lockedUntil +email +firstName +lastName'
    );

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // If account is currently locked, return locked status
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { locked: true, attemptsRemaining: 0 };
    }

    // If the lockout window has expired, reset the counter
    if (
      user.lockedUntil &&
      user.lockedUntil <= new Date()
    ) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
    }

    // Check if the failed attempts window has expired (10 minutes since first failure)
    // We track this by checking if failedLoginAttempts > 0 and updatedAt is old
    // Since we don't have a separate "first failed at" timestamp, we reset if
    // the last update was more than 10 minutes ago and no lock is set
    const updatedAt = (user as unknown as { updatedAt?: Date }).updatedAt;
    if (
      user.failedLoginAttempts > 0 &&
      updatedAt &&
      Date.now() - updatedAt.getTime() > FAILED_ATTEMPT_WINDOW_MS
    ) {
      user.failedLoginAttempts = 0;
    }

    // Increment failed attempts
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Check if threshold reached
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);

      await user.save();

      // Send notification email (best-effort, non-blocking)
      const email =
        (user as unknown as { email?: string }).email || '';
      const firstName =
        (user as unknown as { firstName?: string }).firstName || '';
      const lastName =
        (user as unknown as { lastName?: string }).lastName || '';
      const name = `${firstName} ${lastName}`.trim() || 'User';

      if (email) {
        // Fire and forget — don't await to avoid blocking the login flow
        sendAccountLockedEmail(email, name).catch(() => {
          // Already logged inside sendAccountLockedEmail
        });
      }

      return { locked: true, attemptsRemaining: 0 };
    }

    await user.save();

    return {
      locked: false,
      attemptsRemaining: MAX_FAILED_ATTEMPTS - user.failedLoginAttempts,
    };
  }

  /**
   * Reset failed login attempts after a successful login.
   */
  async resetFailedAttempts(
    userId: string,
    modelName: ModelName
  ): Promise<void> {
    const UserModel = getModel(modelName);

    await UserModel.findByIdAndUpdate(userId, {
      $set: { failedLoginAttempts: 0 },
      $unset: { lockedUntil: 1 },
    });
  }

  /**
   * Check if an account is currently locked.
   * Returns true if lockedUntil is set and is in the future.
   */
  async isAccountLocked(
    userId: string,
    modelName: ModelName
  ): Promise<boolean> {
    const UserModel = getModel(modelName);

    const user = await UserModel.findById(userId)
      .select('lockedUntil')
      .lean();

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.lockedUntil) {
      return false;
    }

    return new Date(user.lockedUntil) > new Date();
  }
}

// Export a singleton instance for convenience
export const passwordService = new PasswordService();
