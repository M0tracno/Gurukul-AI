/**
 * Property 15: Feedback statistics equal an independent reference computation.
 *
 * For any feedback corpus and any teacher, the `Feedback_Stats` returned by
 * `feedbackService.listReceived` equal the independently computed reference
 * values over that teacher's non-deleted, teacher-targeted feedback:
 *   - `total` is the count of those feedback,
 *   - `positive` is the count with `rating >= POSITIVE_THRESHOLD`,
 *   - `needsAttention` is the count with `rating <= NEEDS_ATTENTION_THRESHOLD`,
 *   - `averageRating` is the mean rating (exactly 0 when `total` is 0).
 *
 * Soft-deleted feedback, feedback targeting another teacher, and course-targeted
 * feedback are seeded as decoys and must never influence the statistics.
 *
 * Feature: communication-feedback-and-admin-apis, Property 15: Feedback statistics equal an independent reference computation
 *
 * **Validates: Requirements 8.2, 8.5**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';

import Feedback from '../../src/models/Feedback.js';
import { feedbackService } from '../../src/services/feedbackService.js';
import { POSITIVE_THRESHOLD, NEEDS_ATTENTION_THRESHOLD } from '../../src/config/index.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Feedback.deleteMany({});
});

/**
 * One seeded feedback record. `kind` decides whether the record is part of the
 * teacher's counted corpus or a decoy that must be ignored by the stats.
 */
interface FeedbackSpec {
  rating: number;
  kind: 'target' | 'deleted' | 'otherTeacher' | 'course';
}

const specArb: fc.Arbitrary<FeedbackSpec> = fc.record({
  // Cover the full [1, 5] scale, including the threshold boundaries.
  rating: fc.integer({ min: 1, max: 5 }),
  kind: fc.constantFrom<FeedbackSpec['kind']>(
    'target',
    'deleted',
    'otherTeacher',
    'course',
  ),
});

// Corpora that include the empty case (total === 0) so the exact-0 average is
// exercised, up to a moderate size to keep the suite fast.
const corpusArb = fc.array(specArb, { minLength: 0, maxLength: 30 });

describe('Property 15: Feedback statistics equal an independent reference computation', () => {
  it('returned stats equal a reference computation over the teacher non-deleted feedback', async () => {
    await fc.assert(
      fc.asyncProperty(corpusArb, async (corpus) => {
        await Feedback.deleteMany({});

        // The teacher under test, plus a distinct decoy teacher and a course.
        const teacherId = new mongoose.Types.ObjectId();
        const otherTeacherId = new mongoose.Types.ObjectId();
        const courseId = new mongoose.Types.ObjectId();

        const docs = corpus.map((spec) => {
          const base = {
            authorId: new mongoose.Types.ObjectId(),
            authorModel: 'Student' as const,
            authorRole: 'student' as const,
            rating: spec.rating,
            comment: 'reference computation seed',
            isDeleted: false,
          };
          switch (spec.kind) {
            case 'target':
              return {
                ...base,
                targetType: 'teacher' as const,
                targetModel: 'Faculty' as const,
                targetId: teacherId,
              };
            case 'deleted':
              return {
                ...base,
                targetType: 'teacher' as const,
                targetModel: 'Faculty' as const,
                targetId: teacherId,
                isDeleted: true,
                deletedAt: new Date(),
              };
            case 'otherTeacher':
              return {
                ...base,
                targetType: 'teacher' as const,
                targetModel: 'Faculty' as const,
                targetId: otherTeacherId,
              };
            case 'course':
            default:
              return {
                ...base,
                targetType: 'course' as const,
                targetModel: 'Course' as const,
                targetId: courseId,
              };
          }
        });

        if (docs.length > 0) {
          await Feedback.insertMany(docs);
        }

        // Independent reference: only this teacher's non-deleted, teacher-targeted
        // feedback counts. Decoys (deleted / other teacher / course) are excluded.
        const counted = corpus.filter((s) => s.kind === 'target');
        const expectedTotal = counted.length;
        const expectedPositive = counted.filter(
          (s) => s.rating >= POSITIVE_THRESHOLD,
        ).length;
        const expectedNeedsAttention = counted.filter(
          (s) => s.rating <= NEEDS_ATTENTION_THRESHOLD,
        ).length;
        const expectedAverage =
          expectedTotal > 0
            ? counted.reduce((sum, s) => sum + s.rating, 0) / expectedTotal
            : 0;

        const { stats } = await feedbackService.listReceived(
          String(teacherId),
          1,
          100,
        );

        expect(stats.total).toBe(expectedTotal);
        expect(stats.positive).toBe(expectedPositive);
        expect(stats.needsAttention).toBe(expectedNeedsAttention);
        expect(stats.averageRating).toBeCloseTo(expectedAverage, 10);

        // total === 0 must yield an average of exactly 0 (Requirement 8.5).
        if (expectedTotal === 0) {
          expect(stats.averageRating).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  }, 300000);
});
