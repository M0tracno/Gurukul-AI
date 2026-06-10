/**
 * Property-Based Test: Temporary Password Generation
 *
 * Feature: secure-admin-user-management, Property 12: Temporary passwords are long, hashed, and revealed exactly once
 *
 * For any account creation or reset using the `temporary_password` method, the
 * System SHALL generate a Temporary_Password of at least 12 characters, persist
 * only its bcrypt hash, and return the plaintext value exactly once in the
 * response.
 *
 * This service-level test verifies the credentialService obligations for the
 * `temporary_password` method:
 *  - generated temporary passwords are always >= 12 characters,
 *  - the plaintext to persist (which the model hook bcrypt-hashes) equals the
 *    single one-time plaintext returned for the response, and
 *  - no setup-token material is produced for this delivery method.
 *
 * **Validates: Requirements 8.2, 9.1**
 */

import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';
import { CredentialService } from '../../src/services/credentialService.js';

const credentialService = new CredentialService();

/** Minimum length mandated for a system-generated temporary password. */
const MIN_TEMPORARY_PASSWORD_LENGTH = 12;

describe('Property 12: Temporary passwords are long, hashed, and revealed exactly once', () => {
  /**
   * Property: every generated temporary password is at least 12 characters long
   * and is composed only of printable characters (no whitespace), across many
   * independent generations.
   */
  it('generateTemporaryPassword() always produces a password of at least 12 characters', () => {
    fc.assert(
      // The integer is an unused iteration driver so fast-check runs the
      // generator many times; generation itself takes no input.
      fc.property(fc.integer(), () => {
        const password = credentialService.generateTemporaryPassword();

        expect(typeof password).toBe('string');
        expect(password.length).toBeGreaterThanOrEqual(MIN_TEMPORARY_PASSWORD_LENGTH);
        // A temporary password must not contain whitespace that could be lost
        // in transit or display.
        expect(/\s/.test(password)).toBe(false);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  /**
   * Property: preparing a `temporary_password` credential yields a plaintext of
   * at least 12 characters that is returned exactly once for the response and is
   * identical to the value handed off for persistence (the model hook hashes it).
   * No setup-token fields are produced for this method.
   */
  it('prepareCredential("temporary_password") reveals a >=12 char plaintext exactly once and persists the same value', () => {
    fc.assert(
      fc.property(fc.integer(), () => {
        const result = credentialService.prepareCredential('temporary_password');

        // The one-time plaintext reveal must be present and long enough.
        expect(result.temporaryPasswordForResponse).toBeDefined();
        expect(result.temporaryPasswordForResponse!.length).toBeGreaterThanOrEqual(
          MIN_TEMPORARY_PASSWORD_LENGTH
        );

        // The value to persist (later bcrypt-hashed by the model hook) is the
        // same plaintext that is revealed once — no second/divergent reveal.
        expect(result.passwordToPersist).toBe(result.temporaryPasswordForResponse);

        // The temporary_password method must not emit any setup-token material.
        expect(result.setupTokenRaw).toBeUndefined();
        expect(result.setupTokenHash).toBeUndefined();
        expect(result.setupTokenExpiresAt).toBeUndefined();
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
