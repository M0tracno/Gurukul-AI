import crypto from 'node:crypto';

import { AppError } from '../middleware/errorHandler.js';

/**
 * The mechanism chosen per account-creation/reset request for establishing
 * initial credentials.
 *  - `admin_set`          → Admin supplies the password (>= 8 chars).
 *  - `temporary_password` → System generates a random password (>= 12 chars),
 *                           returned in plaintext exactly once.
 *  - `setup_link`         → System emails a single-use, time-limited link;
 *                           only the hashed token is persisted.
 */
export type CredentialDeliveryMethod =
  | 'admin_set'
  | 'temporary_password'
  | 'setup_link';

export interface CredentialResult {
  /** bcrypt-ready plaintext to assign to the model (model hook hashes it). */
  passwordToPersist?: string;
  /** plaintext temp password to return to caller exactly once; never logged. */
  temporaryPasswordForResponse?: string;
  /** raw setup token to embed in the emailed link; only the hash is stored. */
  setupTokenRaw?: string;
  /** sha256 of the raw setup token — the only token value persisted. */
  setupTokenHash?: string;
  /** absolute expiry (now + 24h) for the setup token. */
  setupTokenExpiresAt?: Date;
}

export interface ICredentialService {
  /** Build credentials for account creation or reset per the chosen method. */
  prepareCredential(
    method: CredentialDeliveryMethod,
    adminProvidedPassword?: string,
  ): CredentialResult;

  /** Generate a >=12 char random password (crypto-strong). */
  generateTemporaryPassword(): string;

  /** Generate { raw, hash, expiresAt(24h) } for a single-use setup link. */
  generateSetupToken(): { raw: string; hash: string; expiresAt: Date };

  /** Hash a raw setup token for comparison (sha256, matching token-hash convention). */
  hashSetupToken(raw: string): string;

  /** Validate an admin-supplied password meets the >=8 char policy. */
  validateAdminPassword(password: string): void; // throws AppError.badRequest on failure
}

/** Minimum length for an admin-supplied password (Requirement 8.1). */
const MIN_ADMIN_PASSWORD_LENGTH = 8;

/** Minimum length for a system-generated temporary password (Requirement 8.2). */
const MIN_TEMPORARY_PASSWORD_LENGTH = 12;

/** Default temporary-password length — comfortably above the minimum. */
const TEMPORARY_PASSWORD_LENGTH = 16;

/** Setup-token expiry window (Requirement 8.3 / 9.2): 24 hours. */
const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Number of random bytes backing a raw setup token. */
const SETUP_TOKEN_BYTES = 32;

/**
 * Mixed alphabet for temporary passwords: uppercase, lowercase, digits, and a
 * curated set of symbols. Ambiguous characters are intentionally retained for
 * entropy; the password is delivered once and changed by the holder.
 */
const PASSWORD_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz' +
  '0123456789' +
  '!@#$%^&*()-_=+';

/**
 * Draw a uniformly-distributed index into an alphabet using rejection sampling
 * over crypto-strong random bytes to avoid modulo bias.
 */
function randomIndex(alphabetLength: number): number {
  // Largest multiple of alphabetLength that fits in a byte; reject above it.
  const limit = Math.floor(256 / alphabetLength) * alphabetLength;
  let byte: number;
  do {
    byte = crypto.randomBytes(1)[0];
  } while (byte >= limit);
  return byte % alphabetLength;
}

/**
 * Service that owns all secret generation and setup-token lifecycle.
 *
 * HTTP-agnostic by design: it returns plaintext/hashes for callers to persist
 * and deliver. It never writes secrets to logs and never persists raw setup
 * tokens — only their sha256 hash leaves this service for storage.
 */
export class CredentialService implements ICredentialService {
  /**
   * Build credentials for the requested delivery method.
   *
   * - `admin_set`: validates the admin password then returns it for persistence.
   * - `temporary_password`: generates a random password, returned for both
   *   persistence and a one-time response reveal.
   * - `setup_link`: generates a single-use token (only the hash + expiry are
   *   returned for persistence; the raw token is for the emailed link).
   */
  prepareCredential(
    method: CredentialDeliveryMethod,
    adminProvidedPassword?: string,
  ): CredentialResult {
    switch (method) {
      case 'admin_set': {
        if (adminProvidedPassword === undefined) {
          throw AppError.badRequest(
            'A password is required when the credential delivery method is admin_set',
          );
        }
        this.validateAdminPassword(adminProvidedPassword);
        return { passwordToPersist: adminProvidedPassword };
      }

      case 'temporary_password': {
        const temporaryPassword = this.generateTemporaryPassword();
        return {
          passwordToPersist: temporaryPassword,
          temporaryPasswordForResponse: temporaryPassword,
        };
      }

      case 'setup_link': {
        const { raw, hash, expiresAt } = this.generateSetupToken();
        return {
          setupTokenRaw: raw,
          setupTokenHash: hash,
          setupTokenExpiresAt: expiresAt,
        };
      }

      default: {
        // Exhaustiveness guard — unreachable for valid CredentialDeliveryMethod.
        const exhaustiveCheck: never = method;
        throw AppError.badRequest(
          `Unsupported credential delivery method: ${String(exhaustiveCheck)}`,
        );
      }
    }
  }

  /**
   * Generate a crypto-strong temporary password of at least 12 characters,
   * drawn uniformly from a mixed alphabet via rejection sampling.
   */
  generateTemporaryPassword(): string {
    const length = Math.max(
      TEMPORARY_PASSWORD_LENGTH,
      MIN_TEMPORARY_PASSWORD_LENGTH,
    );
    let password = '';
    for (let i = 0; i < length; i += 1) {
      password += PASSWORD_ALPHABET[randomIndex(PASSWORD_ALPHABET.length)];
    }
    return password;
  }

  /**
   * Generate a single-use setup token. The raw token is returned for the
   * emailed link; only the sha256 hash and a 24h expiry are meant for storage.
   */
  generateSetupToken(): { raw: string; hash: string; expiresAt: Date } {
    const raw = crypto.randomBytes(SETUP_TOKEN_BYTES).toString('hex');
    const hash = this.hashSetupToken(raw);
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_TTL_MS);
    return { raw, hash, expiresAt };
  }

  /**
   * Hash a raw setup token using sha256 — the same hashing convention used for
   * refresh tokens — so stored hashes can be compared against presented tokens.
   */
  hashSetupToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Enforce the admin password policy (>= 8 characters).
   * Throws `AppError.badRequest` (HTTP 400) when the policy is not met.
   * The password value is never included in the error or any log output.
   */
  validateAdminPassword(password: string): void {
    if (typeof password !== 'string' || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      throw AppError.badRequest(
        `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters long`,
      );
    }
  }
}

// Export a singleton instance for convenience.
export const credentialService = new CredentialService();
