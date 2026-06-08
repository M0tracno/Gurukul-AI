/**
 * Property-Based Tests for Grade Calculation Correctness
 *
 * Feature: gurukul-ai-modernization, Property 24: Grade Calculation Correctness
 *
 * Tests that the weighted average grade calculation equals
 * sum(score/maxScore × weight) / sum(weights), within floating-point tolerance.
 *
 * **Validates: Requirements 9.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateWeightedGrade, type MarkEntry } from './gradeCalculation';

/**
 * Generator for a valid mark entry with positive maxScore and weight.
 * score is constrained to [0, maxScore] to represent realistic grades.
 * Uses integer-based generation then divides for cleaner floating point values.
 */
const validMarkArb: fc.Arbitrary<MarkEntry> = fc
  .record({
    score: fc.integer({ min: 0, max: 10000 }),
    maxScore: fc.integer({ min: 1, max: 10000 }),
    weight: fc.integer({ min: 1, max: 10000 }),
  })
  .map(({ score, maxScore, weight }) => ({
    // Ensure score does not exceed maxScore for realistic data
    score: Math.min(score, maxScore) / 100,
    maxScore: maxScore / 100,
    weight: weight / 100,
  }));

/**
 * Generator for mark entries that may include invalid entries (zero maxScore or weight).
 */
const anyMarkArb: fc.Arbitrary<MarkEntry> = fc.oneof(
  validMarkArb,
  fc.record({
    score: fc.integer({ min: 0, max: 100 }).map((s) => s / 10),
    maxScore: fc.constant(0), // Invalid: zero maxScore
    weight: fc.integer({ min: 1, max: 100 }).map((w) => w / 10),
  }),
  fc.record({
    score: fc.integer({ min: 0, max: 100 }).map((s) => s / 10),
    maxScore: fc.integer({ min: 1, max: 100 }).map((m) => m / 10),
    weight: fc.constant(0), // Invalid: zero weight
  }),
);

describe('Feature: gurukul-ai-modernization, Property 24: Grade Calculation Correctness', () => {
  it('weighted average equals sum(score/maxScore × weight) / sum(weights) within floating-point tolerance', () => {
    fc.assert(
      fc.property(
        fc.array(validMarkArb, { minLength: 1, maxLength: 50 }),
        (marks) => {
          const result = calculateWeightedGrade(marks);

          // Reference implementation: compute expected value
          let weightedSum = 0;
          let totalWeight = 0;
          for (const mark of marks) {
            if (mark.maxScore > 0 && mark.weight > 0) {
              weightedSum += (mark.score / mark.maxScore) * mark.weight;
              totalWeight += mark.weight;
            }
          }

          const expected = totalWeight === 0 ? 0 : weightedSum / totalWeight;

          // Within floating-point tolerance (1e-10)
          expect(Math.abs(result - expected)).toBeLessThan(1e-10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns 0 for an empty array of marks', () => {
    expect(calculateWeightedGrade([])).toBe(0);
  });

  it('returns 0 when all marks have zero maxScore or zero weight', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              score: fc.integer({ min: 0, max: 100 }).map((s) => s / 10),
              maxScore: fc.constant(0),
              weight: fc.integer({ min: 0, max: 100 }).map((w) => w / 10),
            }),
            fc.record({
              score: fc.integer({ min: 0, max: 100 }).map((s) => s / 10),
              maxScore: fc.integer({ min: 1, max: 100 }).map((m) => m / 10),
              weight: fc.constant(0),
            }),
          ),
          { minLength: 1, maxLength: 20 },
        ),
        (marks) => {
          expect(calculateWeightedGrade(marks)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('result is bounded between 0 and 1 when scores do not exceed maxScores', () => {
    fc.assert(
      fc.property(
        fc.array(validMarkArb, { minLength: 1, maxLength: 50 }),
        (marks) => {
          const result = calculateWeightedGrade(marks);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ignores marks with zero maxScore or zero weight in mixed arrays', () => {
    fc.assert(
      fc.property(
        fc.array(anyMarkArb, { minLength: 1, maxLength: 30 }),
        (marks) => {
          const result = calculateWeightedGrade(marks);

          // Filter to valid marks only
          const validMarks = marks.filter((m) => m.maxScore > 0 && m.weight > 0);

          if (validMarks.length === 0) {
            expect(result).toBe(0);
          } else {
            let weightedSum = 0;
            let totalWeight = 0;
            for (const mark of validMarks) {
              weightedSum += (mark.score / mark.maxScore) * mark.weight;
              totalWeight += mark.weight;
            }
            const expected = weightedSum / totalWeight;
            expect(Math.abs(result - expected)).toBeLessThan(1e-10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('single mark: result equals score/maxScore', () => {
    fc.assert(
      fc.property(
        validMarkArb,
        (mark) => {
          const result = calculateWeightedGrade([mark]);
          const expected = mark.score / mark.maxScore;
          expect(Math.abs(result - expected)).toBeLessThan(1e-10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('equal weights: result is simple average of score/maxScore ratios', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(
          fc.record({
            score: fc.integer({ min: 0, max: 10000 }),
            maxScore: fc.integer({ min: 1, max: 10000 }),
          }).map(({ score, maxScore }) => ({
            score: Math.min(score, maxScore) / 100,
            maxScore: maxScore / 100,
          })),
          { minLength: 1, maxLength: 30 },
        ),
        (commonWeightInt, scoreEntries) => {
          const commonWeight = commonWeightInt / 100;
          const marks: MarkEntry[] = scoreEntries.map((entry) => ({
            ...entry,
            weight: commonWeight,
          }));

          const result = calculateWeightedGrade(marks);

          // When all weights are equal, weighted average = simple average of ratios
          const ratios = marks.map((m) => m.score / m.maxScore);
          const simpleAvg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;

          expect(Math.abs(result - simpleAvg)).toBeLessThan(1e-10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
