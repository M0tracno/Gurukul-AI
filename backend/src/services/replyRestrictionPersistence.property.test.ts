/**
 * Property-Based Test: Replying is restricted to the targeted teacher and
 * persists with the feedback.
 *
 * Feature: communication-feedback-and-admin-apis, Property 16: Replying is restricted to the targeted teacher and persists with the feedback
 *
 * Property 16: For any feedback, only the teacher who is its target can reply;
 * a successful reply is persisted and retrievable as part of that feedback
 * document, and any other authenticated teacher's reply attempt is rejected
 * with 403 and persists nothing.
 *
 * Strategy: seed a single teacher-targeted feedback document authored by a
 * student/parent. Two distinct teachers participate: the document's target and
 * a non-target. We invoke `feedbackService.reply` twice:
 *   1. The non-target teacher attempts to reply → expect an `AppError` with
 *      statusCode 403, and confirm nothing was persisted (the feedback's reply
 *      array is unchanged on a fresh read).
 *   2. The target teacher replies → expect success, and confirm the reply is
 *      persisted and retrievable as part of that feedback document with the
 *      responder/message round-tripping unchanged.
 * The order of the two attempts is randomized so that a rejection never leaves
 * a side effect regardless of when it occurs. This jointly verifies the
 * target-only restriction (Requirements 9.1, 9.2 — via 403 for the non-target)
 * and reply persistence/retrievability (Requirement 9.3).
 *
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { feedbackService } from './feedbackService.js';
import Feedback from '../models/Feedback.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuditContext } from '../utils/auditContext.js';

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
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal AuditContext for a given teacher actor. */
function auditCtxFor(teacherId: string): AuditContext {
  return {
    userId: teacherId,
    role: 'teacher',
    ip: '127.0.0.1',
    correlationId: new mongoose.Types.ObjectId().toString(),
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * One scenario: the seeded feedback (author kind + rating) plus the reply
 * messages each teacher would post and which teacher acts first.
 */
// The Feedback reply schema trims `message`, so generators produce strings that
// are already trimmed (and non-empty after trimming). This keeps the persisted
// value a faithful round-trip of the supplied message and avoids conflating
// schema normalization with the property under test.
const replyMessageArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const scenarioArb = fc.record({
  authorIsStudent: fc.boolean(),
  rating: fc.integer({ min: 1, max: 5 }),
  targetReplyMessage: replyMessageArb,
  intruderReplyMessage: replyMessageArb,
  targetActsFirst: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 16
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 16: Replying is restricted to the targeted teacher and persists with the feedback
describe('Property 16: Replying is restricted to the targeted teacher and persists with the feedback', () => {
  it('rejects a non-target teacher with 403 (persisting nothing) and persists the target teacher\'s reply retrievably', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        // Fresh corpus per run.
        await Feedback.deleteMany({});

        const targetTeacherId = new mongoose.Types.ObjectId();
        const intruderTeacherId = new mongoose.Types.ObjectId();

        // Seed one teacher-targeted feedback addressed to targetTeacherId.
        const feedback = await Feedback.create({
          authorId: new mongoose.Types.ObjectId(),
          authorModel: scenario.authorIsStudent ? 'Student' : 'Parent',
          authorRole: scenario.authorIsStudent ? 'student' : 'parent',
          targetType: 'teacher',
          targetId: targetTeacherId,
          rating: scenario.rating,
          comment: 'Initial feedback comment',
        });
        const feedbackId = String(feedback._id);

        // The non-target teacher's reply attempt must be rejected with 403 and
        // must not persist anything (Requirements 9.1, 9.2).
        const attemptIntruder = async (): Promise<void> => {
          let threw = false;
          try {
            await feedbackService.reply(
              String(intruderTeacherId),
              feedbackId,
              scenario.intruderReplyMessage,
              auditCtxFor(String(intruderTeacherId)),
            );
          } catch (err) {
            threw = true;
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
          expect(threw).toBe(true);

          // Nothing persisted from the intruder: re-read and confirm no reply
          // authored by the intruder exists.
          const afterIntruder = await Feedback.findById(feedbackId).exec();
          expect(afterIntruder).not.toBeNull();
          const intruderReplies = (afterIntruder!.replies ?? []).filter(
            (r) => String(r.responderId) === String(intruderTeacherId),
          );
          expect(intruderReplies).toHaveLength(0);
        };

        // The target teacher's reply must succeed and be retrievable as part of
        // the feedback document (Requirement 9.3).
        const attemptTarget = async (): Promise<void> => {
          const result = await feedbackService.reply(
            String(targetTeacherId),
            feedbackId,
            scenario.targetReplyMessage,
            auditCtxFor(String(targetTeacherId)),
          );

          // The returned DTO carries the persisted reply.
          const dtoReply = result.replies.find(
            (r) =>
              r.responderId === String(targetTeacherId) &&
              r.message === scenario.targetReplyMessage,
          );
          expect(dtoReply).toBeDefined();

          // Independently re-read the document and confirm the reply persisted
          // with the responder and message round-tripping unchanged.
          const persisted = await Feedback.findById(feedbackId).exec();
          expect(persisted).not.toBeNull();
          const persistedReply = (persisted!.replies ?? []).find(
            (r) =>
              String(r.responderId) === String(targetTeacherId) &&
              r.message === scenario.targetReplyMessage,
          );
          expect(persistedReply).toBeDefined();
          expect(persistedReply!.responderModel).toBe('Faculty');
        };

        // Randomize the order so a rejection never leaves a side effect that
        // could corrupt a later successful reply, and vice versa.
        if (scenario.targetActsFirst) {
          await attemptTarget();
          await attemptIntruder();
        } else {
          await attemptIntruder();
          await attemptTarget();
        }

        // Final invariant: exactly one reply exists overall — the target's —
        // confirming the intruder persisted nothing (Requirements 9.2, 9.3).
        const finalDoc = await Feedback.findById(feedbackId).exec();
        expect(finalDoc).not.toBeNull();
        const allReplies = finalDoc!.replies ?? [];
        expect(allReplies).toHaveLength(1);
        expect(String(allReplies[0].responderId)).toBe(
          String(targetTeacherId),
        );
        expect(allReplies[0].message).toBe(scenario.targetReplyMessage);
      }),
      { numRuns: 100 },
    );
  });
});
