/**
 * Property-Based Tests: Messaging (Channel Role Constraint, Persistence Round-Trip, Offline Deliver)
 *
 * Feature: admin-portal-overhaul, Property 24: Messaging channel role constraint
 * Feature: admin-portal-overhaul, Property 25: Message persistence round-trip
 * Feature: admin-portal-overhaul, Property 26: Offline message retain-and-deliver
 *
 * Property 24: For any user and any Channel, joining or posting SHALL be permitted
 * if and only if the user's role is a member of that Channel's permitted role pair;
 * otherwise the action SHALL be denied with an Error_Envelope and HTTP status 403.
 * **Validates: Requirements 16.1, 16.3**
 *
 * Property 25: For any message sent on a Channel, the message SHALL be retrievable
 * from that conversation's history with identical content.
 * **Validates: Requirements 16.4**
 *
 * Property 26: For any message sent to an offline recipient, the message SHALL be
 * retained and delivered exactly once when that recipient reconnects.
 * **Validates: Requirements 16.5**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  canJoin,
  canPost,
  CHANNEL_ROLE_PAIRS,
  ALL_CHANNEL_TYPES,
  type ChannelType,
} from './messagingRbac.js';
import Message from '../models/Message.js';
import type { UserRole } from '../types/common.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
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

/** Generates a valid 24-character hex string (MongoDB ObjectId format). */
const objectIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);

/** Generates any valid user role. */
const anyRoleArb: fc.Arbitrary<UserRole> = fc.constantFrom('admin', 'teacher', 'student', 'parent');

/** Generates any valid channel type. */
const channelTypeArb: fc.Arbitrary<ChannelType> = fc.constantFrom(...ALL_CHANNEL_TYPES);

/**
 * Character arbitrary for content (alphanumeric + space).
 */
const contentCharArb = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split(''));

/**
 * Generates non-empty message content that is stable under Mongoose's `trim: true`.
 * Ensures no leading/trailing whitespace since Mongoose trims strings.
 */
const messageContentArb = fc
  .array(contentCharArb, { minLength: 1, maxLength: 200 })
  .map(chars => chars.join('').trim())
  .filter(s => s.length > 0 && s.length <= 200);

/**
 * Generates non-empty message subject that is stable under Mongoose's `trim: true`.
 */
const messageSubjectArb = fc
  .array(contentCharArb, { minLength: 1, maxLength: 100 })
  .map(chars => chars.join('').trim())
  .filter(s => s.length > 0 && s.length <= 100);

/**
 * Character arbitrary for names (alphanumeric only, no spaces to avoid trim issues).
 */
const nameCharArb = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''));

/**
 * Generates a sender/recipient name that is stable under Mongoose's `trim: true`.
 */
const nameArb = fc
  .array(nameCharArb, { minLength: 1, maxLength: 50 })
  .map(chars => chars.join(''));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes 'faculty' to 'teacher' for channel matching (matching the impl).
 */
function normalizeRole(role: UserRole): string {
  return role === 'faculty' ? 'teacher' : role;
}

/**
 * Determines if a role is permitted on a channel type.
 */
function isPermitted(role: UserRole, channelType: ChannelType): boolean {
  const normalized = normalizeRole(role);
  const [r1, r2] = CHANNEL_ROLE_PAIRS[channelType];
  return normalized === r1 || normalized === r2;
}

/**
 * Creates a persisted message in the database for testing.
 */
async function createPersistedMessage(opts: {
  senderId: string;
  recipientId: string;
  content: string;
  subject: string;
  senderName: string;
  recipientName: string;
  studentId: string;
  studentName: string;
  deliveryStatus?: 'pending' | 'delivered' | 'failed';
}) {
  const message = new Message({
    conversationId: `test_conv_${opts.senderId}_${opts.recipientId}`,
    subject: opts.subject,
    content: opts.content,
    senderId: new mongoose.Types.ObjectId(opts.senderId),
    senderModel: 'Faculty',
    senderName: opts.senderName,
    recipientId: new mongoose.Types.ObjectId(opts.recipientId),
    recipientModel: 'Parent',
    recipientName: opts.recipientName,
    studentId: new mongoose.Types.ObjectId(opts.studentId),
    studentName: opts.studentName,
    messageType: 'general',
    priority: 'normal',
    deliveryStatus: opts.deliveryStatus || 'pending',
    persistedAt: new Date(),
  });

  return message.save();
}

