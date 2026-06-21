import type { Model } from 'mongoose';

import Student from '../models/Student.js';
import type { IStudent } from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import type { IFaculty } from '../models/Faculty.js';
import { AppError } from '../middleware/errorHandler.js';
import { credentialService } from './credentialService.js';

/** Minimum length for a setup-link-supplied password (matches admin policy, Requirement 8.1/8.6). */
const MIN_SETUP_PASSWORD_LENGTH = 8;

/** The account type a consumed setup token resolved to. */
export type SetupTokenResource = 'Student' | 'Faculty';

/** Result of successfully consuming a setup token. */
export interface ConsumeSetupTokenResult {
  resource: SetupTokenResource;
  accountId: string;
}

/**
 * An account record that carries the setup-token fields and a password. Both
 * `Student` and `Faculty` satisfy this shape, which lets the consumption logic
 * treat them uniformly. `setupTokenHash` and `password` are `select:false`, so
 * callers must explicitly select them.
 */
interface SetupTokenBearer {
  password: string;
  setupTokenHash?: string;
  setupTokenExpiresAt?: Date;
  setupTokenUsedAt?: Date;
  _id: unknown;
  save(): Promise<unknown>;
}

export interface IAccountSetupService {
  /**
   * Consume a presented setup token to set the account's initial password.
   * Resolves with the account it applied to, or rejects with HTTP 400 when the
   * token is invalid, expired, or already used (leaving the password unchanged).
   */
  consumeSetupToken(
    rawToken: string,
    newPassword: string,
  ): Promise<ConsumeSetupTokenResult>;
}

/**
 * Owns consumption of single-use account-setup tokens (Requirement 8.6).
 *
 * A setup token (delivered via the `setup_link` credential-delivery method) is
 * valid for consumption *if and only if* all three hold:
 *   1. `sha256(rawToken)` matches the stored `setupTokenHash`,
 *   2. `setupTokenExpiresAt` is strictly in the future (not expired), and
 *   3. `setupTokenUsedAt` is unset (not already consumed).
 *
 * The token alone does not say which model it belongs to, so this service
 * searches both `Student` and `Faculty` for the matching hash. On success it
 * assigns the new plaintext password (the model pre-save hook bcrypt-hashes it)
 * and stamps `setupTokenUsedAt` to enforce single use. Any invalid/expired/used
 * token is rejected with `AppError.badRequest` (HTTP 400) and the stored
 * password is left untouched.
 */
export class AccountSetupService implements IAccountSetupService {
  async consumeSetupToken(
    rawToken: string,
    newPassword: string,
  ): Promise<ConsumeSetupTokenResult> {
    // Enforce the password policy before touching any record so an invalid
    // password never results in a partial mutation.
    if (
      typeof newPassword !== 'string' ||
      newPassword.length < MIN_SETUP_PASSWORD_LENGTH
    ) {
      throw AppError.badRequest(
        `Password must be at least ${MIN_SETUP_PASSWORD_LENGTH} characters long`,
      );
    }

    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw this.invalidTokenError();
    }

    const tokenHash = credentialService.hashSetupToken(rawToken);

    // The token does not identify the model, so look in both. `setupTokenHash`
    // and `password` are select:false and must be explicitly selected.
    const account =
      (await this.findByTokenHash<IStudent>(Student, tokenHash)) ??
      (await this.findByTokenHash<IFaculty>(Faculty, tokenHash));

    if (!account) {
      throw this.invalidTokenError();
    }

    const resource: SetupTokenResource =
      (account as unknown as { constructor: { modelName?: string } }).constructor
        .modelName === 'Faculty'
        ? 'Faculty'
        : 'Student';

    if (!this.isTokenConsumable(account, new Date())) {
      // Reject without changing the stored password (Requirement 8.6).
      throw this.invalidTokenError();
    }

    // Valid token: assign the plaintext password (the model pre-save bcrypt hook
    // hashes it) and stamp consumption so the token cannot be reused.
    account.password = newPassword;
    account.setupTokenUsedAt = new Date();
    await account.save();

    return { resource, accountId: String(account._id) };
  }

  /**
   * Whether a presented token may still be consumed: it must have a stored hash
   * and expiry, must not be expired, and must not already be used. (Hash match
   * is established by the lookup query before this is called.)
   */
  private isTokenConsumable(account: SetupTokenBearer, now: Date): boolean {
    if (!account.setupTokenHash || !account.setupTokenExpiresAt) {
      return false;
    }
    const notExpired = account.setupTokenExpiresAt.getTime() > now.getTime();
    const notUsed = !account.setupTokenUsedAt;
    return notExpired && notUsed;
  }

  /** Find an account by its stored setup-token hash, selecting hidden fields. */
  private async findByTokenHash<T extends SetupTokenBearer>(
    model: Model<T>,
    tokenHash: string,
  ): Promise<T | null> {
    return model
      .findOne({ setupTokenHash: tokenHash } as Record<string, unknown>)
      .select('+setupTokenHash +password')
      .exec() as Promise<T | null>;
  }

  /** A uniform 400 used for every invalid/expired/used/mismatched token case. */
  private invalidTokenError(): AppError {
    return AppError.badRequest(
      'Setup link is invalid, expired, or already used',
    );
  }
}

// Export a singleton instance for convenience.
export const accountSetupService = new AccountSetupService();
