/**
 * Property-Based Test: Audit and log metadata never contain secret values
 *
 * Feature: communication-feedback-and-admin-apis, Property 26: Audit and log metadata never contain secret values
 *
 * Property 26: For any metadata object attached to an audit entry or log
 * emitted by a new endpoint, no value under a secret-bearing key (password,
 * token, otp, secret, credential, etc.) survives redaction.
 *
 * **Validates: Requirements 12.7**
 *
 * Strategy: generate arbitrary nested metadata objects that embed
 * secret-bearing keys (random casing and surrounding text, at varying depths
 * and inside arrays) holding sensitive string values, alongside ordinary
 * non-secret keys. After `redactSecrets()`:
 *   - every value reachable under a secret-bearing key is the placeholder,
 *   - non-secret keys/values are preserved unchanged,
 *   - redaction is idempotent (a second pass is a no-op).
 */

import * as fc from 'fast-check';

import { redactSecrets } from './auditContext.js';

// ---------------------------------------------------------------------------
// Mirror of the production secret vocabulary (kept local to the test so the
// property states the contract independently of the implementation).
// ---------------------------------------------------------------------------
const SECRET_KEY_SUBSTRINGS = [
  'password',
  'passwd',
  'otp',
  'token',
  'secret',
  'apikey',
  'credential',
] as const;

const REDACTION_PLACEHOLDER = '[REDACTED]';

function isSecretKey(key: string): boolean {
  const lowered = key.toLowerCase();
  return SECRET_KEY_SUBSTRINGS.some((needle) => lowered.includes(needle));
}

/** Randomly re-case each character of a string. */
function randomCasingArb(base: string): fc.Arbitrary<string> {
  if (base.length === 0) {
    return fc.constant(base);
  }
  return fc
    .array(fc.boolean(), { minLength: base.length, maxLength: base.length })
    .map((flags) =>
      base
        .split('')
        .map((ch, i) => (flags[i] ? ch.toUpperCase() : ch.toLowerCase()))
        .join('')
    );
}

/**
 * A key that DOES contain a secret substring: a random secret needle with
 * random casing, optionally wrapped in non-secret surrounding text.
 * Examples: "Otp", "temporaryPassword", "setupTOKEN", "x_secret_y".
 */
const secretKeyArb: fc.Arbitrary<string> = fc
  .tuple(
    // surrounding prefix/suffix that must NOT themselves introduce a secret
    // substring (we constrain to a safe alphabet and short length, then guard).
    fc.string({ maxLength: 6 }),
    fc.constantFrom(...SECRET_KEY_SUBSTRINGS).chain(randomCasingArb),
    fc.string({ maxLength: 6 })
  )
  .map(([prefix, needle, suffix]) => `${prefix}${needle}${suffix}`)
  .filter((key) => isSecretKey(key));

/**
 * A key that does NOT contain any secret substring. Built from a safe alphabet
 * and filtered to guarantee it is non-secret.
 */
const nonSecretKeyArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9_ ]{0,15}$/)
  .filter((key) => key.length > 0 && !isSecretKey(key));

/** A sensitive string value placed under secret keys. */
const sensitiveValueArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 24 })
  .filter((s) => s !== REDACTION_PLACEHOLDER);

/** A non-secret leaf value: string, number, boolean, or null. */
const nonSecretLeafArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string({ maxLength: 20 }).filter((s) => s !== REDACTION_PLACEHOLDER),
  fc.integer(),
  fc.boolean(),
  fc.constant(null)
);

/**
 * Recursively assert the redaction contract on a (post-redaction) value,
 * given the structure of the original. We walk both trees in parallel.
 */
function assertRedacted(original: unknown, redacted: unknown): void {
  if (Array.isArray(original)) {
    expect(Array.isArray(redacted)).toBe(true);
    const redactedArr = redacted as unknown[];
    expect(redactedArr).toHaveLength(original.length);
    original.forEach((item, i) => assertRedacted(item, redactedArr[i]));
    return;
  }

  if (isPlainObject(original)) {
    expect(isPlainObject(redacted)).toBe(true);
    const redactedObj = redacted as Record<string, unknown>;
    // Same keys preserved.
    expect(Object.keys(redactedObj).sort()).toEqual(
      Object.keys(original).sort()
    );
    for (const [key, val] of Object.entries(original)) {
      if (isSecretKey(key)) {
        // Every value under a secret-bearing key is fully replaced, regardless
        // of the original value's shape.
        expect(redactedObj[key]).toBe(REDACTION_PLACEHOLDER);
      } else {
        assertRedacted(val, redactedObj[key]);
      }
    }
    return;
  }

  // Non-secret leaf: preserved exactly.
  expect(redacted).toEqual(original);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Generator for arbitrary nested metadata that mixes secret and non-secret
 * keys at varying depths, including inside arrays.
 */
function metadataArb(): fc.Arbitrary<Record<string, unknown>> {
  const { object } = fc.letrec((tie) => ({
    leaf: nonSecretLeafArb,
    node: fc.oneof(
      { depthSize: 'small', withCrossShrink: true },
      tie('leaf'),
      tie('array'),
      tie('object')
    ),
    array: fc.array(tie('node'), { maxLength: 4 }),
    object: fc
      .array(
        fc.oneof(
          // secret entry: secret key -> sensitive value (string or nested)
          fc.tuple(
            secretKeyArb,
            fc.oneof(sensitiveValueArb, tie('node'))
          ),
          // non-secret entry: non-secret key -> arbitrary node
          fc.tuple(nonSecretKeyArb, tie('node'))
        ),
        { maxLength: 6 }
      )
      .map((entries) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of entries) {
          obj[k] = v;
        }
        return obj;
      }),
  }));

  return object as fc.Arbitrary<Record<string, unknown>>;
}

// Feature: communication-feedback-and-admin-apis, Property 26: Audit and log metadata never contain secret values
describe('Property 26: Audit and log metadata never contain secret values', () => {
  it('redactSecrets replaces every secret-bearing value and preserves non-secret data', () => {
    fc.assert(
      fc.property(metadataArb(), (metadata) => {
        const redacted = redactSecrets(metadata);
        assertRedacted(metadata, redacted);
      }),
      { numRuns: 200 }
    );
  });

  it('redactSecrets does not mutate its input (returns a copy)', () => {
    fc.assert(
      fc.property(metadataArb(), (metadata) => {
        const snapshot = JSON.stringify(metadata);
        redactSecrets(metadata);
        expect(JSON.stringify(metadata)).toBe(snapshot);
      }),
      { numRuns: 200 }
    );
  });

  it('redactSecrets is idempotent (a second pass is a no-op)', () => {
    fc.assert(
      fc.property(metadataArb(), (metadata) => {
        const once = redactSecrets(metadata);
        const twice = redactSecrets(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 200 }
    );
  });
});
