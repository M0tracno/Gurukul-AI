/**
 * Property-Based Test: Received-feedback listing is target-scoped and ordered.
 *
 * Feature: communication-feedback-and-admin-apis, Property 14: Received-feedback listing is target-scoped and ordered
 *
 * Property 14: For any feedback corpus and any teacher, the received-feedback
 * endpoint returns only feedback whose `targetType` is `teacher` and whose
 * `targetId` is that teacher, ordered by descending `createdAt`.
 *
 * Strategy: seed a feedback corpus spread across several distinct teachers and
 * across course targets, with a random soft-delete flag per document. Each
 * seeded document carries its own explicit `createdAt` (unique via a per-index
 * tiebreak). A target teacher is then chosen and `feedbackService.listReceived`
 * is invoked with a page size large enough to return the teacher's entire
 * non-deleted teacher-targeted set on page 1. The returned page is compared
 * against an independent reference: the documents whose `targetType` is
 * `teacher`, whose `targetId` equals the target teacher, and whose `isDeleted`
 * is false, sorted by descending `createdAt`. This simultaneously verifies
 * target scoping by both type and id (Requirements 8.1, 8.3), exclusion of
 * course-targeted and soft-deleted feedback, and the descending `createdAt`
 * ordering (Requirement 8.4).
 *
 * **Validates: Requirements 8.1, 8.3, 8.4**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { feedbackService } from './feedbackService.js';
import Feedback from '../models/Feedback.js';

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
  await Feedback.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// A small fixed pool of teachers so multiple feedback documents share teacher
// targets, making the scoping non-trivial. A separate pool of course ids lets
// some feedback target courses instead of teachers.
const TEACHER_COUNT = 3;
const teacherIds = Array.from({ length: TEACHER_COUNT }, () =>
  new mongoose.Types.ObjectId(),
);

const COURSE_COUNT = 2;
const courseIds = Array.from({ length: COURSE_COUNT }, () =>
  new mongoose.Types.ObjectId(),
);

/**
 * One seeded feedback document:
 * - `targetIsTeacher`: whether it targets a teacher (in scope) or a course.
 * - `teacherIndex`/`courseIndex`: which teacher/course it targets.
 * - `deleted`: whether it is soft-deleted (must be excluded).
 * - `offsetSeconds`: combined with the index to yield a unique `createdAt`.
 * - `rating`/`authorIsStudent`: varied for realism, irrelevant to scoping.
 */
const feedbackSpecArb = fc.record({
  targetIsTeacher: fc.boolean(),
  teacherIndex: fc.integer({ min: 0, max: TEACHER_COUNT - 1 }),
  courseIndex: fc.integer({ min: 0, max: COURSE_COUNT - 1 }),
  deleted: fc.boolean(),
  offsetSeconds: fc.integer({ min: 0, max: 100_000 }),
  rating: fc.integer({ min: 1, max: 5 }),
  authorIsStudent: fc.boolean(),
});

// A fixed base time; per-document offsets and index are added on top of it.
const BASE_TIME = Date.UTC(2024, 0, 1, 0, 0, 0);

// ---------------------------------------------------------------------------
// Property 14
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 14: Received-feedback listing is target-scoped and ordered
describe('Property 14: Received-feedback listing is target-scoped and ordered', () => {
  it('returns only the target teacher\'s non-deleted teacher-targeted feedback ordered by createdAt desc', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(feedbackSpecArb, { minLength: 1, maxLength: 15 }),
        fc.integer({ min: 0, max: TEACHER_COUNT - 1 }),
        async (specs, targetTeacherIndex) => {
          // Fresh corpus per run so counts/ordering are deterministic.
          await Feedback.deleteMany({});

          // Build docs with explicit, unique createdAt values. Adding the index
          // guarantees uniqueness even when two offsets collide.
          const docs = specs.map((spec, index) => {
            const createdAt = new Date(
              BASE_TIME + spec.offsetSeconds * 1000 + index,
            );
            const targetType = spec.targetIsTeacher
              ? ('teacher' as const)
              : ('course' as const);
            const targetId = spec.targetIsTeacher
              ? teacherIds[spec.teacherIndex]
              : courseIds[spec.courseIndex];
            return {
              authorId: new mongoose.Types.ObjectId(),
              authorModel: spec.authorIsStudent
                ? ('Student' as const)
                : ('Parent' as const),
              authorRole: spec.authorIsStudent
                ? ('student' as const)
                : ('parent' as const),
              targetType,
              targetModel: spec.targetIsTeacher
                ? ('Faculty' as const)
                : ('Course' as const),
              targetId,
              rating: spec.rating,
              comment: `Comment ${index}`,
              isDeleted: spec.deleted,
              ...(spec.deleted
                ? { deletedAt: new Date(createdAt.getTime() + 1) }
                : {}),
              createdAt,
              updatedAt: createdAt,
            };
          });

          // insertMany with timestamps disabled so our explicit createdAt values
          // are preserved instead of being overwritten by the timestamp plugin.
          const inserted = await Feedback.insertMany(docs, {
            timestamps: false,
          });

          const targetTeacherId = teacherIds[targetTeacherIndex];

          // Independent reference: feedback whose target is the chosen teacher
          // (targetType === 'teacher' AND targetId === teacher) and that is not
          // soft-deleted, descending by createdAt (tie-broken by uniqueness).
          const isInScope = (i: number): boolean =>
            specs[i].targetIsTeacher &&
            specs[i].teacherIndex === targetTeacherIndex &&
            !specs[i].deleted;

          const expectedOrderedIds = inserted
            .filter((_doc, i) => isInScope(i))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((doc) => String(doc._id));

          // Use a large limit so the entire in-scope set fits on page 1.
          const result = await feedbackService.listReceived(
            String(targetTeacherId),
            1,
            100,
          );

          const returnedIds = result.data.map((f) => f.id);

          // The page equals exactly the teacher's non-deleted teacher-targeted
          // feedback in descending order (Requirements 8.1, 8.3, 8.4).
          expect(returnedIds).toEqual(expectedOrderedIds);

          // Every returned document targets the chosen teacher only
          // (Requirements 8.1, 8.3).
          for (const item of result.data) {
            expect(item.targetType).toBe('teacher');
            expect(item.targetId).toBe(String(targetTeacherId));
          }

          // No returned document corresponds to a soft-deleted record, a
          // course target, or a different teacher.
          const deletedIds = new Set(
            inserted
              .filter((_doc, i) => specs[i].deleted)
              .map((doc) => String(doc._id)),
          );
          const courseTargetedIds = new Set(
            inserted
              .filter((_doc, i) => !specs[i].targetIsTeacher)
              .map((doc) => String(doc._id)),
          );
          const otherTeacherIds = new Set(
            inserted
              .filter(
                (_doc, i) =>
                  specs[i].targetIsTeacher &&
                  specs[i].teacherIndex !== targetTeacherIndex,
              )
              .map((doc) => String(doc._id)),
          );
          for (const id of returnedIds) {
            expect(deletedIds.has(id)).toBe(false);
            expect(courseTargetedIds.has(id)).toBe(false);
            expect(otherTeacherIds.has(id)).toBe(false);
          }

          // The returned createdAt sequence is non-increasing (descending).
          for (let i = 1; i < result.data.length; i++) {
            expect(result.data[i].createdAt.getTime()).toBeLessThanOrEqual(
              result.data[i - 1].createdAt.getTime(),
            );
          }

          // total counts only the teacher's non-deleted teacher-targeted set.
          expect(result.total).toBe(expectedOrderedIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
