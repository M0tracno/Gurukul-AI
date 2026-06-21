/**
 * Property-Based Test: Conversation listing is scoped to the participant and
 * excludes deleted content.
 *
 * Feature: communication-feedback-and-admin-apis, Property 1: Conversation listing is scoped to the participant and excludes deleted content
 *
 * Property statement: For any corpus of messages and any authenticated viewer
 * (teacher or parent), every conversation returned by the list endpoint
 * includes the viewer as sender or recipient (matching the viewer's
 * role-to-model mapping), and no returned summary is derived solely from
 * `isDeleted` messages.
 *
 * Exercised against {@link MessageService.listConversations}.
 *
 * **Validates: Requirements 1.1, 1.2**
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
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
// Helpers
// ---------------------------------------------------------------------------

type ObjectId = mongoose.Types.ObjectId;
type ParticipantModel = 'Parent' | 'Faculty';

/**
 * Direction + lifecycle spec for a single generated message. A messaging
 * conversation is always between one Parent and one Faculty member about one
 * Student, so each message picks a parent, a faculty, and a student from small
 * pools plus a direction and a soft-delete flag.
 */
interface MessageSpec {
  parentIdx: number;
  facultyIdx: number;
  studentIdx: number;
  fromParent: boolean;
  isDeleted: boolean;
}

/**
 * Insert a Message via the native driver (bypassing the conversationId/threadId
 * save hooks), setting the conversationId explicitly the same way the model's
 * pre-save hook would. `createdAt` is monotonically increasing per inserted
 * message so latest-message ordering is deterministic.
 */
async function insertMessage(
  spec: MessageSpec,
  pools: { parents: ObjectId[]; faculty: ObjectId[]; students: ObjectId[] },
  createdAt: Date,
): Promise<string> {
  const parentId = pools.parents[spec.parentIdx];
  const facultyId = pools.faculty[spec.facultyIdx];
  const studentId = pools.students[spec.studentIdx];

  const conversationId = `parent_${parentId}_teacher_${facultyId}_student_${studentId}`;

  const senderId = spec.fromParent ? parentId : facultyId;
  const senderModel: ParticipantModel = spec.fromParent ? 'Parent' : 'Faculty';
  const recipientId = spec.fromParent ? facultyId : parentId;
  const recipientModel: ParticipantModel = spec.fromParent ? 'Faculty' : 'Parent';

  await Message.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    conversationId,
    subject: 'Subject',
    content: 'Content',
    senderId,
    senderModel,
    senderName: 'Sender Name',
    recipientId,
    recipientModel,
    recipientName: 'Recipient Name',
    studentId,
    studentName: 'Student Name',
    isRead: false,
    readAt: null,
    messageType: 'general',
    priority: 'normal',
    attachments: [],
    deliveryStatus: 'pending',
    isDeleted: spec.isDeleted,
    deletedAt: spec.isDeleted ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
  } as never);

  return conversationId;
}

// ---------------------------------------------------------------------------
// Property 1
// ---------------------------------------------------------------------------

