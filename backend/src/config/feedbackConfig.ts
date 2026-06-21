/**
 * Feedback and quiz-analytics configuration constants.
 *
 * Centralizes the feedback rating scale, the thresholds used to classify
 * feedback for Feedback_Stats, the maximum comment length, the quiz-analytics
 * score-distribution bands, and the pass threshold so that the scale and
 * thresholds are configurable in one place rather than scattered across
 * models, validators, and services.
 *
 * @see Requirements 6.2 (configured rating scale / comment max length)
 * @see Requirements 8.2 (positive vs needs-attention thresholds for Feedback_Stats)
 * @see Design "Configuration constants" and "Design Decisions and Assumptions"
 */

/** Minimum allowed feedback rating (inclusive). */
export const RATING_MIN = 1;

/** Maximum allowed feedback rating (inclusive). */
export const RATING_MAX = 5;

/** Ratings greater than or equal to this value count as "positive". */
export const POSITIVE_THRESHOLD = 4;

/** Ratings less than or equal to this value count as "needs attention". */
export const NEEDS_ATTENTION_THRESHOLD = 2;

/** Maximum length of a feedback comment / reply (mirrors Message.content). */
export const COMMENT_MAX_LENGTH = 2000;

/**
 * Score percentage (earned / max) at or above which a finalized, graded
 * submission counts as a pass for the quiz-analytics pass rate.
 */
export const PASS_THRESHOLD = 40;

/**
 * A single quiz-analytics score-distribution band.
 *
 * `min`/`max` are inclusive percentage bounds; `label` is the key used in the
 * `scoreDistribution` map returned by the Quiz_Analytics_API.
 */
export interface ScoreBand {
  /** Inclusive lower bound of the band, as a score percentage. */
  readonly min: number;
  /** Inclusive upper bound of the band, as a score percentage. */
  readonly max: number;
  /** Stable key used in the scoreDistribution response map. */
  readonly label: string;
}

/**
 * Score-distribution bands for quiz analytics, expressed as inclusive
 * percentage ranges. The bands are contiguous and cover 0–100.
 */
export const SCORE_BANDS: readonly ScoreBand[] = [
  { min: 0, max: 20, label: '0-20' },
  { min: 21, max: 40, label: '21-40' },
  { min: 41, max: 60, label: '41-60' },
  { min: 61, max: 80, label: '61-80' },
  { min: 81, max: 100, label: '81-100' },
] as const;
