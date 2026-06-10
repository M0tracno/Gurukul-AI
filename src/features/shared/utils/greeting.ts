/**
 * Personalized time-of-day greeting helpers (frontend).
 *
 * This is the frontend counterpart of the backend `utils/greeting.ts` contract.
 * The frontend owns the rendering of the greeting because it knows the
 * browser's local time (the user's wall-clock hour). The phrase/name contract
 * is intentionally identical to the backend so behavior is consistent.
 *
 * Phrase boundaries (local hour, 0–23):
 *  - `[5, 12)`            → "Good morning"
 *  - `[12, 17)`           → "Good afternoon"
 *  - `[17, 24) ∪ [0, 5)`  → "Good evening"
 *
 * Name fallback: the first name is trimmed; when it is null, undefined, or
 * blank/whitespace the greeting is the phrase alone and never contains a
 * placeholder token such as "undefined" or "null".
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

/**
 * The set of time-of-day phrases a greeting can use.
 */
export type TimeOfDayPhrase = 'Good morning' | 'Good afternoon' | 'Good evening';

/**
 * Select the time-of-day phrase for a local hour.
 *
 * The hour is interpreted in the caller's own time zone (the wall-clock hour,
 * 0–23). Out-of-range or non-integer hours are normalized into the 0–23 space
 * so the function is total: it always returns exactly one phrase.
 *
 * @param localHour - The local wall-clock hour (expected 0–23).
 * @returns The matching {@link TimeOfDayPhrase}.
 *
 * @see Requirements 1.2, 1.3, 1.4, 1.5
 */
export function phraseForHour(localHour: number): TimeOfDayPhrase {
  // Normalize into 0–23 so the mapping is total for any numeric input.
  const hour = ((Math.trunc(localHour) % 24) + 24) % 24;

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  // [17, 24) and [0, 5) both fall through to evening.
  return 'Good evening';
}

/**
 * Build the full greeting string for a user.
 *
 * When `firstName` is a non-empty value (after trimming) the greeting is
 * `"${phrase}, ${trimmedName}"`. When `firstName` is null, undefined, or
 * blank/whitespace, the greeting is the phrase alone with no trailing
 * separator and no placeholder token.
 *
 * @param localHour - The local wall-clock hour (expected 0–23).
 * @param firstName - The user's first name from the authoritative record; may
 *   be null/undefined/blank when unavailable.
 * @returns The greeting string.
 *
 * @see Requirements 1.1, 1.6
 */
export function computeGreeting(localHour: number, firstName?: string | null): string {
  const phrase = phraseForHour(localHour);
  const trimmedName = firstName?.trim();

  if (!trimmedName) {
    return phrase;
  }

  return `${phrase}, ${trimmedName}`;
}
