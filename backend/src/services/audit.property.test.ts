/**
 * Property-Based Tests: Secret redaction removes OTPs, passwords, and raw tokens
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 20: Secret redaction removes OTPs, passwords, and raw tokens
 *
 * Property 20: For any (possibly nested) metadata object containing a mix of
 * secret-named keys (password/passwd/otp/token/secret/apikey/credential and
 * their variants) holding raw secret values alongside ordinary keys,
 * `redactSecrets` returns a copy in which none of the original secret values
 * survive at any depth, and redaction is idempotent
 * (`redactSecrets(redactSecrets(x))` deep-equals `redactSecrets(x)`).
 *
 * **Validates: Requirements 8.4**
 */

import * as fc from 'fast-check';
import { redactSecrets } from '../utils/auditContext.js';

// Marker prefix that ONLY raw secret values carry. Because the generators
// guarantee no other key or value can contain this marker, its presence in the
// redacted output unambiguously means a secret value leaked through.
const SECRET_MARKER = '__SEKRET__';

// Keys whose names contain a secret substring (case-insensitive), covering the
// vocabulary { password, passwd, otp, token, secret, apikey, credential } plus
// realistic variants the redactor must also strip.
const secretKeyArb = fc.constantFrom(
  'password',
  'passwd',
  'otp',
  'token',
  'secret',
  'apikey',
  'credential',
  'temporaryPassword',
  'setupToken',
  'accessToken',
  'refreshToken',
  'rawToken',
  'otpHash',
  'OTP',
  'Password',
  'apiKey',
  'userCredential',
);

// Raw secret values: always non-empty and always carry the unique marker so we
// can detect any survivor in the redacted output regardless of nesting.
const secretValueArb = fc
  .string({ maxLength: 24 })
  .map((s) => `${SECRET_MARKER}${s}`);

// Ordinary key names, none of which contain any secret substring.
const nonSecretKeyArb = fc.constantFrom(
  'name',
  'email',
  'role',
  'count',
  'id',
  'status',
  'firstName',
  'lastName',
  'timestamp',
  'ip',
  'correlationId',
  'action',
  'userId',
  'message',
  'level',
);

// Ordinary scalar values that can never contain the secret marker.
const nonSecretScalarArb = fc.oneof(
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.string({ maxLength: 24 }).filter((s) => !s.includes(SECRET_MARKER)),
);

// A recursive metadata tree: scalars, arrays, and objects that mix secret and
// non-secret entries at arbitrary depth.
const { node } = fc.letrec<{ node: unknown }>((tie) => ({
  node: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    nonSecretScalarArb,
    fc.array(tie('node'), { maxLength: 3 }),
    fc
      .array(
        fc.oneof(
          fc
            .tuple(secretKeyArb, secretValueArb)
            .map(([k, v]) => [k, v] as const),
          fc
            .tuple(nonSecretKeyArb, tie('node'))
            .map(([k, v]) => [k, v] as const),
        ),
        { maxLength: 5 },
      )
      .map((entries) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of entries) {
          obj[k] = v;
        }
        return obj;
      }),
  ),
}));

// Top-level generator always yields an object so there is always something to
// redact (the redactor is a pure pass-through for bare scalars).
const metadataArb = fc
  .array(
    fc.oneof(
      fc.tuple(secretKeyArb, secretValueArb).map(([k, v]) => [k, v] as const),
      fc.tuple(nonSecretKeyArb, node).map(([k, v]) => [k, v] as const),
    ),
    { minLength: 1, maxLength: 6 },
  )
  .map((entries) => {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      obj[k] = v;
    }
    return obj;
  });

// Feature: personalized-role-dashboards-and-verified-access, Property 20: Secret redaction removes OTPs, passwords, and raw tokens
describe('Property 20: Secret redaction removes OTPs, passwords, and raw tokens', () => {
  it('removes every raw secret value at any depth and never mutates the input', () => {
    fc.assert(
      fc.property(metadataArb, (metadata) => {
        const before = JSON.stringify(metadata);

        const redacted = redactSecrets(metadata);

        // No raw secret value (marker-bearing) survives anywhere in the output.
        expect(JSON.stringify(redacted)).not.toContain(SECRET_MARKER);

        // The original object is not mutated; a redacted copy is returned.
        expect(JSON.stringify(metadata)).toBe(before);
      }),
      { numRuns: 200 },
    );
  });

  it('is idempotent: redacting an already-redacted object is a no-op', () => {
    fc.assert(
      fc.property(metadataArb, (metadata) => {
        const once = redactSecrets(metadata);
        const twice = redactSecrets(once);

        expect(twice).toEqual(once);
      }),
      { numRuns: 200 },
    );
  });
});
