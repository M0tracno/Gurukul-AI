/**
 * Property-Based Test: Secret Redaction (Property 15)
 *
 * Feature: secure-admin-user-management, Property 15: Secrets are redacted from all audit and application logs
 *
 * For any account creation, update, or password reset across all delivery
 * methods, no Audit_Log entry and no captured application log line SHALL
 * contain a plaintext password or a raw setup token.
 *
 * This property is exercised against the redaction guard (`redactSecrets` in
 * `src/utils/auditContext.ts`), which every audit/log metadata object is passed
 * through before it reaches the audit store or the application logger. We
 * generate arbitrary metadata objects that embed secret-keyed values (plaintext
 * passwords, temporary passwords, raw setup tokens) at varying depths and assert
 * that no plaintext secret survives redaction.
 *
 * **Validates: Requirements 8.5, 11.4**
 */

import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';

import { redactSecrets } from '../../src/utils/auditContext.js';

// --- Generators ---

/**
 * Keys the redaction guard MUST strip, in a variety of casings to prove the
 * match is case-insensitive (`password`, `temporaryPassword`, `setupToken`,
 * `token`).
 */
const redactedKeyArb = fc.constantFrom(
  'password',
  'Password',
  'PASSWORD',
  'temporaryPassword',
  'temporarypassword',
  'TemporaryPassword',
  'setupToken',
  'setuptoken',
  'SetupToken',
  'token',
  'Token',
  'TOKEN',
);

/**
 * Keys that must be preserved. None of these match a redacted key
 * (case-insensitively).
 */
const safeKeyArb = fc.constantFrom(
  'username',
  'email',
  'firstName',
  'lastName',
  'count',
  'data',
  'meta',
  'id',
  'role',
  'active',
  'resource',
);

/**
 * Sentinel for sensitive plaintext. Secret values ONLY ever appear as the value
 * of a redacted key, so after redaction the prefix must not survive anywhere in
 * the serialized output.
 */
const SECRET_PREFIX = 'plaintext-secret-';
const secretValueArb = fc.uuid().map((u) => `${SECRET_PREFIX}${u}`);

/** Non-secret scalar values, prefixed so they can never collide with secrets. */
const safeScalarArb = fc.oneof(
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.string({ maxLength: 20 }).map((s) => `safe-${s}`),
);

/**
 * Recursive metadata generator. Objects mix safe-keyed entries (whose values
 * may themselves nest further) with secret-keyed entries (always a scalar
 * plaintext secret). This guarantees every plaintext secret is the value of a
 * redacted key at some depth.
 */
const metadataArb = fc.letrec((tie) => ({
  value: fc.oneof(
    { maxDepth: 4, depthIdentifier: 'metadata' },
    tie('leaf'),
    tie('obj'),
    tie('arr'),
  ),
  leaf: safeScalarArb,
  arr: fc.array(tie('value'), { maxLength: 3 }),
  obj: fc
    .tuple(
      fc.array(fc.tuple(safeKeyArb, tie('value')), { maxLength: 3 }),
      fc.array(fc.tuple(redactedKeyArb, secretValueArb), { maxLength: 3 }),
    )
    .map(([safeEntries, secretEntries]) => {
      const o: Record<string, unknown> = {};
      for (const [k, v] of safeEntries) o[k] = v;
      // Secret entries applied last so a secret key always wins its slot.
      for (const [k, v] of secretEntries) o[k] = v;
      return o;
    }),
})).value;

describe('Property 15: Secrets are redacted from all audit and application logs', () => {
  /**
   * Core property: for any arbitrarily-nested metadata object, the redacted
   * output contains no plaintext secret value anywhere.
   */
  it('strips every plaintext secret from nested audit/log metadata', () => {
    fc.assert(
      fc.property(metadataArb, (metadata) => {
        const redacted = redactSecrets(metadata);
        const serialized = JSON.stringify(redacted);

        // No sentinel secret value survives at any depth.
        expect(serialized.includes(SECRET_PREFIX)).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * The guard must not mutate its input: the original object still carries the
   * plaintext secrets after redaction (redaction returns a copy).
   */
  it('does not mutate the input metadata', () => {
    fc.assert(
      fc.property(metadataArb, (metadata) => {
        const before = JSON.stringify(metadata);
        redactSecrets(metadata);
        const after = JSON.stringify(metadata);

        expect(after).toBe(before);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * Focused property over realistic credential-delivery metadata: a flat object
   * carrying a plaintext password, a temporary password, and a raw setup token.
   * Each secret key is replaced and none of the plaintext values survive.
   */
  it('redacts password, temporaryPassword, setupToken, and token while preserving safe fields', () => {
    fc.assert(
      fc.property(
        secretValueArb,
        secretValueArb,
        secretValueArb,
        secretValueArb,
        fc.string({ maxLength: 30 }).map((s) => `user-${s}`),
        (password, temporaryPassword, setupToken, token, email) => {
          const metadata = {
            email,
            password,
            temporaryPassword,
            setupToken,
            token,
            action: 'account_created',
          };

          const redacted = redactSecrets(metadata) as Record<string, unknown>;
          const serialized = JSON.stringify(redacted);

          // Every secret-keyed field is replaced with the placeholder.
          expect(redacted.password).toBe('[REDACTED]');
          expect(redacted.temporaryPassword).toBe('[REDACTED]');
          expect(redacted.setupToken).toBe('[REDACTED]');
          expect(redacted.token).toBe('[REDACTED]');

          // No plaintext secret value remains anywhere in the output.
          expect(serialized.includes(SECRET_PREFIX)).toBe(false);
          expect(serialized.includes(password)).toBe(false);
          expect(serialized.includes(temporaryPassword)).toBe(false);
          expect(serialized.includes(setupToken)).toBe(false);
          expect(serialized.includes(token)).toBe(false);

          // Safe fields are preserved unchanged.
          expect(redacted.email).toBe(email);
          expect(redacted.action).toBe('account_created');
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * Secrets nested inside arrays and deeper objects are also stripped, covering
   * audit metadata that embeds credential payloads under safe-named containers.
   */
  it('redacts secrets nested inside arrays and deeper objects', () => {
    fc.assert(
      fc.property(secretValueArb, secretValueArb, (password, setupToken) => {
        const metadata = {
          data: {
            accounts: [
              { email: 'a@example.com', password },
              { email: 'b@example.com', setupToken },
            ],
          },
          meta: { nested: { token: setupToken } },
        };

        const serialized = JSON.stringify(redactSecrets(metadata));

        expect(serialized.includes(SECRET_PREFIX)).toBe(false);
        expect(serialized.includes(password)).toBe(false);
        expect(serialized.includes(setupToken)).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
