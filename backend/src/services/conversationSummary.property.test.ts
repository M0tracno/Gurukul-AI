/**
 * Property-Based Tests: Conversation summaries are computed correctly.
 *
 * Feature: communication-feedback-and-admin-apis, Property 2: Conversation summaries are computed correctly
 *
 * Property 2: For any set of conversations, each returned summary's
 * `unreadCount` equals the number of non-deleted messages where the viewer is
 * the recipient and `isRead` is false, `messageCount` equals the number of
 * non-deleted messages in that conversation, and `latestMessage` is the
 * non-deleted message with the greatest `createdAt`.
 *
 * **Validates: Requirements 1.3**
 *
 * Strategy: seed a fixed viewer (a Faculty member) into several conversations
 * whose messages carry a varied mix of direction (inbound to the viewer vs.
 * outbound from the viewer), read state, and soft-deletion. We also seed noise
 * messages between two other participants the viewer is not part of, which must
 * never appear in or affect the viewer's summaries. The summaries returned by
 * `messageService.listConversations` are then checked against an independent
 * reference computation over the seeded corpus.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { MessageService } from './messageService.js';
import Message from '../models/Message.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let service: MessageService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  service = new MessageService();
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
 * One message within a conversation. `direction` is relative to the viewer:
 * - `in`  → parent → viewer (viewer is the recipient)
 * - `out` → viewer → parent (viewer is the sender)
 * Only inbound, unread, non-deleted messages contribute to `unreadCount`.
 */
interface MessageSpec {
  direction: 'in' | 'out';
  isRead: boolean;
  isDeleted: boolean;
}

const messageSpecArb: fc.Arbitrary<MessageSpec> = fc.record({
  direction: fc.constantFrom<'in' | 'out'>('in', 'out'),
  isRead: fc.boolean(),
  isDeleted: fc.boolean(),
});

// Each conversation has between 1 and 6 messages.
const conversationSpecArb = fc.array(messageSpecArb, { minLength: 1, maxLength: 6 });

// Between 1 and 5 conversations involving the viewer; keep the corpus small so a
// single page (limit 100) returns every in-scope conversation.
const corpusArb = fc.array(conversationSpecArb, { minLength: 1, maxLength: 5 });

// 0..3 noise messages between two non-viewer participants.
const noiseCountArb = fc.integer({ min: 0, max: 3 });

// ---------------------------------------------------------------------------
// Seed tracking
// ---------------------------------------------------------------------------

