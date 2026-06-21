/**
 * Property 13: Setup links are single-use, time-limited, and store only a hash
 *
 * For any account creation or reset using the `setup_link` method, the System
 * SHALL generate a setup token whose expiry is within 24 hours, persist only
 * the token hash (never the raw token), and invoke the Email_Service to send
 * the link.
 *
 * This test focuses on the credentialService generation bounds that underpin
 * the property: the expiry window, that only a hash is returned for
 * persistence, and that the raw token is never equal to its stored hash.
 *
 * Feature: secure-admin-user-management, Property 13: Setup links are single-use, time-limited, and store only a hash
 *
 * **Validates: Requirements 8.3, 9.2**
 */

import crypto from 'node:crypto';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';
import { CredentialService } from '../../src/services/credentialService.js';

const credentialService = new CredentialService();

/** 24 hours in milliseconds — the maximum allowed setup-token lifetime. */
const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Dummy arbitrary used solely to drive >= 100 iterations of generation; each
 * run produces a fresh token because generation draws from crypto randomness.
 */
const seedArb: fc.Arbitrary<number> = fc.integer();

describe('Property 13: Setup links are single-use, time-limited, and store only a hash', () => {
  it('generateSetupToken produces a token expiring within 24h, returns only a hash for persistence, and the raw token never equals the stored hash', () => {
    fc.assert(
      fc.property(seedArb, () => {
        const before = Date.now();
        const { raw, hash, expiresAt } = credentialService.generateSetupToken();
        const after = Date.now();

        // Expiry is in the future and within 24 hours of issuance. The token
        // expiry is computed from a clock read taken inside the call (between
        // `before` and `after`), so the valid window is bounded below by
        // `before + 24h` and above by `after + 24h`.
        const expiresAtMs = expiresAt.getTime();
        expect(expiresAtMs).toBeGreaterThan(after);
        expect(expiresAtMs).toBeGreaterThanOrEqual(before + TWENTY_FOUR_HOURS_IN_MS);
        expect(expiresAtMs).toBeLessThanOrEqual(after + TWENTY_FOUR_HOURS_IN_MS);

        // A non-empty raw token and hash are produced.
        expect(typeof raw).toBe('string');
        expect(raw.length).toBeGreaterThan(0);
        expect(typeof hash).toBe('string');
        expect(hash.length).toBeGreaterThan(0);

        // Only the hash is meant for persistence: the stored hash must be the
        // sha256 of the raw token, and the raw token must never equal the hash.
        const expectedHash = crypto
          .createHash('sha256')
          .update(raw)
          .digest('hex');
        expect(hash).toBe(expectedHash);
        expect(hash).not.toBe(raw);

        // hashSetupToken is deterministic and matches the generated hash so a
        // presented raw token can be compared against the stored hash.
        expect(credentialService.hashSetupToken(raw)).toBe(hash);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('prepareCredential("setup_link") returns only the hash + expiry for persistence and never a plaintext password', () => {
    fc.assert(
      fc.property(seedArb, () => {
        const before = Date.now();
        const result = credentialService.prepareCredential('setup_link');
        const after = Date.now();

        // No password (plaintext or for-response) is exposed for setup_link.
        expect(result.passwordToPersist).toBeUndefined();
        expect(result.temporaryPasswordForResponse).toBeUndefined();

        // Hash and expiry are present for persistence.
        expect(typeof result.setupTokenHash).toBe('string');
        expect(result.setupTokenHash!.length).toBeGreaterThan(0);
        expect(result.setupTokenExpiresAt).toBeInstanceOf(Date);

        // Expiry within 24h of issuance (window bounded by before/after).
        const expiresAtMs = result.setupTokenExpiresAt!.getTime();
        expect(expiresAtMs).toBeGreaterThan(after);
        expect(expiresAtMs).toBeGreaterThanOrEqual(before + TWENTY_FOUR_HOURS_IN_MS);
        expect(expiresAtMs).toBeLessThanOrEqual(after + TWENTY_FOUR_HOURS_IN_MS);

        // The stored hash is the sha256 of the raw token, and the raw token is
        // never equal to the stored hash.
        const raw = result.setupTokenRaw!;
        expect(typeof raw).toBe('string');
        expect(raw.length).toBeGreaterThan(0);
        expect(result.setupTokenHash).toBe(
          crypto.createHash('sha256').update(raw).digest('hex'),
        );
        expect(result.setupTokenHash).not.toBe(raw);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
