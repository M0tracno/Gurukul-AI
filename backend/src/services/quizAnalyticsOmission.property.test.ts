/**
 * Property-Based Test: Unsourced analytics metrics are omitted, not fabricated.
 *
 * Feature: communication-feedback-and-admin-apis, Property 21: Unsourced analytics metrics are omitted rather than fabricated
 *
 * Property 21: For any teacher whose data lacks the source needed for a metric
 * — no resolvable active enrollments for `completionRatePercent`, or no
 * finalized graded submissions for `passRatePercent` — that metric key is
 * ABSENT from the response rather than present with a fabricated or zero value.
 *
 * The test seeds, for a single teacher / course / assessment, independently
 * controlled scenarios:
 *  - active enrollments present or absent (with non-active enrollments as
 *    decoys that must never count as a denominator), and
 *  - finalized graded submissions present or absent (with non-finalized
 *    submissions as decoys that must never feed pass rate).
 *
 * It then asserts each assumption-gated metric key is present exactly when its
 * source data exists, and is literally absent (not `0`, not `undefined`-valued)
 * otherwise — at both the aggregate and per-assessment levels.
 *
 * **Validates: Requirements 11.8**
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { quizAnalyticsService } from './quizAnalyticsService.js';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import Enrollment from '../models/Enrollment.js';
import type { GradingStatus } from '../models/Submission.js';

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

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const NON_ACTIVE_STATUSES = ['completed', 'withdrawn', 'failed'] as const;
const GRADING_STATUSES: readonly GradingStatus[] = [
  'queued',
  'processing',
  'completed',
  'failed',
];

interface Scenario {
  /** Number of `active` enrollments for the course (the only valid denominator). */
  activeEnrollmentCount: number;
  /** Non-active enrollments — decoys that must never serve as a denominator. */
  inactiveEnrollmentCount: number;
  /** Submissions that ARE finalized + graded with positive max score (feed pass rate). */
  finalizedGradedCount: number;
  /** Submissions that are NOT finalized graded (never feed pass rate). */
  unfinalizedCount: number;
}

const scenarioArb: fc.Arbitrary<Scenario> = fc.record({
  activeEnrollmentCount: fc.integer({ min: 0, max: 5 }),
  inactiveEnrollmentCount: fc.integer({ min: 0, max: 3 }),
  finalizedGradedCount: fc.integer({ min: 0, max: 5 }),
  unfinalizedCount: fc.integer({ min: 0, max: 5 }),
});

const now = Date.now();

// ---------------------------------------------------------------------------
// Property 21
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 21: Unsourced analytics metrics are omitted rather than fabricated
describe('Property 21: Unsourced analytics metrics are omitted rather than fabricated', () => {
  it('omits completionRatePercent without active enrollments and passRatePercent without finalized graded submissions, and includes them when their source data exists', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        await Promise.all([
          Assessment.deleteMany({}),
          Submission.deleteMany({}),
          Enrollment.deleteMany({}),
        ]);

        const teacherId = new Types.ObjectId();
        const courseId = new Types.ObjectId();
        const assessmentId = new Types.ObjectId();

        // One assessment owned by the teacher so the metric keys CAN appear.
        await Assessment.create({
          _id: assessmentId,
          courseId,
          teacherId,
          title: 'Omission Scenario Assessment',
          questions: [
            { questionId: 'q1', prompt: 'Prompt', type: 'objective' as const, maxScore: 10 },
          ],
          opensAt: new Date(now),
          closesAt: new Date(now + 86_400_000),
        });

        // Active enrollments (valid denominator) + non-active decoys.
        const enrollments = [
          ...Array.from({ length: scenario.activeEnrollmentCount }, () => ({
            student: new Types.ObjectId(),
            course: courseId,
            status: 'active' as const,
          })),
          ...Array.from({ length: scenario.inactiveEnrollmentCount }, (_, i) => ({
            student: new Types.ObjectId(),
            course: courseId,
            status: NON_ACTIVE_STATUSES[i % NON_ACTIVE_STATUSES.length],
          })),
        ];
        if (enrollments.length > 0) {
          await Enrollment.insertMany(enrollments);
        }

        // Finalized graded submissions (feed pass rate) + unfinalized decoys.
        const submissions = [
          ...Array.from({ length: scenario.finalizedGradedCount }, (_, i) => ({
            assessmentId,
            studentId: new Types.ObjectId(),
            answers: [] as never[],
            submittedAt: new Date(now),
            gradingStatus: 'completed' as GradingStatus,
            finalized: true,
            gradedAnswers: [
              {
                questionId: 'q1',
                // Vary scores so pass rate is a real (non-degenerate) value.
                score: i % 2 === 0 ? 9 : 2,
                maxScore: 10,
                overriddenByTeacher: false,
              },
            ],
          })),
          ...Array.from({ length: scenario.unfinalizedCount }, () => ({
            assessmentId,
            studentId: new Types.ObjectId(),
            answers: [] as never[],
            submittedAt: new Date(now),
            gradingStatus:
              GRADING_STATUSES[Math.floor(Math.random() * GRADING_STATUSES.length)],
            // Not finalized → never a "finalized graded" submission.
            finalized: false,
          })),
        ];
        if (submissions.length > 0) {
          await Submission.insertMany(submissions);
        }

        const result = await quizAnalyticsService.compute(teacherId.toString());
        const row = result.perAssessment.find((a) => a.assessmentId === assessmentId.toString());
        expect(row).toBeDefined();

        const hasActiveEnrollment = scenario.activeEnrollmentCount > 0;
        const hasFinalizedGraded = scenario.finalizedGradedCount > 0;

        // ── completionRatePercent: gated on active enrollments ──────────────
        if (hasActiveEnrollment) {
          expect('completionRatePercent' in result).toBe(true);
          expect(typeof result.completionRatePercent).toBe('number');
          expect(Number.isFinite(result.completionRatePercent)).toBe(true);

          expect('completionRatePercent' in row!).toBe(true);
          expect(typeof row!.completionRatePercent).toBe('number');
        } else {
          // Absent — NOT present with a fabricated/zero value.
          expect('completionRatePercent' in result).toBe(false);
          expect(result.completionRatePercent).toBeUndefined();
          expect('completionRatePercent' in row!).toBe(false);
          expect(row!.completionRatePercent).toBeUndefined();
        }

        // ── passRatePercent: gated on finalized graded submissions ──────────
        if (hasFinalizedGraded) {
          expect('passRatePercent' in result).toBe(true);
          expect(typeof result.passRatePercent).toBe('number');
          expect(Number.isFinite(result.passRatePercent)).toBe(true);

          expect('passRatePercent' in row!).toBe(true);
          expect(typeof row!.passRatePercent).toBe('number');
        } else {
          // Absent — NOT present with a fabricated/zero value.
          expect('passRatePercent' in result).toBe(false);
          expect(result.passRatePercent).toBeUndefined();
          expect('passRatePercent' in row!).toBe(false);
          expect(row!.passRatePercent).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
