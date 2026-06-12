/**
 * Property-Based Test: Deleting a message is participant-only and soft.
 *
 * Feature: communication-feedback-and-admin-apis, Property 10: Deleting a message is participant-only and soft
 *
 * Property 10: For any message, only its sender or recipient can delete it; a
 * successful delete sets `isDeleted` true and `deletedAt` to the current time,
 * and a non-participant never mutates the message.
 *
 * Strategy: seed a single message in a Parent <-> Faculty conversation, with a
 * random direction so either side may be the sender. For each run:
 *   - A non-participant (an unrelated stranger presenting either role) calling
 *     `softDelete` is rejected with 403, and the persisted message is left
 *     untouched (`isDeleted` false, `deletedAt` unset).
 *   - The chosen genuine participant (the sender or the recipient) calling
 *     `softDelete` succeeds: the persisted message has `isDeleted` true and
 *     `deletedAt` set to "now" (within the bracket around the call).
 *
 * Exercises `messageService.softDelete`, which checks existence first, then
 * authorizes the sender/recipient via
 * `AuthorizationService.assertMessageParticipant` (throwing `AppError.forbidden`
 * -> 403), and persists the soft-delete.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { messageService } from './messageService.js';
import type { AuditContext } from '../utils/auditContext.js';
import Message from '../models/Message.js';
import AuditLog from '../models/AuditLog.js';
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
  await Promise.all([Message.deleteMany({}), AuditLog.deleteMany({})]);
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const ipArb = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 4, maxLength: 4 })
  .map((octets) => octets.join('.'));

const corpusArb = fc.record({
  // Direction of the seeded message: true => Parent is the sender (Faculty is
  // the recipient); false => Faculty is the sender (Parent is the recipient).
  parentIsSender: fc.boolean(),
  // Which genuine participant performs the (successful) delete.
  deleterSide: fc.constantFrom<'sender' | 'recipient'>('sender', 'recipient'),
  // The role an unrelated stranger (neither sender nor recipient) presents when
  // attempting to delete the message — still rejected with 403.
  strangerRole: fc.constantFrom<UserRole>('parent', 'teacher'),
  ip: ipArb,
  correlationId: fc.uuid(),
});

// ---------------------------------------------------------------------------
// Property 10
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 10: Deleting a message is participant-only and soft
describe('Property 10: Deleting a message is participant-only and soft', () => {
  it('rejects non-participants with 403 (no mutation); sender or recipient delete sets isDeleted and deletedAt to now', async () => {
    await fc.assert(
      fc.asyncProperty(corpusArb, async (corpus) => {
        await Promise.all([Message.deleteMany({}), AuditLog.deleteMany({})]);

        const parentId = new Types.ObjectId();
        const facultyId = new Types.ObjectId();
        const studentId = new Types.ObjectId();
        const conversationId = `parent_${parentId}_teacher_${facultyId}_student_${studentId}`;

        // Seed a single, non-deleted message in the chosen direction.
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
          isDeleted: false,
        });
        const messageId = String(created._id);

        // Identify the genuine participants by id and role.
        const senderId = corpus.parentIsSender ? parentId.toString() : facultyId.toString();
        const senderRole: UserRole = corpus.parentIsSender ? 'parent' : 'teacher';
        const recipientId = corpus.parentIsSender ? facultyId.toString() : parentId.toString();
        const recipientRole: UserRole = corpus.parentIsSender ? 'teacher' : 'parent';

        const ctx: AuditContext = {
          userId: 'actor',
          role: 'admin',
          ip: corpus.ip,
          correlationId: corpus.correlationId,
        };

        // ── Part A: an unrelated stranger (a non-participant) is rejected with
        // 403, and the message is left unmutated ────────────────────────────
        const strangerId = new Types.ObjectId().toString();
        const strangerCtx: AuditContext = { ...ctx, role: corpus.strangerRole };
        await expect(
          messageService.softDelete(strangerId, corpus.strangerRole, messageId, strangerCtx),
        ).rejects.toMatchObject({ statusCode: 403 });

        const afterDenial = await Message.findById(messageId).lean().exec();
        expect(afterDenial).not.toBeNull();
        expect(afterDenial!.isDeleted).toBe(false);
        expect(afterDenial!.deletedAt ?? null).toBeNull();

        // ── Part B: the chosen genuine participant deletes the message ──────
        const deleterId = corpus.deleterSide === 'sender' ? senderId : recipientId;
        const deleterRole: UserRole =
          corpus.deleterSide === 'sender' ? senderRole : recipientRole;
        const deleterCtx: AuditContext = {
          ...ctx,
          userId: deleterId,
          role: deleterRole,
        };

        const beforeDelete = Date.now();
        await messageService.softDelete(deleterId, deleterRole, messageId, deleterCtx);
        const afterDelete = Date.now();

        // The persisted message is soft-deleted: isDeleted true, deletedAt set
        // to "now" (within the bracket around the call).
        const afterDeleteDoc = await Message.findById(messageId).lean().exec();
        expect(afterDeleteDoc).not.toBeNull();
        expect(afterDeleteDoc!.isDeleted).toBe(true);
        expect(afterDeleteDoc!.deletedAt).toBeInstanceOf(Date);
        const deletedAt = afterDeleteDoc!.deletedAt as Date;
        expect(deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete - 1);
        expect(deletedAt.getTime()).toBeLessThanOrEqual(afterDelete + 1);
      }),
      { numRuns: 100 },
    );
  });
});