// Feature: communication-feedback-and-admin-apis, Property 1: Conversation listing is scoped to the participant and excludes deleted content
describe('Property 1: Conversation listing is scoped to the participant and excludes deleted content', () => {
  it(
    'returns exactly the conversations the viewer participates in that have a non-deleted message, and never a summary derived solely from deleted messages',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // number of parents
          fc.integer({ min: 1, max: 3 }), // number of faculty
          fc.integer({ min: 1, max: 2 }), // number of students
          fc.array(
            fc.record({
              parentIdx: fc.nat(),
              facultyIdx: fc.nat(),
              studentIdx: fc.nat(),
              fromParent: fc.boolean(),
              isDeleted: fc.boolean(),
            }),
            { minLength: 1, maxLength: 12 },
          ),
          fc.constantFrom<UserRole>('teacher', 'parent'),
          fc.nat(),
          async (numParents, numFaculty, numStudents, rawSpecs, viewerRole, viewerSeed) => {
            await Message.deleteMany({});

            const pools = {
              parents: Array.from({ length: numParents }, () => new mongoose.Types.ObjectId()),
              faculty: Array.from({ length: numFaculty }, () => new mongoose.Types.ObjectId()),
              students: Array.from({ length: numStudents }, () => new mongoose.Types.ObjectId()),
            };

            // Normalize generated indices into the actual pool sizes.
            const specs: MessageSpec[] = rawSpecs.map((s) => ({
              parentIdx: s.parentIdx % numParents,
              facultyIdx: s.facultyIdx % numFaculty,
              studentIdx: s.studentIdx % numStudents,
              fromParent: s.fromParent,
              isDeleted: s.isDeleted,
            }));

            const base = Date.now();
            for (let i = 0; i < specs.length; i++) {
              await insertMessage(specs[i], pools, new Date(base + i * 1000));
            }

            // The viewer's identity + role-to-model mapping (Requirement 1.2):
            // teacher -> Faculty, parent -> Parent.
            const viewerModel: ParticipantModel = viewerRole === 'teacher' ? 'Faculty' : 'Parent';
            const viewerPool = viewerRole === 'teacher' ? pools.faculty : pools.parents;
            const viewerId = viewerPool[viewerSeed % viewerPool.length];
            const viewerIdStr = String(viewerId);

            // Independent reference: the set of conversations in which the viewer
            // participates (per the role-to-model mapping) AND that have at least
            // one NON-deleted message. A conversation made up solely of deleted
            // messages must NOT be in scope (Requirement 1.1).
            const expected = new Set<string>();
            for (let i = 0; i < specs.length; i++) {
              const spec = specs[i];
              if (spec.isDeleted) continue;
              const parentId = pools.parents[spec.parentIdx];
              const facultyId = pools.faculty[spec.facultyIdx];
              const studentId = pools.students[spec.studentIdx];
              const conversationId = `parent_${parentId}_teacher_${facultyId}_student_${studentId}`;

              const senderId = spec.fromParent ? parentId : facultyId;
              const senderModel: ParticipantModel = spec.fromParent ? 'Parent' : 'Faculty';
              const recipientId = spec.fromParent ? facultyId : parentId;
              const recipientModel: ParticipantModel = spec.fromParent ? 'Faculty' : 'Parent';

              const isViewer =
                (String(senderId) === viewerIdStr && senderModel === viewerModel) ||
                (String(recipientId) === viewerIdStr && recipientModel === viewerModel);
              if (isViewer) {
                expected.add(conversationId);
              }
            }

            // Use a page size large enough to cover every generated conversation
            // so the returned set can be compared against the full expected set.
            const { data, total } = await messageService.listConversations(
              viewerIdStr,
              viewerRole,
              1,
              100,
            );

            const returnedIds = data.map((c) => c.conversationId);

            // No duplicate conversations in the result.
            expect(new Set(returnedIds).size).toBe(returnedIds.length);

            // Scoping + deleted-exclusion: the returned conversation set equals
            // exactly the in-scope, non-deleted-bearing set (Requirements 1.1, 1.2).
            expect(new Set(returnedIds)).toEqual(expected);
            expect(total).toBe(expected.size);

            for (const summary of data) {
              // Every returned summary includes the viewer as sender or recipient
              // under the role-to-model mapping (Requirements 1.1, 1.2).
              const lm = summary.latestMessage;
              const viewerIsParticipant =
                (lm.senderId === viewerIdStr && lm.senderModel === viewerModel) ||
                (lm.recipientId === viewerIdStr && lm.recipientModel === viewerModel);
              expect(viewerIsParticipant).toBe(true);

              // The summary is not derived solely from deleted messages: its
              // latestMessage is a real, non-deleted message (Requirement 1.1).
              const persisted = await Message.findById(lm.id).lean().exec();
              expect(persisted).not.toBeNull();
              expect(persisted?.isDeleted).toBe(false);
              expect(persisted?.conversationId).toBe(summary.conversationId);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
