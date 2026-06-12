/**
 * Property-Based Test: Quiz analytics equal an independent reference computation.
 *
 * Feature: communication-feedback-and-admin-apis, Property 20: Quiz analytics equal an independent reference computation over only the teacher's data
 *
 * Property 20: For any corpus of assessments and submissions and any teacher,
 * the computed analytics use only the teacher's assessments (`teacherId`
 * equals the authenticated user) and their associated submissions, and
 * `totalAttempts`, `averageScorePercent`, `scoreDistribution`, and
 * `completionStatus` equal the values produced by an independent reference
 * implementation over that filtered data — including that the score-distribution
 * band counts and the completion-status counts each sum to the number of
 * submissions they range over.
 *
 * The corpus seeds assessments for BOTH the target teacher and a second
 * (decoy) teacher, plus submissions distributed across all of them, so that a
 * correct implementation must exclude the decoy teacher's assessments and
 * their submissions entirely.
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { quizAnalyticsService } from './quizAnalyticsService.js';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import type { GradingStatus } from '../models/Submission.js';
import { SCORE_BANDS } from '../config/index.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([Assessment.deleteMany({}), Submission.deleteMany({})]);
});

// ---------------------------------------------------------------------------
// Independent reference implementation
//
// Written independently of the service under test. Operates purely over the
// teacher-filtered submissions and re-derives every metric from first
// principles so the test does not just mirror the service's helpers.
// ---------------------------------------------------------------------------

const GRADING_STATUSES: readonly GradingStatus[] = [
  'queued',
  'processing',
  'completed',
  'failed',
];

interface RefGradedAnswer {
  score: number;
  maxScore: number;
}

interface RefSubmission {
  gradingStatus: GradingStatus;
  finalized: boolean;
  gradedAnswers?: RefGradedAnswer[];
}

/** Independent band lookup: clamp to [0,100], round, find the containing band. */
function referenceBandLabel(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const band = SCORE_BANDS.find((b) => clamped >= b.min && clamped <= b.max);
  return band ? band.label : SCORE_BANDS[SCORE_BANDS.length - 1].label;
}

