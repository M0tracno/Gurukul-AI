/**
 * Property-Based Test: Own-feedback listing is author-scoped and ordered.
 *
 * Feature: communication-feedback-and-admin-apis, Property 13: Own-feedback listing is author-scoped and ordered
 *
 * Property 13: For any feedback corpus and any author, the own-feedback endpoint
 * returns only feedback authored by that author, ordered by descending
 * `createdAt`.
 *
 * Strategy: seed a feedback corpus authored by several distinct authors. Each
 * seeded document carries its own explicit `createdAt`, a random soft-delete
 * flag, and is attributed to one author drawn from a small fixed pool. A target
 * author is then chosen and `feedbackService.listOwn` is invoked with a page
 * size large enough to return the author's entire non-deleted set on page 1.
 * The returned page is compared against an independent reference: the documents
 * whose `authorId` equals the target author and whose `isDeleted` is false,
 * sorted by descending `createdAt`. This simultaneously verifies author
 * scoping (Requirements 7.1, 7.2), exclusion of soft-deleted feedback, and the
 * descending `createdAt` ordering (Requirement 7.4).
 *
 * **Validates: Requirements 7.1, 7.2, 7.4**
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

// A small fixed pool of authors so multiple feedback documents share authors,
// making the scoping non-trivial. Each author is a student author.
const AUTHOR_COUNT = 3;
const authorIds = Array.from({ length: AUTHOR_COUNT }, () =>
  new mongoose.Types.ObjectId(),
);

/**
 * One seeded feedback document: which author it belongs to, whether it is
 * soft-deleted, a non-negative time offset (seconds) combined with the index to
 * yield a unique `createdAt`, its rating, and whether it targets a teacher or a
 * course (irrelevant to scoping, varied for realism).
 */
const feedbackSpecArb = fc.record({
  authorIndex: fc.integer({ min: 0, max: AUTHOR_COUNT - 1 }),
  deleted: fc.boolean(),
  offsetSeconds: fc.integer({ min: 0, max: 100_000 }),
  rating: fc.integer({ min: 1, max: 5 }),
  targetIsTeacher: fc.boolean(),
});

// A fixed base time; per-document offsets and index are added on top of it.
const BASE_TIME = Date.UTC(2024, 0, 1, 0, 0, 0);

// ---------------------------------------------------------------------------
// Property 13
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 13: Own-feedback listing is author-scoped and ordered
describe('Property 13: Own-feedback listing is author-scoped and ordered', () => {
  it('returns only the target author\'s non-deleted feedback ordered by createdAt desc', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(feedbackSpecArb, { minLength: 1, maxLength: 15 }),
        fc.integer({ min: 0, max: AUTHOR_COUNT - 1 }),
        async (specs, targetAuthorIndex) => {
          // Fresh corpus per run so counts/ordering are deterministic.
          await Feedback.deleteMany({});

          // Build docs with explicit, unique createdAt values. Adding the index
          // guarantees uniqueness even when two offsets collide.
          const docs = specs.map((spec, index) => {
            const createdAt = new Date(
              BASE_TIME + spec.offsetSeconds * 1000 + index,
            );
            return {
              authorId: authorIds[spec.authorIndex],
              authorModel: 'Student' as const,
              authorRole: 'student' as const,
              targetType: spec.targetIsTeacher
                ? ('teacher' as const)
                : ('course' as const),
              targetModel: spec.targetIsTeacher
                ? ('Faculty' as const)
                : ('Course' as const),
              targetId: new mongoose.Types.ObjectId(),
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

          const targetAuthorId = authorIds[targetAuthorIndex];

          // Independent reference: the target author's non-deleted feedback,
          // descending by createdAt (tie-broken by createdAt uniqueness).
          const expectedOrderedIds = inserted
            .filter(
              (_doc, i) =>
                specs[i].authorIndex === targetAuthorIndex && !specs[i].deleted,
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((doc) => String(doc._id));

          // Use a large limit so the entire non-deleted set fits on page 1.
          const result = await feedbackService.listOwn(
            String(targetAuthorId),
            'student',
            1,
            100,
          );

          const returnedIds = result.data.map((f) => f.id);

          // The page equals exactly the target author's non-deleted feedback in
          // descending order (Requirements 7.1, 7.4).
          expect(returnedIds).toEqual(expectedOrderedIds);

          // Every returned document is authored by the target author only
          // (Requirements 7.1, 7.2) and is not soft-deleted.
          for (const item of result.data) {
            expect(item.authorId).toBe(String(targetAuthorId));
          }

          // No returned document corresponds to a soft-deleted record.
          const deletedIds = new Set(
            inserted
              .filter((_doc, i) => specs[i].deleted)
              .map((doc) => String(doc._id)),
          );
          // No returned document belongs to a different author.
          const otherAuthorIds = new Set(
            inserted
              .filter((_doc, i) => specs[i].authorIndex !== targetAuthorIndex)
              .map((doc) => String(doc._id)),
          );
          for (const id of returnedIds) {
            expect(deletedIds.has(id)).toBe(false);
            expect(otherAuthorIds.has(id)).toBe(false);
          }

          // The returned createdAt sequence is non-increasing (descending order).
          for (let i = 1; i < result.data.length; i++) {
            expect(result.data[i].createdAt.getTime()).toBeLessThanOrEqual(
              result.data[i - 1].createdAt.getTime(),
            );
          }

          // total counts only the target author's non-deleted feedback.
          expect(result.total).toBe(expectedOrderedIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
