/**
 * Property-Based Test: Password Hashing Strength (Property 11)
 *
 * Feature: gurukul-ai-modernization, Property 11: Password Hashing Strength
 *
 * For any newly created or updated user password (generated as random strings),
 * the stored value SHALL be a bcrypt hash with a cost factor of at least 12.
 *
 * **Validates: Requirements 4.5, 12.5**
 */

import * as fc from 'fast-check';
import { PasswordService } from '../../src/services/passwordService.js';

const passwordService = new PasswordService();

/**
 * Extract the cost factor (rounds) from a bcrypt hash string.
 * Bcrypt hash format: $2a$XX$... or $2b$XX$... where XX is the cost factor.
 */
function extractBcryptCostFactor(hash: string): number {
  const match = hash.match(/^\$2[aby]?\$(\d{2})\$/);
  if (!match) {
    throw new Error(`Not a valid bcrypt hash: ${hash}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Verify that a string is a valid bcrypt hash format.
 * Bcrypt hashes are 60 characters long and start with $2a$, $2b$, or $2y$.
 */
function isValidBcryptHash(hash: string): boolean {
  return /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

// Generator for random password strings of varying lengths and character sets
const passwordArb = fc.oneof(
  // Simple alphanumeric passwords
  fc.string({ minLength: 1, maxLength: 72 }),
  // Passwords with special characters
  fc.string({ minLength: 1, maxLength: 72 }).map(s => {
    const specials = '!@#$%^&*()-_=+{}[]|\\:;"\'<>,.?/';
    return s + specials.charAt(Math.floor(Math.random() * specials.length));
  }),
  // Short passwords (1-3 chars)
  fc.string({ minLength: 1, maxLength: 3 }),
  // Longer passwords
  fc.string({ minLength: 8, maxLength: 72 })
).filter(s => s.length > 0);

describe('Property 11: Password Hashing Strength', () => {
  /**
   * Property: For any password string, hashPassword() produces a valid bcrypt hash
   * with cost factor >= 12.
   *
   * Note: bcrypt with cost factor 12 is computationally intensive (~250ms per hash),
   * so we set a generous timeout for 100 iterations.
   */
  it('hashPassword() should always produce a bcrypt hash with cost factor >= 12', async () => {
    await fc.assert(
      fc.asyncProperty(passwordArb, async (password) => {
        const hash = await passwordService.hashPassword(password);

        // The hash must be a valid bcrypt hash
        expect(isValidBcryptHash(hash)).toBe(true);

        // The cost factor must be at least 12
        const costFactor = extractBcryptCostFactor(hash);
        expect(costFactor).toBeGreaterThanOrEqual(12);
      }),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: For any password, the hash produced by hashPassword() is verifiable
   * with comparePassword() — ensures the hashing is consistent and correct.
   */
  it('hashPassword() output should be verifiable with comparePassword()', async () => {
    await fc.assert(
      fc.asyncProperty(passwordArb, async (password) => {
        const hash = await passwordService.hashPassword(password);

        // The original password should verify against the hash
        const matches = await passwordService.comparePassword(password, hash);
        expect(matches).toBe(true);
      }),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: For any two different passwords, their hashes should be different
   * (with overwhelming probability due to unique salts).
   */
  it('hashPassword() should produce unique hashes for different calls (unique salts)', async () => {
    await fc.assert(
      fc.asyncProperty(passwordArb, async (password) => {
        const hash1 = await passwordService.hashPassword(password);
        const hash2 = await passwordService.hashPassword(password);

        // Even the same password should produce different hashes (unique salts)
        expect(hash1).not.toBe(hash2);

        // Both should still be valid bcrypt hashes with cost >= 12
        expect(isValidBcryptHash(hash1)).toBe(true);
        expect(isValidBcryptHash(hash2)).toBe(true);
        expect(extractBcryptCostFactor(hash1)).toBeGreaterThanOrEqual(12);
        expect(extractBcryptCostFactor(hash2)).toBeGreaterThanOrEqual(12);
      }),
      { numRuns: 100 }
    );
  }, 120000);
});
