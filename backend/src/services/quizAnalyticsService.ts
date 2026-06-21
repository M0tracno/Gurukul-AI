import { Types } from 'mongoose';

import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import type { ISubmission, GradingStatus } from '../models/Submission.js';
import Enrollment from '../models/Enrollment.js';
import { PASS_THRESHOLD, SCORE_BANDS } from '../config/index.js';
import { redactSecrets } from '../utils/auditContext.js';
import { logger } from '../utils/logger.js';

// ─── Result Types / DTOs ──────────────────────────────────────────────────────

/**
 * The set of grading statuses a {@link ISubmission} can hold. Mirrors the
 * `Submission` model's `GradingStatus` union so the completion-status map is
 * always fully populated (every status present with a count, defaulting to 0).
 */
const GRADING_STATUSES: readonly GradingStatus[] = [
  'queued',
  'processing',
  'completed',
  'failed',
] as const;

/**
 * Per-assessment analytics for one of the faculty member's own assessments.
 *
 * An assessment with no associated submissions contributes zeroed metrics
 * (`totalAttempts === 0`, `averageScorePercent === 0`, all band/status counts
 * 0) per Requirement 11.7. Assumption-gated metrics
 * (`completionRatePercent`/`passRatePercent`) are omitted when their source
 * data is absent (Requirement 11.8).
 */
export interface AssessmentAnalytics {
  /** The assessment's identifier. */
  assessmentId: string;
  /** The assessment's title (for display). */
  title: string;
  /** Count of submissions associated with this assessment (Req 11.3). */
  totalAttempts: number;
  /** Mean score percentage over this assessment's finalized graded submissions; 0 when none (Req 11.4). */
  averageScorePercent: number;
  /** Counts of finalized graded submissions per score band (Req 11.5). */
  scoreDistribution: Record<string, number>;
  /** Counts of submissions by `gradingStatus` (Req 11.6). */
  completionStatus: Record<GradingStatus, number>;
  /** Submissions / active enrolled students for this assessment's course; omitted when no active enrollments (Req 11.8). */
  completionRatePercent?: number;
  /** Percentage of finalized graded submissions scoring >= `PASS_THRESHOLD`; omitted when none (Req 11.8). */
  passRatePercent?: number;
}

/**
 * Aggregate quiz analytics for a faculty member, computed strictly from that
 * teacher's own assessments and the submissions associated with them
 * (Requirement 11.1). Metrics whose source data is genuinely absent are
 * omitted rather than fabricated (Requirement 11.8).
 */
export interface QuizAnalytics {
  /** Total submissions across all the teacher's assessments (Req 11.3). */
  totalAttempts: number;
  /** Mean score percentage over all finalized graded submissions; 0 when none (Req 11.4). */
  averageScorePercent: number;
  /** Counts of finalized graded submissions per score band (Req 11.5). */
  scoreDistribution: Record<string, number>;
  /** Counts of all submissions by `gradingStatus` (Req 11.6). */
  completionStatus: Record<GradingStatus, number>;
  /** Total submissions / total active enrolled students; omitted when no active enrollments (Req 11.8). */
  completionRatePercent?: number;
  /** Percentage of finalized graded submissions scoring >= `PASS_THRESHOLD`; omitted when none (Req 11.8). */
  passRatePercent?: number;
  /** Per-assessment breakdown for each of the teacher's assessments. */
  perAssessment: AssessmentAnalytics[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Round a number to two decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A submission is a "finalized graded submission" — eligible for average score,
 * score distribution, and pass rate — when it is finalized, carries graded
 * answers, and those answers contribute a positive total max score (so a score
 * percentage is well defined).
 */
function isFinalizedGraded(submission: Pick<ISubmission, 'finalized' | 'gradedAnswers'>): boolean {
  if (!submission.finalized) {
    return false;
  }
  const graded = submission.gradedAnswers;
  if (!graded || graded.length === 0) {
    return false;
  }
  const totalMax = graded.reduce((sum, ans) => sum + (ans.maxScore ?? 0), 0);
  return totalMax > 0;
}

/**
 * Score percentage (earned / max * 100) for a finalized graded submission.
 * Callers must ensure {@link isFinalizedGraded} holds so `totalMax > 0`.
 */
function scorePercent(submission: Pick<ISubmission, 'gradedAnswers'>): number {
  const graded = submission.gradedAnswers ?? [];
  const earned = graded.reduce((sum, ans) => sum + (ans.score ?? 0), 0);
  const totalMax = graded.reduce((sum, ans) => sum + (ans.maxScore ?? 0), 0);
  return (earned / totalMax) * 100;
}

/**
 * Resolve the score band label for a percentage. The percentage is clamped to
 * [0, 100] and rounded to the nearest integer so it always falls within exactly
 * one of the contiguous {@link SCORE_BANDS}.
 */
function bandLabelFor(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  for (const band of SCORE_BANDS) {
    if (clamped >= band.min && clamped <= band.max) {
      return band.label;
    }
  }
  // Defensive: contiguous bands cover 0..100, so this is unreachable.
  return SCORE_BANDS[SCORE_BANDS.length - 1].label;
}

/** A zeroed score-distribution map keyed by every configured band label. */
function emptyScoreDistribution(): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const band of SCORE_BANDS) {
    distribution[band.label] = 0;
  }
  return distribution;
}

