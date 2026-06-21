/**
 * Property 12: Feedback validation accepts valid input and rejects invalid input
 *
 * For any feedback submission with a rating outside [RATING_MIN, RATING_MAX],
 * a missing target identifier, a target type other than `teacher` or `course`,
 * or a comment longer than COMMENT_MAX_LENGTH, validation fails with 400; for
 * any input violating none of these rules, validation does not reject it.
 *
 * Feature: communication-feedback-and-admin-apis, Property 12: Feedback validation accepts valid input and rejects invalid input
 *
 * **Validates: Requirements 6.2**
 *
 * Strategy: drive the real submit-feedback Zod schema (`submitFeedbackBodySchema`)
 * directly via `safeParse`. The schema is the single source of truth wired into
 * the route ahead of the controller, so a rejected parse corresponds to the 400
 * response produced by `validateRequest`, and an accepted parse means the
 * controller is reached. Thresholds are imported from config rather than
 * hardcoded so the test tracks the configured rating scale and comment bound.
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';

import { submitFeedbackBodySchema } from '../../src/routes/feedbackRoutes.js';
import {
  RATING_MIN,
  RATING_MAX,
  COMMENT_MAX_LENGTH,
} from '../../src/config/index.js';

// --- Generators for individually-valid field values ---

const validTargetTypeArb = fc.constantFrom('teacher', 'course');
const validTargetIdArb = fc.string({ minLength: 1, maxLength: 40 });
const validRatingArb = fc.integer({ min: RATING_MIN, max: RATING_MAX });
const validCommentArb = fc.string({ minLength: 0, maxLength: COMMENT_MAX_LENGTH });

/** A fully valid submit body that violates none of the rules. */
const validBodyArb = fc.record({
  targetType: validTargetTypeArb,
  targetId: validTargetIdArb,
  rating: validRatingArb,
  comment: validCommentArb,
});

// --- Generators for guaranteed-invalid bodies (one violated rule each) ---

// Rating outside [RATING_MIN, RATING_MAX] or non-integer.
const invalidRatingArb = fc.oneof(
  fc.integer({ min: RATING_MAX + 1, max: RATING_MAX + 1000 }),
  fc.integer({ min: RATING_MIN - 1000, max: RATING_MIN - 1 }),
  // Non-integer within range -> violates `.int()`.
  fc
    .double({ min: RATING_MIN, max: RATING_MAX, noNaN: true })
    .filter((n) => !Number.isInteger(n)),
);

const invalidRatingBodyArb = fc
  .record({
    targetType: validTargetTypeArb,
    targetId: validTargetIdArb,
    rating: invalidRatingArb,
    comment: validCommentArb,
  });

// Missing target identifier (targetId omitted entirely).
const missingTargetIdBodyArb = fc
  .record({
    targetType: validTargetTypeArb,
    rating: validRatingArb,
    comment: validCommentArb,
  });

// Empty-string target identifier (violates `.min(1)`).
const emptyTargetIdBodyArb = fc.record({
  targetType: validTargetTypeArb,
  targetId: fc.constant(''),
  rating: validRatingArb,
  comment: validCommentArb,
});

// Target type other than `teacher` or `course`.
const invalidTargetTypeArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s !== 'teacher' && s !== 'course');

const invalidTargetTypeBodyArb = fc.record({
  targetType: invalidTargetTypeArb,
  targetId: validTargetIdArb,
  rating: validRatingArb,
  comment: validCommentArb,
});

// Comment longer than COMMENT_MAX_LENGTH.
const longCommentArb = fc
  .integer({ min: COMMENT_MAX_LENGTH + 1, max: COMMENT_MAX_LENGTH + 200 })
  .map((len) => 'x'.repeat(len));

const longCommentBodyArb = fc.record({
  targetType: validTargetTypeArb,
  targetId: validTargetIdArb,
  rating: validRatingArb,
  comment: longCommentArb,
});

const invalidBodyArb = fc.oneof(
  invalidRatingBodyArb,
  missingTargetIdBodyArb,
  emptyTargetIdBodyArb,
  invalidTargetTypeBodyArb,
  longCommentBodyArb,
);

// --- Tests ---

describe('Property 12: Feedback validation accepts valid input and rejects invalid input', () => {
  it('accepts submissions that violate none of the rules', () => {
    fc.assert(
      fc.property(validBodyArb, (body) => {
        const result = submitFeedbackBodySchema.safeParse(body);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects submissions that violate at least one rule', () => {
    fc.assert(
      fc.property(invalidBodyArb, (body) => {
        const result = submitFeedbackBodySchema.safeParse(body);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
