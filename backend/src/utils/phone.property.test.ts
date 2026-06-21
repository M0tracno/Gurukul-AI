/**
 * Property-Based Tests: Phone Normalization
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 8: Phone normalization is idempotent and match-invariant under formatting
 *
 * Property 8: For any phone number, every formatting variant (differing only in
 * spaces, punctuation, parentheses, or `+` vs `00` country-code prefix) reduces
 * to the same canonical `+<digits>` value; normalization is idempotent; and any
 * two inputs that share the same significant digits and country-code intent
 * match after normalization (match-invariance).
 *
 * **Validates: Requirements 4.6**
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { normalizePhone } from './phone.js';

const NUM_RUNS = 200;

/**
 * Generate a base phone number as a non-empty string of significant digits.
 * Constrained to realistic phone-number lengths (country code + subscriber).
 */
const significantDigitsArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 9 }), { minLength: 4, maxLength: 15 })
  .map(ds => ds.join(''));

/** Punctuation/whitespace artifacts that normalization must strip. */
const separatorArb: fc.Arbitrary<string> = fc.constantFrom(
  '',
  ' ',
  '  ',
  '-',
  '.',
  ' - ',
  ' . ',
  '\t',
);

/** Country-code prefix variants that must collapse to a leading `+`. */
const countryPrefixArb: fc.Arbitrary<string> = fc.constantFrom('+', '00');

/**
 * Given a digit string, produce an arbitrary that injects random formatting
 * artifacts (spaces, dashes, dots, parentheses) between the digits without
 * altering the underlying digit sequence.
 */
function formatVariantArb(digits: string): fc.Arbitrary<string> {
  const chars = digits.split('');
  return fc
    .tuple(
      // One separator slot before/after each digit, plus a trailing slot.
      fc.array(separatorArb, { minLength: chars.length + 1, maxLength: chars.length + 1 }),
      fc.integer({ min: 0, max: chars.length }),
      fc.integer({ min: 0, max: chars.length }),
    )
    .map(([separators, a, b]) => {
      // Optionally wrap a contiguous group of digits in parentheses to mimic
      // formats like "(044) 123" while preserving the digit order.
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      let out = '';
      for (let i = 0; i < chars.length; i++) {
        if (i === start && start !== end) out += '(';
        out += separators[i];
        out += chars[i];
        if (i === end - 1 && start !== end) out += ')';
      }
      out += separators[chars.length];
      return out;
    });
}

/** A single phone test case: base digits plus two independent formatting variants. */
interface PhoneCase {
  digits: string;
  prefixA: string;
  prefixB: string;
  variantA: string;
  variantB: string;
}

const phoneCaseArb: fc.Arbitrary<PhoneCase> = significantDigitsArb.chain(digits =>
  fc.record({
    digits: fc.constant(digits),
    prefixA: countryPrefixArb,
    prefixB: countryPrefixArb,
    variantA: formatVariantArb(digits),
    variantB: formatVariantArb(digits),
  }),
);

describe('normalizePhone property-based tests', () => {
  it('Property 8: produces identical canonical output for all formatting variants', () => {
    fc.assert(
      fc.property(phoneCaseArb, ({ digits, variantA }) => {
        const canonical = `+${digits}`;
        // A plain "+digits" formatting variant must equal the canonical form.
        expect(normalizePhone(`+${variantA}`)).toBe(canonical);
        // A "00" international prefix is equivalent to a leading "+".
        expect(normalizePhone(`00${variantA}`)).toBe(canonical);
        // A variant without any prefix also canonicalizes to "+digits".
        expect(normalizePhone(variantA)).toBe(canonical);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Property 8: equivalent formatting variants normalize to the same value (match-invariance)', () => {
    fc.assert(
      fc.property(phoneCaseArb, ({ digits, prefixA, prefixB, variantA, variantB }) => {
        const a = normalizePhone(`${prefixA}${variantA}`);
        const b = normalizePhone(`${prefixB}${variantB}`);
        // Match-invariance: same significant digits + country-code intent always
        // match regardless of spacing/punctuation/prefix choice.
        expect(a).toBe(b);
        expect(a).toBe(`+${digits}`);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Property 8: normalization is idempotent for formatted phone inputs', () => {
    fc.assert(
      fc.property(phoneCaseArb, ({ prefixA, variantA }) => {
        const once = normalizePhone(`${prefixA}${variantA}`);
        // normalizePhone(normalizePhone(x)) === normalizePhone(x)
        expect(normalizePhone(once)).toBe(once);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('Property 8: idempotent across arbitrary string inputs', () => {
    fc.assert(
      fc.property(fc.string(), raw => {
        const once = normalizePhone(raw);
        expect(normalizePhone(once)).toBe(once);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