/** A zeroed completion-status map keyed by every grading status. */
function emptyCompletionStatus(): Record<GradingStatus, number> {
  return {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
}

/**
 * The pure metrics computed from a flat list of submissions, independent of how
 * they were grouped. Reused for both the per-assessment and aggregate rollups.
 */
interface SubmissionMetrics {
  totalAttempts: number;
  averageScorePercent: number;
  scoreDistribution: Record<string, number>;
  completionStatus: Record<GradingStatus, number>;
  /** Present only when there is at least one finalized graded submission. */
  passRatePercent?: number;
}

/**
 * Compute the submission-derived metrics (attempts, average score, score
 * distribution, completion status, and pass rate) over an arbitrary set of
 * submissions. Pass rate is omitted when there are no finalized graded
 * submissions (Req 11.8). With an empty list, all metrics are zeroed (Req 11.7).
 */
function computeSubmissionMetrics(submissions: ISubmission[]): SubmissionMetrics {
  const completionStatus = emptyCompletionStatus();
  for (const submission of submissions) {
    const status = submission.gradingStatus;
    if (status in completionStatus) {
      completionStatus[status] += 1;
    }
  }

  const scoreDistribution = emptyScoreDistribution();
  const percentages: number[] = [];
  for (const submission of submissions) {
    if (!isFinalizedGraded(submission)) {
      continue;
    }
    const percent = scorePercent(submission);
    percentages.push(percent);
    scoreDistribution[bandLabelFor(percent)] += 1;
  }

  const averageScorePercent =
    percentages.length > 0
      ? round2(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
      : 0;

  const metrics: SubmissionMetrics = {
    totalAttempts: submissions.length,
    averageScorePercent,
    scoreDistribution,
    completionStatus,
  };

  // Pass rate is only meaningful when finalized graded submissions exist; omit
  // it otherwise rather than fabricating a value (Req 11.8).
  if (percentages.length > 0) {
    const passed = percentages.filter((p) => p >= PASS_THRESHOLD).length;
    metrics.passRatePercent = round2((passed / percentages.length) * 100);
  }

  return metrics;
}

// ─── Service ────────────────────────────────────────────────────────────────────

/**
 * Faculty quiz-analytics service.
 *
 * Computes real metrics for a teacher's assessments from the authoritative
 * `Assessment` and `Submission` collections (plus `Enrollment` as the optional
 * completion-rate denominator), replacing the placeholder numbers in the Quiz
 * Analytics UI.
 *
 * The faculty scope is always the `teacherId` derived from `req.user` by the
 * caller — never a client-supplied identifier (Requirement 11.2). This service
 * is HTTP-agnostic: it never references Request/Response objects.
 */
export class QuizAnalyticsService {
  /**
   * Compute aggregate and per-assessment quiz analytics for one faculty member.
   *
   * Resolves the teacher's own assessments (`teacherId === teacherId`) first,
   * then computes every metric solely from those assessments and their
   * associated submissions (Req 11.1):
   *  - `totalAttempts` — count of associated submissions (Req 11.3).
   *  - `averageScorePercent` — mean score percentage over finalized graded
   *    submissions; 0 when there are none (Req 11.4).
   *  - `scoreDistribution` — finalized graded submissions grouped into the
   *    configured score bands (Req 11.5).
   *  - `completionStatus` — counts of submissions by `gradingStatus` (Req 11.6).
   *  - `completionRatePercent` — submissions divided by active enrolled
   *    students (via `Enrollment`); omitted when there are no resolvable active
   *    enrollments (Req 11.8).
   *  - `passRatePercent` — share of finalized graded submissions scoring at or
   *    above `PASS_THRESHOLD`; omitted when there are none (Req 11.8).
   *
   * Assessments with no associated submissions contribute zeroed metrics
   * (Req 11.7).
   *
   * @param teacherId the authenticated faculty member's id (from `req.user`)
   */
  async compute(teacherId: string): Promise<QuizAnalytics> {
    // 1. Resolve the teacher's own assessments (Req 11.1, 11.2).
    const assessments = await Assessment.find({
      teacherId: new Types.ObjectId(teacherId),
    })
      .select('_id title courseId')
      .lean()
      .exec();

    // No assessments → fully zeroed analytics with no per-assessment rows.
    if (assessments.length === 0) {
      logger.info('Computed quiz analytics (no assessments)', redactSecrets({ teacherId }));
      return {
        totalAttempts: 0,
        averageScorePercent: 0,
        scoreDistribution: emptyScoreDistribution(),
        completionStatus: emptyCompletionStatus(),
        perAssessment: [],
      };
    }

    const assessmentIds = assessments.map((a) => a._id as Types.ObjectId);

    // 2. Load every submission associated with those assessments (Req 11.1).
    const submissions = await Submission.find({
      assessmentId: { $in: assessmentIds },
    })
      .lean()
      .exec();

    // Group submissions by their assessment id for the per-assessment rollup.
    const submissionsByAssessment = new Map<string, ISubmission[]>();
    for (const submission of submissions as ISubmission[]) {
      const key = String(submission.assessmentId);
      const bucket = submissionsByAssessment.get(key);
      if (bucket) {
        bucket.push(submission);
      } else {
        submissionsByAssessment.set(key, [submission]);
      }
    }

    // 3. Resolve active-enrollment denominators per assessment's course
    // (Req 11.8). A course with zero active enrollments yields no
    // completion-rate denominator, so the metric is omitted for that assessment.
    const courseIds = Array.from(
      new Set(assessments.map((a) => String(a.courseId))),
    );
    const enrollmentByCourse = new Map<string, number>();
    await Promise.all(
      courseIds.map(async (courseId) => {
        const count = await Enrollment.countDocuments({
          course: new Types.ObjectId(courseId),
          status: 'active',
        }).exec();
        enrollmentByCourse.set(courseId, count);
      }),
    );

    // 4. Build per-assessment analytics.
    let totalCompletionDenominator = 0;
    const perAssessment: AssessmentAnalytics[] = assessments.map((assessment) => {
      const assessmentId = String(assessment._id);
      const own = submissionsByAssessment.get(assessmentId) ?? [];
      const metrics = computeSubmissionMetrics(own);

      const row: AssessmentAnalytics = {
        assessmentId,
        title: assessment.title,
        totalAttempts: metrics.totalAttempts,
        averageScorePercent: metrics.averageScorePercent,
        scoreDistribution: metrics.scoreDistribution,
        completionStatus: metrics.completionStatus,
      };

      if (metrics.passRatePercent !== undefined) {
        row.passRatePercent = metrics.passRatePercent;
      }

      const activeEnrolled = enrollmentByCourse.get(String(assessment.courseId)) ?? 0;
      if (activeEnrolled > 0) {
        totalCompletionDenominator += activeEnrolled;
        row.completionRatePercent = round2((own.length / activeEnrolled) * 100);
      }

      return row;
    });

    // 5. Aggregate metrics across all submissions (Req 11.3–11.6).
    const aggregate = computeSubmissionMetrics(submissions as ISubmission[]);

    const result: QuizAnalytics = {
      totalAttempts: aggregate.totalAttempts,
      averageScorePercent: aggregate.averageScorePercent,
      scoreDistribution: aggregate.scoreDistribution,
      completionStatus: aggregate.completionStatus,
      perAssessment,
    };

    if (aggregate.passRatePercent !== undefined) {
      result.passRatePercent = aggregate.passRatePercent;
    }

    // Aggregate completion rate uses the summed active-enrollment denominator
    // across the teacher's courses; omitted when none is resolvable (Req 11.8).
    if (totalCompletionDenominator > 0) {
      result.completionRatePercent = round2(
        (aggregate.totalAttempts / totalCompletionDenominator) * 100,
      );
    }

    logger.info(
      'Computed quiz analytics',
      redactSecrets({
        teacherId,
        assessmentCount: assessments.length,
        submissionCount: submissions.length,
      }),
    );

    return result;
  }
}

/** Singleton instance for convenience, mirroring the other service modules. */
export const quizAnalyticsService = new QuizAnalyticsService();
