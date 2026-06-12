/**
 * Property 3: Pagination metadata is consistent across all paginated endpoints.
 *
 * For any collection of records and any `page`/`limit`, the response
 * `meta.total` equals the total number of in-scope records, the returned `data`
 * length is at most `limit`, and the returned slice equals the records at
 * offset `(page-1)*limit` of the fully ordered in-scope set.
 *
 * This is exercised against two representative paginated services that share
 * the same pagination contract:
 *   - `feedbackService.listOwn`  — author-scoped, ordered by `createdAt` desc
 *     (Requirement 7.3),
 *   - `parentService.list`        — admin parents list, ordered by `createdAt`
 *     desc (Requirement 10.1).
 *
 * Records are given strictly distinct `createdAt` values so the "fully ordered
 * in-scope set" is unambiguous and the returned slice can be compared exactly
 * by identifier. Out-of-scope decoys (a different author / soft-deleted) are
 * seeded for the feedback case and must never count toward `total` or appear in
 * any page.
 *
 * Feature: communication-feedback-and-admin-apis, Property 3: Pagination metadata is consistent across all paginated endpoints
 *
 * **Validates: Requirements 1.4, 2.4, 7.3, 10.1**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';

import Feedback from '../../src/models/Feedback.js';
import Parent from '../../src/models/Parent.js';
import { feedbackService } from '../../src/services/feedbackService.js';
import { parentService } from '../../src/services/parentService.js';

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
  await Parent.deleteMany({});
});

// Distinct, increasing base instant so each seeded record gets a unique
// `createdAt` (base + index). A larger index ⇒ later instant ⇒ earlier in the
// `createdAt` descending order the services use.
const BASE_TIME = Date.parse('2024-01-01T00:00:00.000Z');

function createdAtFor(index: number): Date {
  return new Date(BASE_TIME + index * 1000);
}

// ---------------------------------------------------------------------------
// feedbackService.listOwn
// ---------------------------------------------------------------------------

/**
 * One seeded feedback record. `kind` decides whether the record is part of the
 * author's in-scope corpus or a decoy that must be ignored.
 */
interface FeedbackSpec {
  kind: 'own' | 'otherAuthor' | 'deleted';
}

const feedbackSpecArb: fc.Arbitrary<FeedbackSpec> = fc.record({
  kind: fc.constantFrom<FeedbackSpec['kind']>('own', 'otherAuthor', 'deleted'),
});

describe('Property 3: Pagination metadata is consistent across all paginated endpoints', () => {
  it('feedbackService.listOwn: meta.total, page bound, and slice match the ordered in-scope set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(feedbackSpecArb, { minLength: 0, maxLength: 30 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 50 }),
        async (corpus, page, limit) => {
          await Feedback.deleteMany({});

          const authorId = new mongoose.Types.ObjectId();
          const otherAuthorId = new mongoose.Types.ObjectId();
          const targetId = new mongoose.Types.ObjectId();

          // Pre-generate ids so the reference slice can be compared exactly.
          const docs = corpus.map((spec, index) => {
            const _id = new mongoose.Types.ObjectId();
            const isOwn = spec.kind === 'own' || spec.kind === 'deleted';
            const createdAt = createdAtFor(index);
            return {
              _id,
              authorId: isOwn ? authorId : otherAuthorId,
              authorModel: 'Student' as const,
              authorRole: 'student' as const,
              targetType: 'teacher' as const,
              targetModel: 'Faculty' as const,
              targetId,
              rating: 5,
              comment: 'pagination seed',
              isDeleted: spec.kind === 'deleted',
              deletedAt: spec.kind === 'deleted' ? createdAt : null,
              createdAt,
              updatedAt: createdAt,
              // The spec's index drives both the seeded createdAt and the
              // reference ordering below.
              _index: index,
            };
          });

          if (docs.length > 0) {
            // timestamps:false so our explicit, distinct createdAt values are
            // preserved rather than overwritten with `now`.
            await Feedback.insertMany(
              docs.map(({ _index: _ignored, ...d }) => d),
              { timestamps: false },
            );
          }

          // Independent reference: only the author's own, non-deleted feedback,
          // ordered by createdAt descending (i.e. index descending).
          const inScope = docs
            .filter((d) => String(d.authorId) === String(authorId) && !d.isDeleted)
            .sort((a, b) => b._index - a._index)
            .map((d) => String(d._id));

          const result = await feedbackService.listOwn(
            String(authorId),
            'student',
            page,
            limit,
          );

          // meta.total equals the total number of in-scope records.
          expect(result.total).toBe(inScope.length);

          // Returned data length is at most the requested limit.
          expect(result.data.length).toBeLessThanOrEqual(limit);

          // The returned slice equals the records at offset (page-1)*limit of
          // the fully ordered in-scope set.
          const start = (page - 1) * limit;
          const expectedIds = inScope.slice(start, start + limit);
          expect(result.data.map((f) => f.id)).toEqual(expectedIds);
        },
      ),
      { numRuns: 100 },
    );
  }, 300000);

  // -------------------------------------------------------------------------
  // parentService.list
  // -------------------------------------------------------------------------

  it('parentService.list: meta.total, page bound, and slice match the ordered in-scope set', async () => {
    let suffixCounter = 0;

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 25 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 100 }),
        async (count, page, limit) => {
          await Parent.deleteMany({});

          const docs = Array.from({ length: count }, (_unused, index) => {
            const _id = new mongoose.Types.ObjectId();
            const createdAt = createdAtFor(index);
            suffixCounter += 1;
            return {
              _id,
              parentId: `PAR-${Date.now()}-${suffixCounter}`,
              firstName: 'Parent',
              lastName: `Number${index}`,
              relationToStudent: 'Other' as const,
              isActive: true,
              isVerified: false,
              isDemo: false,
              failedLoginAttempts: 0,
              deletedAt: null,
              createdAt,
              updatedAt: createdAt,
              _index: index,
            };
          });

          if (docs.length > 0) {
            await Parent.insertMany(
              docs.map(({ _index: _ignored, ...d }) => d),
              { timestamps: false },
            );
          }

          // Reference: every parent is in scope (no filters), ordered by
          // createdAt descending (index descending).
          const inScope = [...docs]
            .sort((a, b) => b._index - a._index)
            .map((d) => String(d._id));

          const result = await parentService.list({}, { page, limit });

          // meta.total equals the total number of in-scope records.
          expect(result.meta.total).toBe(inScope.length);

          // Returned data length is at most the requested limit.
          expect(result.data.length).toBeLessThanOrEqual(limit);

          // The returned slice equals the records at offset (page-1)*limit of
          // the fully ordered in-scope set.
          const start = (page - 1) * limit;
          const expectedIds = inScope.slice(start, start + limit);
          expect(result.data.map((p) => p._id)).toEqual(expectedIds);
        },
      ),
      { numRuns: 100 },
    );
  }, 300000);
});
