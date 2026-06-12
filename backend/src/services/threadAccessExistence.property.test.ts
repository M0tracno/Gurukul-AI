/**
 * Property-Based Test: Thread access requires participation and distinguishes
 * existence from emptiness.
 *
 * Feature: communication-feedback-and-admin-apis, Property 5: Thread access requires participation and distinguishes existence from emptiness
 *
 * Property 5: For any conversation and any viewer who is neither sender nor
 * recipient, the thread request is rejected with 403 and no message content is
 * returned (including when the conversation has no viewable messages); and for
 * any requested `conversationId`, the response `meta.conversationExists` is
 * true exactly when at least one message with that id exists, false otherwise.
 *
 * The test exercises `messageService.getThread`, which performs the
 * participation check (via `AuthorizationService.assertConversationParticipant`,
 * throwing `AppError.forbidden` → 403) before returning any content, and
 * returns the `conversationExists` flag the controller surfaces as
 * `meta.conversationExists`.
 *
 * **Validates: Requirements 2.2, 2.3, 2.6, 2.7**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { messageService } from './messageService.js';
import Message from '../models/Message.js';
import type { UserRole } from '../types/common.js';

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
  await Message.deleteMany({});
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * One message in a conversation between a Parent and a Faculty member. The
 * `parentIsSender` flag picks the direction, `isDeleted` controls soft-delete.
 */
interface MessageSpec {
  parentIsSender: boolean;
  isDeleted: boolean;
}

const messageSpecArb: fc.Arbitrary<MessageSpec> = fc.record({
  parentIsSender: fc.boolean(),
  isDeleted: fc.boolean(),
});

const corpusArb = fc.record({
  // At least one message so the conversation actually exists.
  messages: fc.array(messageSpecArb, { minLength: 1, maxLength: 6 }),
  // When true, every message in the conversation is soft-deleted, so the
  // conversation exists but has no viewable messages (Requirement 2.7).
  forceAllDeleted: fc.boolean(),
  // The role a non-participant viewer presents (still rejected with 403).
  strangerRole: fc.constantFrom<UserRole>('parent', 'teacher'),
  // Which genuine participant performs the existence checks.
  participantSide: fc.constantFrom('parent', 'faculty'),
});

// ---------------------------------------------------------------------------
// Property 5
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 5: Thread access requires participation and distinguishes existence from emptiness
describe('Property 5: Thread access requires participation and distinguishes existence from emptiness', () => {
  it('rejects non-participants with 403 (including all-deleted conversations) and sets conversationExists iff a message with that id exists', async () => {
    await fc.assert(
      fc.asyncProperty(corpusArb, async (corpus) => {
        await Message.deleteMany({});

        const parentId = new Types.ObjectId();
        const facultyId = new Types.ObjectId();
        const studentId = new Types.ObjectId();
        const conversationId = `parent_${parentId}_teacher_${facultyId}_student_${studentId}`;

        const specs = corpus.messages.map((spec) => ({
          ...spec,
          isDeleted: corpus.forceAllDeleted ? true : spec.isDeleted,
        }));

        const docs = specs.map((spec) => ({
          conversationId,
          subject: 'Subject',
          content: 'Content',
          senderId: spec.parentIsSender ? parentId : facultyId,
          senderModel: spec.parentIsSender ? 'Parent' : 'Faculty',
          senderName: 'Sender Name',
          recipientId: spec.parentIsSender ? facultyId : parentId,
          recipientModel: spec.parentIsSender ? 'Faculty' : 'Parent',
          recipientName: 'Recipient Name',
          studentId,
          studentName: 'Student Name',
          isRead: false,
          isDeleted: spec.isDeleted,
        }));

        await Message.insertMany(docs);

        const expectedNonDeleted = specs.filter((s) => !s.isDeleted).length;
        const allDeleted = expectedNonDeleted === 0;

        // ── Part A: a non-participant is rejected with 403, and no content is
        // returned — including when every message is soft-deleted ───────────
        const strangerId = new Types.ObjectId().toString();
        await expect(
          messageService.getThread(strangerId, corpus.strangerRole, conversationId, 1, 20),
        ).rejects.toMatchObject({ statusCode: 403 });

        // ── Part B: a genuine participant reads the thread ──────────────────
        const participantId =
          corpus.participantSide === 'parent'
            ? parentId.toString()
            : facultyId.toString();
        const participantRole: UserRole =
          corpus.participantSide === 'parent' ? 'parent' : 'teacher';

        const existing = await messageService.getThread(
          participantId,
          participantRole,
          conversationId,
          1,
          20,
        );

        // The conversation has at least one message → exists is true, even when
        // all messages are soft-deleted (Requirements 2.6, 2.7).
        expect(existing.conversationExists).toBe(true);
        // total counts only viewable (non-deleted) messages.
        expect(existing.total).toBe(expectedNonDeleted);
        // An all-deleted conversation yields an empty viewable collection.
        if (allDeleted) {
          expect(existing.data).toHaveLength(0);
        }
        // The returned page never exceeds the requested limit.
        expect(existing.data.length).toBeLessThanOrEqual(20);
        // No soft-deleted message ever leaks into the thread content.
        expect(existing.data.length).toBe(Math.min(expectedNonDeleted, 20));

        // ── Part B (cont.): a conversationId with no messages → exists false ─
        const ghostConversationId = `ghost_${new Types.ObjectId()}`;
        const missing = await messageService.getThread(
          participantId,
          participantRole,
          ghostConversationId,
          1,
          20,
        );
        expect(missing.conversationExists).toBe(false);
        expect(missing.data).toHaveLength(0);
        expect(missing.total).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});
