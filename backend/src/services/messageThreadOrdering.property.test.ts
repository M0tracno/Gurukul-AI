/**
 * Property-Based Test: Conversation threads are ordered and exclude deleted messages.
 *
 * Feature: communication-feedback-and-admin-apis, Property 4: Conversation threads are ordered and exclude deleted messages
 *
 * Property 4: For any conversation, the thread endpoint returns its non-deleted
 * messages ordered by ascending `createdAt`, and never includes a message whose
 * `isDeleted` is true.
 *
 * Strategy: seed a single conversation (one Parent <-> one Faculty about one
 * Student) with a varied set of messages — each message has its own `createdAt`,
 * a random soft-delete flag, and a random direction (parent->faculty or
 * faculty->parent) so the viewer is always a participant and
 * `assertConversationParticipant` succeeds. The viewer is the Faculty member
 * (role `teacher`). The thread returned by `messageService.getThread` is then
 * compared against an independent reference: the non-deleted messages sorted by
 * ascending `createdAt`. This simultaneously verifies the ascending ordering and
 * that no soft-deleted message is ever returned.
 *
 * **Validates: Requirements 2.1**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { messageService } from './messageService.js';
import Message from '../models/Message.js';

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
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * One message in the conversation: whether it is soft-deleted, its direction
 * (true => sent by the parent to the faculty viewer; false => sent by the
 * faculty viewer to the parent), and a non-negative time offset (seconds) that
 * is combined with the message index to produce a unique `createdAt`.
 */
const messageSpecArb = fc.record({
  deleted: fc.boolean(),
  fromParent: fc.boolean(),
  offsetSeconds: fc.integer({ min: 0, max: 100_000 }),
});

// A fixed base time; per-message offsets and index are added on top of it.
const BASE_TIME = Date.UTC(2024, 0, 1, 0, 0, 0);

// ---------------------------------------------------------------------------
// Property 4
// ---------------------------------------------------------------------------
// Feature: communication-feedback-and-admin-apis, Property 4: Conversation threads are ordered and exclude deleted messages
describe('Property 4: Conversation threads are ordered and exclude deleted messages', () => {
  it('returns only non-deleted messages ordered by ascending createdAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(messageSpecArb, { minLength: 1, maxLength: 12 }),
        async (specs) => {
          // Fresh corpus per run so counts/ordering are deterministic.
          await Message.deleteMany({});

          // Fixed participant triple for this conversation. The viewer is the
          // Faculty member (role `teacher`).
          const parentId = new mongoose.Types.ObjectId();
          const facultyId = new mongoose.Types.ObjectId();
          const studentId = new mongoose.Types.ObjectId();
          const conversationId = `parent_${parentId}_teacher_${facultyId}_student_${studentId}`;

          // Build docs with explicit, unique createdAt values. Adding the index
          // guarantees uniqueness even when two offsets collide.
          const docs = specs.map((spec, index) => {
            const createdAt = new Date(BASE_TIME + spec.offsetSeconds * 1000 + index);
            const base = {
              conversationId,
              subject: `Subject ${index}`,
              content: `Content ${index}`,
              studentId,
              studentName: 'Student Name',
              messageType: 'general' as const,
              priority: 'normal' as const,
              isDeleted: spec.deleted,
              ...(spec.deleted ? { deletedAt: new Date(createdAt.getTime() + 1) } : {}),
              createdAt,
              updatedAt: createdAt,
            };

            if (spec.fromParent) {
              // Parent -> Faculty viewer (viewer is recipient).
              return {
                ...base,
                senderId: parentId,
                senderModel: 'Parent' as const,
                senderName: 'Parent Name',
                recipientId: facultyId,
                recipientModel: 'Faculty' as const,
                recipientName: 'Faculty Name',
              };
            }
            // Faculty viewer -> Parent (viewer is sender).
            return {
              ...base,
              senderId: facultyId,
              senderModel: 'Faculty' as const,
              senderName: 'Faculty Name',
              recipientId: parentId,
              recipientModel: 'Parent' as const,
              recipientName: 'Parent Name',
            };
          });

          // insertMany with timestamps disabled so our explicit createdAt values
          // are preserved instead of being overwritten by the timestamp plugin.
          const inserted = await Message.insertMany(docs, { timestamps: false });

          // Independent reference: non-deleted messages, ascending by createdAt
          // (tie-broken by _id to match a stable sort, though createdAt is unique).
          const expectedOrderedIds = inserted
            .filter((_doc, i) => !specs[i].deleted)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((doc) => String(doc._id));

          // Use a large limit so the entire non-deleted thread fits on page 1.
          const result = await messageService.getThread(
            String(facultyId),
            'teacher',
            conversationId,
            1,
            100,
          );

          const returnedIds = result.data.map((m) => m.id);

          // The thread equals exactly the non-deleted messages in ascending order.
          expect(returnedIds).toEqual(expectedOrderedIds);

          // No returned message corresponds to a soft-deleted document.
          const deletedIds = new Set(
            inserted.filter((_doc, i) => specs[i].deleted).map((doc) => String(doc._id)),
          );
          for (const id of returnedIds) {
            expect(deletedIds.has(id)).toBe(false);
          }

          // The returned createdAt sequence is non-decreasing (ascending order).
          for (let i = 1; i < result.data.length; i++) {
            expect(result.data[i].createdAt.getTime()).toBeGreaterThanOrEqual(
              result.data[i - 1].createdAt.getTime(),
            );
          }

          // total counts only non-deleted messages.
          expect(result.total).toBe(expectedOrderedIds.length);

          // The conversation exists (at least one message was seeded).
          expect(result.conversationExists).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
