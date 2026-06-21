/**
 * Property-Based Test: Marking read is recipient-only and idempotent.
 *
 * Feature: communication-feedback-and-admin-apis, Property 9: Marking read is recipient-only and idempotent
 *
 * Property 9: For any message, only its recipient can mark it read; when the
 * recipient marks an unread message it becomes `isRead` with `readAt` set to the
 * current time, and applying mark-read again leaves `readAt` unchanged. A
 * non-recipient never mutates the message.
 *
 * Strategy: seed a single unread message in a Parent <-> Faculty conversation,
 * with a random direction so either side may be the recipient.
 *   - A non-recipient (the other participant / sender, and an unrelated
 *     stranger) calling `markRead` is rejected with 403 and leaves the persisted
 *     message untouched (still unread, `readAt` unset).
 *   - The recipient calling `markRead` on the unread message flips `isRead` to
 *     true and sets `readAt` to a concrete time.
 *   - A second `markRead` by the recipient is idempotent: `readAt` is unchanged.
 *
 * Exercises `messageService.markRead`, which authorizes the recipient via
 * `AuthorizationService.assertMessageRecipient` (throwing `AppError.forbidden`
 * -> 403) and relies on the model's idempotent `markAsRead()`.
 *
 * **Validates: Requirements 4.1, 4.2, 4.4, 4.6**
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

const corpusArb = fc.record({
  // Direction of the seeded message: true => Parent is the sender (so Faculty
  // is the recipient); false => Faculty is the sender (Parent is recipient).
  parentIsSender: fc.boolean(),
  // The role an unrelated stranger (neither sender nor recipient) presents when
  // attempting to mark the message read — still rejected with 403.
  strangerRole: fc.constantFrom<UserRole>('parent', 'teacher'),
});

// ---------------------------------------------------------------------------
// Property 9
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 9: Marking read is recipient-only and idempotent
describe('Property 9: Marking read is recipient-only and idempotent', () => {
  it('rejects non-recipients with 403 (no mutation), and the recipient mark-read is idempotent on readAt', async () => {
    await fc.assert(
      fc.asyncProperty(corpusArb, async (corpus) => {
        await Message.deleteMany({});

        const parentId = new Types.ObjectId();
        const facultyId = new Types.ObjectId();
        const studentId = new Types.ObjectId();
        const conversationId = `parent_${parentId}_teacher_${facultyId}_student_${studentId}`;

        // Seed one UNREAD message in the chosen direction.
        const created = await Message.create({
          conversationId,
          subject: 'Subject',
          content: 'Content',
          senderId: corpus.parentIsSender ? parentId : facultyId,
          senderModel: corpus.parentIsSender ? 'Parent' : 'Faculty',
          senderName: 'Sender Name',
          recipientId: corpus.parentIsSender ? facultyId : parentId,
          recipientModel: corpus.parentIsSender ? 'Faculty' : 'Parent',
          recipientName: 'Recipient Name',
          studentId,
          studentName: 'Student Name',
          isRead: false,
        });
        const messageId = String(created._id);

        // Identify the recipient and the (non-recipient) sender.
        const recipientId = corpus.parentIsSender
          ? facultyId.toString()
          : parentId.toString();
        const recipientRole: UserRole = corpus.parentIsSender ? 'teacher' : 'parent';

        const senderId = corpus.parentIsSender
          ? parentId.toString()
          : facultyId.toString();
        const senderRole: UserRole = corpus.parentIsSender ? 'parent' : 'teacher';

        // ── Part A: the sender (a participant, but not the recipient) cannot
        // mark the message read → 403, and the message is left unmutated ─────
        await expect(
          messageService.markRead(senderId, senderRole, messageId),
        ).rejects.toMatchObject({ statusCode: 403 });

        // ── Part A (cont.): an unrelated stranger is also rejected with 403 ──
        const strangerId = new Types.ObjectId().toString();
        await expect(
          messageService.markRead(strangerId, corpus.strangerRole, messageId),
        ).rejects.toMatchObject({ statusCode: 403 });

        // The message remains unread with no readAt after both denials.
        const afterDenials = await Message.findById(messageId).lean().exec();
        expect(afterDenials).not.toBeNull();
        expect(afterDenials!.isRead).toBe(false);
        expect(afterDenials!.readAt ?? null).toBeNull();

        // ── Part B: the recipient marks the unread message read ─────────────
        const beforeMark = Date.now();
        const firstResult = await messageService.markRead(
          recipientId,
          recipientRole,
          messageId,
        );
        const afterMark = Date.now();

        // The returned DTO reports the message as read with a concrete readAt.
        expect(firstResult.isRead).toBe(true);
        expect(firstResult.readAt).toBeInstanceOf(Date);

        const persistedAfterFirst = await Message.findById(messageId).lean().exec();
        expect(persistedAfterFirst!.isRead).toBe(true);
        expect(persistedAfterFirst!.readAt).toBeInstanceOf(Date);
        const firstReadAt = persistedAfterFirst!.readAt as Date;
        // readAt is set to "now" (within the bracket around the call).
        expect(firstReadAt.getTime()).toBeGreaterThanOrEqual(beforeMark - 1);
        expect(firstReadAt.getTime()).toBeLessThanOrEqual(afterMark + 1);

        // ── Part C: a second mark-read by the recipient is idempotent ───────
        const secondResult = await messageService.markRead(
          recipientId,
          recipientRole,
          messageId,
        );
        expect(secondResult.isRead).toBe(true);
        expect(secondResult.readAt).toBeInstanceOf(Date);
        // readAt is unchanged by the repeat call (Requirement 4.6).
        expect((secondResult.readAt as Date).getTime()).toBe(firstReadAt.getTime());

        const persistedAfterSecond = await Message.findById(messageId).lean().exec();
        expect((persistedAfterSecond!.readAt as Date).getTime()).toBe(
          firstReadAt.getTime(),
        );
      }),
      { numRuns: 100 },
    );
  });
});
