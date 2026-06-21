/**
 * Property-Based Test: Scope is always derived from the authenticated user,
 * never from client input.
 *
 * Feature: communication-feedback-and-admin-apis, Property 22: Scope is always derived from the authenticated user, never from client input
 *
 * Property 22: For any new endpoint and any additional client-supplied
 * identifier injected into the request body or query, the scoped result is
 * identical to the result obtained without that identifier; supplying a
 * foreign identifier never widens or changes the caller's scope.
 *
 * Strategy: seed a single feedback corpus that spreads documents across an
 * authenticated principal and a decoy principal — both as authors (for the
 * own-feedback listing) and as feedback targets (for the received-feedback
 * listing). Each document carries a unique, explicit `createdAt` and a random
 * soft-delete flag. The two real, HTTP-thin controllers
 * (`feedbackController.listOwn` and `feedbackController.listReceived`) are then
 * invoked twice for the SAME authenticated user via a fake `req`/`res`:
 *
 *   - a "clean" request whose body/query carry only pagination, and
 *   - an "injected" request that additionally smuggles the *decoy's*
 *     identifiers into the body and query under every plausible scope key
 *     (`userId`, `authorId`, `targetId`, `teacherId`, `role`).
 *
 * Because the controllers derive scope solely from `req.user`, the injected
 * decoy identifiers — which, if honored, would surface the decoy's records and
 * change the result — must have no effect. The property asserts the two
 * response envelopes are byte-for-byte equal, proving a foreign identifier
 * never widens or changes the caller's scope (Requirements 1.2, 6.4, 8.3,
 * 11.2, 12.5).
 *
 * **Validates: Requirements 1.2, 6.4, 8.3, 11.2, 12.5**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { feedbackController } from './feedbackController.js';
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
// Fixed principals: the authenticated user and a decoy whose identifiers are
// injected as foreign client input. The authenticated user acts both as an
// author (own-listing scope) and as a teacher target (received-listing scope).
// ---------------------------------------------------------------------------

const authAuthorId = new mongoose.Types.ObjectId();
const decoyAuthorId = new mongoose.Types.ObjectId();
const authTeacherId = new mongoose.Types.ObjectId();
const decoyTeacherId = new mongoose.Types.ObjectId();
const courseId = new mongoose.Types.ObjectId();

// ---------------------------------------------------------------------------
// Fake req/res harness — invokes a real controller handler and captures the
// `{ status, body }` it writes, or rejects if it forwards an error to `next`.
// ---------------------------------------------------------------------------

interface CapturedResponse {
  status: number;
  body: unknown;
}

function invokeController(
  handler: (req: Request, res: Response, next: (err?: unknown) => void) => Promise<void> | void,
  req: Partial<Request>,
): Promise<CapturedResponse> {
  return new Promise<CapturedResponse>((resolve, reject) => {
    let statusCode = 200;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        resolve({ status: statusCode, body: payload });
        return this;
      },
    } as unknown as Response;

    Promise.resolve(handler(req as Request, res, (err?: unknown) => reject(err ?? new Error('next called')))).catch(
      reject,
    );
  });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * One seeded feedback document:
 * - `byAuth`: authored by the authenticated user (true) or the decoy (false).
 * - `targetKind`: teacher-auth (in scope for received), teacher-decoy, or course.
 * - `deleted`: soft-deleted (must be excluded).
 * - `offsetSeconds`: combined with index for a unique `createdAt`.
 * - `rating`: varied for realism / stats.
 */
const feedbackSpecArb = fc.record({
  byAuth: fc.boolean(),
  targetKind: fc.constantFrom('teacherAuth', 'teacherDecoy', 'course'),
  deleted: fc.boolean(),
  offsetSeconds: fc.integer({ min: 0, max: 100_000 }),
  rating: fc.integer({ min: 1, max: 5 }),
});

const BASE_TIME = Date.UTC(2024, 0, 1, 0, 0, 0);

// ---------------------------------------------------------------------------
// Property 22
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 22: Scope is always derived from the authenticated user, never from client input
describe('Property 22: Scope is always derived from the authenticated user, never from client input', () => {
  it('ignores foreign identifiers injected into the body/query for own- and received-feedback listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(feedbackSpecArb, { minLength: 1, maxLength: 15 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 100 }),
        async (specs, page, limit) => {
          await Feedback.deleteMany({});

          const docs = specs.map((spec, index) => {
            const createdAt = new Date(BASE_TIME + spec.offsetSeconds * 1000 + index);
            const targetIsTeacher = spec.targetKind !== 'course';
            const targetId =
              spec.targetKind === 'teacherAuth'
                ? authTeacherId
                : spec.targetKind === 'teacherDecoy'
                  ? decoyTeacherId
                  : courseId;
            return {
              authorId: spec.byAuth ? authAuthorId : decoyAuthorId,
              authorModel: 'Student' as const,
              authorRole: 'student' as const,
              targetType: targetIsTeacher ? ('teacher' as const) : ('course' as const),
              targetModel: targetIsTeacher ? ('Faculty' as const) : ('Course' as const),
              targetId,
              rating: spec.rating,
              comment: `Comment ${index}`,
              isDeleted: spec.deleted,
              ...(spec.deleted ? { deletedAt: new Date(createdAt.getTime() + 1) } : {}),
              createdAt,
              updatedAt: createdAt,
            };
          });

          await Feedback.insertMany(docs, { timestamps: false });

          // ---- Own-feedback listing (author scope from req.user) ----------
          const ownClean = await invokeController(feedbackController.listOwn, {
            user: { userId: String(authAuthorId), role: 'student' },
            query: { page: String(page), limit: String(limit) },
            body: {},
          } as unknown as Partial<Request>);

          const ownInjected = await invokeController(feedbackController.listOwn, {
            user: { userId: String(authAuthorId), role: 'student' },
            // Smuggle the decoy author's id under every plausible scope key.
            query: {
              page: String(page),
              limit: String(limit),
              userId: String(decoyAuthorId),
              authorId: String(decoyAuthorId),
              role: 'teacher',
            },
            body: {
              userId: String(decoyAuthorId),
              authorId: String(decoyAuthorId),
            },
          } as unknown as Partial<Request>);

          // Foreign author id must not widen/change scope: identical envelopes.
          expect(ownInjected).toEqual(ownClean);

          // ---- Received-feedback listing (target scope from req.user) ------
          const receivedClean = await invokeController(feedbackController.listReceived, {
            user: { userId: String(authTeacherId), role: 'teacher' },
            query: { page: String(page), limit: String(limit) },
            body: {},
          } as unknown as Partial<Request>);

          const receivedInjected = await invokeController(feedbackController.listReceived, {
            user: { userId: String(authTeacherId), role: 'teacher' },
            // Smuggle the decoy teacher's id under every plausible scope key.
            query: {
              page: String(page),
              limit: String(limit),
              userId: String(decoyTeacherId),
              targetId: String(decoyTeacherId),
              teacherId: String(decoyTeacherId),
            },
            body: {
              userId: String(decoyTeacherId),
              targetId: String(decoyTeacherId),
              teacherId: String(decoyTeacherId),
            },
          } as unknown as Partial<Request>);

          // Foreign target id must not widen/change scope: identical envelopes.
          expect(receivedInjected).toEqual(receivedClean);
        },
      ),
      { numRuns: 100 },
    );
  });
});