// ---------------------------------------------------------------------------
// Property 24: Messaging channel role constraint
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 24: Messaging channel role constraint
describe('Property 24: Messaging channel role constraint', () => {
  it('canJoin permits iff user role is in channel role pair, denies with Error_Envelope otherwise', () => {
    fc.assert(
      fc.property(
        anyRoleArb,
        channelTypeArb,
        (role, channelType) => {
          const result = canJoin(role, channelType);
          const permitted = isPermitted(role, channelType);

          if (permitted) {
            // Should be allowed
            expect(result.allowed).toBe(true);
            expect(result.errorEnvelope).toBeUndefined();
          } else {
            // Should be denied with Error_Envelope
            expect(result.allowed).toBe(false);
            expect(result.errorEnvelope).toBeDefined();
            expect(result.errorEnvelope!.success).toBe(false);
            expect(typeof result.errorEnvelope!.message).toBe('string');
            expect(result.errorEnvelope!.message.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('canPost permits iff user role is in channel role pair, denies with Error_Envelope otherwise', () => {
    fc.assert(
      fc.property(
        anyRoleArb,
        channelTypeArb,
        (role, channelType) => {
          const result = canPost(role, channelType);
          const permitted = isPermitted(role, channelType);

          if (permitted) {
            // Should be allowed
            expect(result.allowed).toBe(true);
            expect(result.errorEnvelope).toBeUndefined();
          } else {
            // Should be denied with Error_Envelope
            expect(result.allowed).toBe(false);
            expect(result.errorEnvelope).toBeDefined();
            expect(result.errorEnvelope!.success).toBe(false);
            expect(typeof result.errorEnvelope!.message).toBe('string');
            expect(result.errorEnvelope!.message.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every channel type has exactly two permitted roles and no others', () => {
    fc.assert(
      fc.property(
        channelTypeArb,
        (channelType) => {
          const allRoles: UserRole[] = ['admin', 'teacher', 'student', 'parent'];
          const [r1, r2] = CHANNEL_ROLE_PAIRS[channelType];

          let permittedCount = 0;
          for (const role of allRoles) {
            const normalized = normalizeRole(role);
            if (normalized === r1 || normalized === r2) {
              permittedCount++;
              expect(canJoin(role, channelType).allowed).toBe(true);
              expect(canPost(role, channelType).allowed).toBe(true);
            } else {
              expect(canJoin(role, channelType).allowed).toBe(false);
              expect(canPost(role, channelType).allowed).toBe(false);
            }
          }

          // At least 2 roles should be permitted (the pair)
          expect(permittedCount).toBeGreaterThanOrEqual(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: Message persistence round-trip
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 25: Message persistence round-trip
describe('Property 25: Message persistence round-trip', () => {
  it('a sent message is retrievable from conversation history with identical content', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        objectIdArb,
        messageContentArb,
        messageSubjectArb,
        nameArb,
        nameArb,
        nameArb,
        async (senderId, recipientId, studentId, content, subject, senderName, recipientName, studentName) => {
          const saved = await createPersistedMessage({
            senderId,
            recipientId,
            content,
            subject,
            senderName,
            recipientName,
            studentId,
            studentName,
            deliveryStatus: 'delivered',
          });

          // Retrieve from conversation history
          const retrieved = await Message.findById(saved._id).lean();

          expect(retrieved).not.toBeNull();
          expect(retrieved!.content).toBe(content);
          expect(retrieved!.subject).toBe(subject);
          expect(retrieved!.senderId.toString()).toBe(senderId);
          expect(retrieved!.recipientId.toString()).toBe(recipientId);
          expect(retrieved!.studentId.toString()).toBe(studentId);
          expect(retrieved!.senderName).toBe(senderName);
          expect(retrieved!.recipientName).toBe(recipientName);
          expect(retrieved!.studentName).toBe(studentName);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('messages are retrievable via conversationId query with matching content', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        objectIdArb,
        messageContentArb,
        messageSubjectArb,
        async (senderId, recipientId, studentId, content, subject) => {
          const saved = await createPersistedMessage({
            senderId,
            recipientId,
            content,
            subject,
            senderName: 'TestSender',
            recipientName: 'TestRecipient',
            studentId,
            studentName: 'TestStudent',
            deliveryStatus: 'delivered',
          });

          // Retrieve via conversationId (the way conversation history works)
          const messages = await Message.find({
            conversationId: saved.conversationId,
            isDeleted: false,
          }).lean();

          expect(messages.length).toBeGreaterThanOrEqual(1);

          const found = messages.find(m => m._id.toString() === saved._id.toString());
          expect(found).toBeDefined();
          expect(found!.content).toBe(content);
          expect(found!.subject).toBe(subject);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 26: Offline message retain-and-deliver
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 26: Offline message retain-and-deliver
describe('Property 26: Offline message retain-and-deliver', () => {
  it('messages to offline recipients are retained with pending status', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        objectIdArb,
        messageContentArb,
        messageSubjectArb,
        async (senderId, recipientId, studentId, content, subject) => {
          // Create a message with 'pending' status (simulating offline recipient)
          const saved = await createPersistedMessage({
            senderId,
            recipientId,
            content,
            subject,
            senderName: 'Sender',
            recipientName: 'Recipient',
            studentId,
            studentName: 'Student',
            deliveryStatus: 'pending',
          });

          // Verify the message is retained and queryable for delivery
          const pending = await Message.find({
            recipientId: new mongoose.Types.ObjectId(recipientId),
            deliveryStatus: 'pending',
            isDeleted: false,
          }).lean();

          expect(pending.length).toBeGreaterThanOrEqual(1);

          const found = pending.find(m => m._id.toString() === saved._id.toString());
          expect(found).toBeDefined();
          expect(found!.content).toBe(content);
          expect(found!.deliveryStatus).toBe('pending');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pending messages are delivered exactly once on reconnect (atomic claim)', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        objectIdArb,
        messageContentArb,
        messageSubjectArb,
        async (senderId, recipientId, studentId, content, subject) => {
          // Create a pending message
          const saved = await createPersistedMessage({
            senderId,
            recipientId,
            content,
            subject,
            senderName: 'Sender',
            recipientName: 'Recipient',
            studentId,
            studentName: 'Student',
            deliveryStatus: 'pending',
          });

          // Simulate the atomic claim used in deliverMissedMessages:
          // findOneAndUpdate with deliveryStatus: 'pending' → 'delivered'
          const claimed = await Message.findOneAndUpdate(
            { _id: saved._id, deliveryStatus: 'pending' },
            { $set: { deliveryStatus: 'delivered', deliveredAt: new Date() } },
            { new: true },
          );

          expect(claimed).not.toBeNull();
          expect(claimed!.deliveryStatus).toBe('delivered');
          expect(claimed!.deliveredAt).toBeDefined();

          // Second attempt to claim the same message should fail (exactly-once)
          const secondClaim = await Message.findOneAndUpdate(
            { _id: saved._id, deliveryStatus: 'pending' },
            { $set: { deliveryStatus: 'delivered', deliveredAt: new Date() } },
            { new: true },
          );

          expect(secondClaim).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all pending messages for a recipient are found on reconnect query', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        objectIdArb,
        fc.integer({ min: 1, max: 5 }),
        async (senderId, recipientId, studentId, messageCount) => {
          // Create multiple pending messages for the same recipient
          const baseTime = new Date(Date.now() - 60000); // 1 minute ago

          const savedIds: string[] = [];
          for (let i = 0; i < messageCount; i++) {
            const saved = await createPersistedMessage({
              senderId,
              recipientId,
              content: `Message ${i}`,
              subject: `Subject ${i}`,
              senderName: 'Sender',
              recipientName: 'Recipient',
              studentId,
              studentName: 'Student',
              deliveryStatus: 'pending',
            });
            savedIds.push(saved._id.toString());
          }

          // Query as deliverMissedMessages does: find pending messages after a timestamp
          const missedMessages = await Message.find({
            recipientId: new mongoose.Types.ObjectId(recipientId),
            createdAt: { $gt: baseTime },
            deliveryStatus: 'pending',
            isDeleted: false,
          })
            .sort({ createdAt: 1 })
            .lean();

          // All created messages should be found
          expect(missedMessages.length).toBeGreaterThanOrEqual(messageCount);

          for (const id of savedIds) {
            const found = missedMessages.find(m => m._id.toString() === id);
            expect(found).toBeDefined();
            expect(found!.deliveryStatus).toBe('pending');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
