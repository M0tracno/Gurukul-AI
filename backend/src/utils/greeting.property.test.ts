/**
 * Property-Based Tests: Greeting name formatting and safe fallback
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 2: Greeting name formatting and safe fallback
 *
 * Property 2: For any hour and any first name, when the name is a non-empty
 * (after trimming) string the greeting contains the phrase followed by that
 * name, and when the name is null, undefined, or all-whitespace the greeting
 * equals the phrase alone and contains no "undefined" or "null" token.
 *
 * **Validates: Requirements 1.1, 1.6**
 */

import * as fc from 'fast-check';
import { computeGreeting, phraseForHour } from './greeting.js';

// Feature: personalized-role-dashboards-and-verified-access, Property 2: Greeting name formatting and safe fallback
describe('Property 2: Greeting name formatting and safe fallback', () => {
  it('renders the phrase followed by the trimmed name when a non-blank name is present', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        // A name that is non-empty after trimming: at least one non-whitespace char.
        fc
          .string({ minLength: 1, maxLength: 40 })
          .filter((s) => s.trim().length > 0),
        (hour, rawName) => {
          const phrase = phraseForHour(hour);
          const trimmed = rawName.trim();
          const greeting = computeGreeting(hour, rawName);

          // Greeting is exactly "<phrase>, <trimmedName>".
          expect(greeting).toBe(`${phrase}, ${trimmed}`);
          // Phrase and name are both present.
          expect(greeting.startsWith(phrase)).toBe(true);
          expect(greeting).toContain(trimmed);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('falls back to the phrase alone with no placeholder token when the name is absent or blank', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        // Absent or blank names: null, undefined, or whitespace-only strings.
        fc.oneof(
          fc.constant<null>(null),
          fc.constant<undefined>(undefined),
          fc.constant(''),
          // Whitespace-only string (spaces, tabs, newlines).
          fc
            .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
              minLength: 1,
              maxLength: 10,
            })
            .map((chars) => chars.join('')),
        ),
        (hour, blankName) => {
          const phrase = phraseForHour(hour);
          const greeting = computeGreeting(hour, blankName);

          // Greeting equals the phrase alone — no name, no trailing separator.
          expect(greeting).toBe(phrase);
          // Never leaks a placeholder token regardless of how the name was absent.
          expect(greeting).not.toContain('undefined');
          expect(greeting).not.toContain('null');
          expect(greeting).not.toContain(',');
        },
      ),
      { numRuns: 200 },
    );
  });
});
