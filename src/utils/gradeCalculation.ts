/**
 * Grade Calculation Utilities
 *
 * Pure functions for computing weighted average grades from mark data.
 * Validates: Requirements 9.4 (Property 24)
 */

export interface MarkEntry {
  score: number;
  maxScore: number;
  weight: number;
}

/**
 * Calculate the weighted average grade for a set of marks.
 *
 * Formula: sum(score/maxScore × weight) / sum(weights)
 *
 * Returns a value between 0 and 1 representing the weighted average.
 * Returns 0 if no valid marks are provided (empty array or all weights/maxScores are zero).
 *
 * Only marks with maxScore > 0 and weight > 0 are considered valid.
 */
export function calculateWeightedGrade(marks: MarkEntry[]): number {
  if (marks.length === 0) {
    return 0;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const mark of marks) {
    if (mark.maxScore > 0 && mark.weight > 0) {
      weightedSum += (mark.score / mark.maxScore) * mark.weight;
      totalWeight += mark.weight;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  return weightedSum / totalWeight;
}