function referenceCompute(submissions: RefSubmission[]): {
  totalAttempts: number;
  averageScorePercent: number;
  scoreDistribution: Record<string, number>;
  completionStatus: Record<GradingStatus, number>;
} {
  // completionStatus counts EVERY submission by its grading status.
  const completionStatus: Record<GradingStatus, number> = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  for (const s of submissions) {
    completionStatus[s.gradingStatus] += 1;
  }

  // scoreDistribution + averageScorePercent range only over "finalized graded"
  // submissions: finalized, with graded answers whose total maxScore > 0.
  const scoreDistribution: Record<string, number> = {};
  for (const band of SCORE_BANDS) {
    scoreDistribution[band.label] = 0;
  }

  const percents: number[] = [];
  for (const s of submissions) {
    if (!s.finalized) continue;
    const graded = s.gradedAnswers ?? [];
    if (graded.length === 0) continue;
    const totalMax = graded.reduce((sum, a) => sum + a.maxScore, 0);
    if (totalMax <= 0) continue;
    const earned = graded.reduce((sum, a) => sum + a.score, 0);
    const percent = (earned / totalMax) * 100;
    percents.push(percent);
    scoreDistribution[referenceBandLabel(percent)] += 1;
  }

  const rawAvg =
    percents.length > 0 ? percents.reduce((sum, p) => sum + p, 0) / percents.length : 0;
  const averageScorePercent = Math.round(rawAvg * 100) / 100;

  return {
    totalAttempts: submissions.length,
    averageScorePercent,
    scoreDistribution,
    completionStatus,
  };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const gradingStatusArb: fc.Arbitrary<GradingStatus> = fc.constantFrom(
  ...GRADING_STATUSES,
);

// A graded answer: maxScore in [0,20], score in [0, maxScore].
const gradedAnswerArb: fc.Arbitrary<RefGradedAnswer> = fc
  .record({ maxScore: fc.integer({ min: 0, max: 20 }), scoreSeed: fc.integer({ min: 0, max: 20 }) })
  .map(({ maxScore, scoreSeed }) => ({ maxScore, score: Math.min(scoreSeed, maxScore) }));

interface RawSubmission {
  assessmentPick: number;
  gradingStatus: GradingStatus;
  finalized: boolean;
  gradedAnswers?: RefGradedAnswer[];
}

const rawSubmissionArb: fc.Arbitrary<RawSubmission> = fc.record({
  // Used to deterministically map the submission onto one of the seeded
  // assessments (target or decoy) via modulo at build time.
  assessmentPick: fc.nat({ max: 10_000 }),
  gradingStatus: gradingStatusArb,
  finalized: fc.boolean(),
  // undefined (never graded), empty array, or a few graded answers — exercises
  // the "finalized graded" gate including the totalMax === 0 edge case.
  gradedAnswers: fc.option(fc.array(gradedAnswerArb, { maxLength: 4 }), { nil: undefined }),
});

const corpusArb = fc.record({
  targetAssessmentCount: fc.integer({ min: 0, max: 4 }),
  decoyAssessmentCount: fc.integer({ min: 0, max: 4 }),
  submissions: fc.array(rawSubmissionArb, { maxLength: 30 }),
});

// ---------------------------------------------------------------------------
// Property 20
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 20: Quiz analytics equal an independent reference computation over only the teacher's data
describe('Property 20: Quiz analytics equal an independent reference computation over only the teacher\'s data', () => {
  it('computes totalAttempts, averageScorePercent, scoreDistribution, and completionStatus from only the teacher\'s assessments and their submissions', async () => {
    await fc.assert(
      fc.asyncProperty(corpusArb, async (corpus) => {
        await Promise.all([Assessment.deleteMany({}), Submission.deleteMany({})]);

        const targetTeacherId = new Types.ObjectId();
        const decoyTeacherId = new Types.ObjectId();

        const now = Date.now();

        // Build assessment docs for both teachers with known _ids.
        const buildAssessment = (teacherId: Types.ObjectId, idx: number) => ({
          _id: new Types.ObjectId(),
          courseId: new Types.ObjectId(),
          teacherId,
          title: `Assessment ${teacherId.toString().slice(-4)}-${idx}`,
          questions: [
            { questionId: 'q1', prompt: 'Prompt', type: 'objective' as const, maxScore: 10 },
          ],
          opensAt: new Date(now),
          closesAt: new Date(now + 86_400_000),
        });

        const targetAssessments = Array.from(
          { length: corpus.targetAssessmentCount },
          (_, i) => buildAssessment(targetTeacherId, i),
        );
        const decoyAssessments = Array.from(
          { length: corpus.decoyAssessmentCount },
          (_, i) => buildAssessment(decoyTeacherId, i),
        );
        const allAssessments = [...targetAssessments, ...decoyAssessments];

        if (allAssessments.length > 0) {
          await Assessment.insertMany(allAssessments);
        }

        // Map each raw submission onto a concrete assessment (or drop it when
        // there are no assessments at all to reference).
        const targetIdSet = new Set(targetAssessments.map((a) => a._id.toString()));
        const seededSubmissions: Array<{
          assessmentId: Types.ObjectId;
          studentId: Types.ObjectId;
          answers: never[];
          submittedAt: Date;
          gradingStatus: GradingStatus;
          finalized: boolean;
          gradedAnswers?: Array<{
            questionId: string;
            score: number;
            maxScore: number;
            overriddenByTeacher: boolean;
          }>;
        }> = [];
        const targetRefSubmissions: RefSubmission[] = [];

        for (const raw of corpus.submissions) {
          if (allAssessments.length === 0) break;
          const assessment = allAssessments[raw.assessmentPick % allAssessments.length];
          const doc = {
            assessmentId: assessment._id,
            studentId: new Types.ObjectId(),
            answers: [] as never[],
            submittedAt: new Date(now),
            gradingStatus: raw.gradingStatus,
            finalized: raw.finalized,
            // Persist with the schema-required questionId/overriddenByTeacher
            // fields; only score/maxScore matter to the analytics computation.
            ...(raw.gradedAnswers !== undefined
              ? {
                  gradedAnswers: raw.gradedAnswers.map((ans, i) => ({
                    questionId: `q${i}`,
                    score: ans.score,
                    maxScore: ans.maxScore,
                    overriddenByTeacher: false,
                  })),
                }
              : {}),
          };
          seededSubmissions.push(doc);

          // Only the target teacher's submissions feed the reference.
          if (targetIdSet.has(assessment._id.toString())) {
            targetRefSubmissions.push({
              gradingStatus: raw.gradingStatus,
              finalized: raw.finalized,
              gradedAnswers: raw.gradedAnswers,
            });
          }
        }

        if (seededSubmissions.length > 0) {
          await Submission.insertMany(seededSubmissions);
        }

        // Compute via the service under test (scope = target teacher).
        const actual = await quizAnalyticsService.compute(targetTeacherId.toString());

        // Independent reference over ONLY the target teacher's submissions.
        const expected = referenceCompute(targetRefSubmissions);

        // ── Core equality of the four metrics ──────────────────────────────
        expect(actual.totalAttempts).toBe(expected.totalAttempts);
        expect(actual.averageScorePercent).toBe(expected.averageScorePercent);
        expect(actual.scoreDistribution).toEqual(expected.scoreDistribution);
        expect(actual.completionStatus).toEqual(expected.completionStatus);

        // ── Scoping: only the target teacher's assessments appear ──────────
        expect(actual.perAssessment).toHaveLength(targetAssessments.length);
        const reportedIds = new Set(actual.perAssessment.map((a) => a.assessmentId));
        for (const a of targetAssessments) {
          expect(reportedIds.has(a._id.toString())).toBe(true);
        }
        for (const d of decoyAssessments) {
          expect(reportedIds.has(d._id.toString())).toBe(false);
        }

        // ── Summation invariants ───────────────────────────────────────────
        // completionStatus counts sum to the total number of submissions.
        const completionSum = GRADING_STATUSES.reduce(
          (sum, st) => sum + actual.completionStatus[st],
          0,
        );
        expect(completionSum).toBe(actual.totalAttempts);
        expect(completionSum).toBe(targetRefSubmissions.length);

        // scoreDistribution band counts sum to the number of finalized graded
        // submissions they range over.
        const distributionSum = SCORE_BANDS.reduce(
          (sum, band) => sum + actual.scoreDistribution[band.label],
          0,
        );
        const finalizedGradedCount = targetRefSubmissions.filter((s) => {
          if (!s.finalized) return false;
          const graded = s.gradedAnswers ?? [];
          if (graded.length === 0) return false;
          return graded.reduce((sum, a) => sum + a.maxScore, 0) > 0;
        }).length;
        expect(distributionSum).toBe(finalizedGradedCount);
      }),
      { numRuns: 100 },
    );
  });
});