/** A seeded message we track for the reference computation. */
interface SeededMessage {
  id: string;
  conversationId: string;
  direction: 'in' | 'out';
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Property 2
// ---------------------------------------------------------------------------

// Feature: communication-feedback-and-admin-apis, Property 2: Conversation summaries are computed correctly
describe('Property 2: Conversation summaries are computed correctly', () => {
  it('each summary unreadCount/messageCount/latestMessage matches an independent reference computation', async () => {
    await fc.assert(
      fc.asyncProperty(
        corpusArb,
        noiseCountArb,
        async (conversations, noiseCount) => {
          // Isolate each run.
          await Message.deleteMany({});

          // Fixed viewer (Faculty) for this run; scope is derived from this id.
          const viewerId = new mongoose.Types.ObjectId();

          // Distinct non-viewer participants for noise messages.
          const otherFacultyId = new mongoose.Types.ObjectId();
          const otherParentId = new mongoose.Types.ObjectId();
          const otherStudentId = new mongoose.Types.ObjectId();

          // Monotonic clock so every message gets a unique createdAt, making the
          // "greatest createdAt" latest-message unambiguous.
          const baseMillis = Date.now() - 10_000_000;
          let tick = 0;
          const nextCreatedAt = (): Date => new Date(baseMillis + tick++ * 1000);

          const seeded: SeededMessage[] = [];

          // Seed the viewer's conversations. Each conversation gets its own
          // parent + student, so conversationId (parent_<p>_teacher_<f>_student_<s>)
          // is unique per conversation and shared by all its messages.
          for (const convSpecs of conversations) {
            const parentId = new mongoose.Types.ObjectId();
            const studentId = new mongoose.Types.ObjectId();
            // Mirror the model's conversationId format so all messages in this
            // conversation group together (pre-save generation runs after
            // validation in this Mongoose version, so we set it explicitly).
            const conversationId = `parent_${String(parentId)}_teacher_${String(
              viewerId,
            )}_student_${String(studentId)}`;

            for (const spec of convSpecs) {
              const createdAt = nextCreatedAt();

              const base =
                spec.direction === 'in'
                  ? {
                      senderModel: 'Parent' as const,
                      senderId: parentId,
                      senderName: 'Parent P',
                      recipientModel: 'Faculty' as const,
                      recipientId: viewerId,
                      recipientName: 'Viewer F',
                    }
                  : {
                      senderModel: 'Faculty' as const,
                      senderId: viewerId,
                      senderName: 'Viewer F',
                      recipientModel: 'Parent' as const,
                      recipientId: parentId,
                      recipientName: 'Parent P',
                    };

              const created = await Message.create({
                subject: 'Subject',
                content: 'Content',
                conversationId,
                ...base,
                studentId,
                studentName: 'Student S',
                isRead: spec.isRead,
                ...(spec.isRead ? { readAt: nextCreatedAt() } : {}),
                isDeleted: spec.isDeleted,
                ...(spec.isDeleted ? { deletedAt: nextCreatedAt() } : {}),
              });

              // Pin createdAt deterministically. Use the native collection
              // update because Mongoose treats `createdAt` as immutable under
              // `timestamps: true` and silently strips it from a Mongoose
              // updateOne (even with `timestamps: false`), which would leave the
              // auto-generated timestamps in place and let two messages created
              // in the same millisecond tie — making latestMessage ambiguous.
              await Message.collection.updateOne(
                { _id: created._id },
                { $set: { createdAt } },
              );

              seeded.push({
                id: String(created._id),
                conversationId: created.conversationId,
                direction: spec.direction,
                isRead: spec.isRead,
                isDeleted: spec.isDeleted,
                createdAt,
              });
            }
          }

          // Seed noise messages the viewer is NOT a participant in. They must
          // never appear in the viewer's summaries nor affect any counts.
          for (let i = 0; i < noiseCount; i++) {
            await Message.create({
              subject: 'Noise',
              content: 'Noise',
              conversationId: `parent_${String(otherParentId)}_teacher_${String(
                otherFacultyId,
              )}_student_${String(otherStudentId)}`,
              senderModel: 'Faculty',
              senderId: otherFacultyId,
              senderName: 'Other F',
              recipientModel: 'Parent',
              recipientId: otherParentId,
              recipientName: 'Other P',
              studentId: otherStudentId,
              studentName: 'Other S',
              isRead: false,
              isDeleted: false,
            });
          }

          // -----------------------------------------------------------------
          // Independent reference computation
          // -----------------------------------------------------------------
          const byConversation = new Map<string, SeededMessage[]>();
          for (const m of seeded) {
            const list = byConversation.get(m.conversationId) ?? [];
            list.push(m);
            byConversation.set(m.conversationId, list);
          }

          interface ExpectedSummary {
            messageCount: number;
            unreadCount: number;
            latestId: string;
          }
          const expected = new Map<string, ExpectedSummary>();

          for (const [conversationId, msgs] of byConversation) {
            const live = msgs.filter((m) => !m.isDeleted);
            // A conversation with only deleted messages yields no summary.
            if (live.length === 0) {
              continue;
            }
            const messageCount = live.length;
            const unreadCount = live.filter(
              (m) => m.direction === 'in' && !m.isRead,
            ).length;
            const latest = live.reduce((a, b) =>
              b.createdAt.getTime() > a.createdAt.getTime() ? b : a,
            );
            expected.set(conversationId, {
              messageCount,
              unreadCount,
              latestId: latest.id,
            });
          }

          // -----------------------------------------------------------------
          // Actual: ask the service for the viewer's conversation summaries.
          // -----------------------------------------------------------------
          const { data } = await service.listConversations(
            String(viewerId),
            'teacher',
            1,
            100,
          );

          const actual = new Map(data.map((s) => [s.conversationId, s]));

          // Same set of conversations (no missing, no leaked/noise conversations).
          expect(new Set(actual.keys())).toEqual(new Set(expected.keys()));

          // Each summary's computed fields match the reference.
          for (const [conversationId, exp] of expected) {
            const summary = actual.get(conversationId);
            expect(summary).toBeDefined();
            expect(summary!.messageCount).toBe(exp.messageCount);
            expect(summary!.unreadCount).toBe(exp.unreadCount);
            expect(summary!.latestMessage.id).toBe(exp.latestId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
