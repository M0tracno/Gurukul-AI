/**
 * Phone number normalization.
 *
 * Linkage matching for the parent OTP flow compares a submitted phone number
 * against a stored `linkagePhone`. To make that comparison reliable, both the
 * submitted value and the stored value are reduced to a single canonical,
 * E.164-style form before they are compared (Req 4.6).
 *
 * The canonical form is a leading `+` followed by the significant digits of the
 * number (country code included), with every formatting artifact removed:
 *
 *  - spaces, hyphens, dots, parentheses, and any other punctuation are dropped
 *  - a leading `+` and a leading `00` (the ITU international call prefix) are
 *    treated as equivalent country-code indicators and both collapse to `+`
 *
 * Two important guarantees follow from this construction and are relied upon by
 * the OTP linkage logic:
 *
 *  1. Idempotence: `normalizePhone(normalizePhone(x)) === normalizePhone(x)`,
 *     because canonical output is always `+<digits>` and re-normalizing it
 *     strips nothing and re-prepends the same `+`.
 *  2. Match-invariance under formatting: any two inputs that differ only in
 *     spacing, punctuation, or `+` vs `00` country-code formatting produce the
 *     same canonical value.
 *
 * @see Requirements 4.6
 */

/**
 * Reduce an arbitrary phone number string to its canonical E.164-style form.
 *
 * @param raw - The phone number as supplied by a caller or stored on a record.
 *   May contain spaces, punctuation, a leading `+`, or a leading `00`
 *   international prefix. `null`/`undefined` are tolerated.
 * @returns The canonical `+<digits>` form, or an empty string when the input
 *   contains no usable digits.
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) {
    return '';
  }

  const trimmed = String(raw).trim();
  if (trimmed === '') {
    return '';
  }

  // A leading '+' or a leading '00' both denote a country-code-qualified
  // number. They are equivalent formatting choices and must canonicalize to the
  // same value, so detect the '00' prefix before stripping non-digits.
  const usesZeroZeroPrefix = !trimmed.startsWith('+') && trimmed.startsWith('00');

  // Keep digits only; this removes spaces, punctuation, and the leading '+'.
  let digits = trimmed.replace(/\D/g, '');

  if (usesZeroZeroPrefix) {
    // Drop the '00' international call prefix; the remaining digits already
    // include the country code, mirroring a leading '+'.
    digits = digits.slice(2);
  }

  if (digits === '') {
    return '';
  }

  return `+${digits}`;
}
