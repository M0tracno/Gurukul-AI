/**
 * Property-Based Test: Missed Message Delivery on Reconnection (Property 21)
 *
 * Feature: gurukul-ai-modernization, Property 21: Missed Message Delivery on Reconnection
 *
 * For any set of messages sent to a user while they are disconnected, all such messages
 * SHALL be delivered to the user upon their next successful WebSocket connection, using
 * the last-received message timestamp as the synchronization point.
 *
 * **Validates: Requirements 8.5, 8.8**
 */

import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Server as SocketIOServer } from 'socket.io';

// ---------------------------------------------------------------------------
// Mock modules that SocketManager imports
// ---------------------------------------------------------------------------

// Mock authTokenService to avoid real JWT validation during constructor
jest.unstable_mockModule('../../src/services/authTokenService.js', () => ({
  authTokenService: {
    validateAccessToken: jest.fn<() => Promise<{ userId: string; role: string }>>()
      .mockResolvedValue({ userId: 'test-user', role: 'Student' }),
  },
  AuthTokenService: class {
    validateAccessToken = jest.fn<() => Promise<{ userId: string; role: string }>>()
      .mockResolvedValue({ userId: 'test-user', role: 'Student' });
  },
}));

// Mock logger to suppress noise
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock typingHandler since it's not relevant here
jest.unstable_mockModule('../../src/realtime/typingHandler.js', () => ({
  setupTypingHandlers: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Dynamic imports after mocks
// ---------------------------------------------------------------------------

const { SocketManager } = await import('../../src/realtime/socketManager.js');
const MessageModule = await import('../../src/models/Message.js');
const Message = MessageModule.default;

// ---------------------------------------------------------------------------
// Setup MongoDB Memory Server
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a message in the database simulating one sent while user was offline.
 */
async function createPendingMessage(
  recipientId: string,
  senderId: string,
  createdAt: Date,
  content: string
): Promise<mongoose.Types.ObjectId> {
  const senderOid = new mongoose.Types.ObjectId(senderId);
  const recipientOid = new mongoose.Types.ObjectId(recipientId);
  const studentOid = new mongoose.Types.ObjectId();

  const msg = await Message.create({
    conversationId: `conv_${senderId}_${recipientId}`,
    subject: 'Test Message',
    content,
    senderId: senderOid,
    senderModel: 'Faculty',
    senderName: 'Test Teacher',
    recipientId: recipientOid,
    recipientModel: 'Parent',
    recipientName: 'Test Parent',
    studentId: studentOid,
    studentName: 'Test Student',
    deliveryStatus: 'pending',
    isDeleted: false,
    createdAt,
    updatedAt: createdAt,
  });

  return msg._id as mongoose.Types.ObjectId;
}

/**
 * Generate a valid 24-character hex string for a MongoDB ObjectId.
 */
function generateObjectIdHex(): string {
  return new mongoose.Types.ObjectId().toHexString();
}

/**
 * Create a mock Socket.IO server that tracks emitted events.
 */
function createMockSocketIO() {
  const emittedEvents: Array<{ room: string; event: string; data: unknown }> = [];

  const mockTo = jest.fn((room: string) => ({
    emit: (event: string, data: unknown) => {
      emittedEvents.push({ room, event, data });
      return true;
    },
  }));

  const mockSocketsMap = new Map();

  const mockIO = {
    to: mockTo,
    sockets: {
      sockets: mockSocketsMap,
    },
    on: jest.fn(),
    use: jest.fn(),
  } as unknown as SocketIOServer;

  return { mockIO, emittedEvents };
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 21: Missed Message Delivery on Reconnection', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear messages collection before each test
    await Message.deleteMany({});
  });

  /**
   * Property: For any set of N messages (1..30) sent to a user while disconnected,
   * all N messages are delivered to the user's room when deliverMissedMessages is called
   * with the last-received message timestamp as the synchronization point.
   *
   * Validates: Requirements 8.5, 8.8
   */
  it('should deliver all messages sent during disconnection on reconnect', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate number of missed messages (1..30)
        fc.integer({ min: 1, max: 30 }),
        async (numMessages) => {
          // Clean slate
          await Message.deleteMany({});

          const recipientId = generateObjectIdHex();
          const senderId = generateObjectIdHex();

          // The "last received message" timestamp — messages after this should be delivered
          const lastReceivedTimestamp = new Date('2024-01-01T12:00:00.000Z');

          // Create messages that were sent AFTER the last received timestamp
          const createdMessageIds: string[] = [];
          for (let i = 0; i < numMessages; i++) {
            // Each message is created at increasing intervals after the lastReceivedTimestamp
            const msgTime = new Date(lastReceivedTimestamp.getTime() + (i + 1) * 60000);
            const id = await createPendingMessage(
              recipientId,
              senderId,
              msgTime,
              `Missed message ${i + 1}`
            );
            createdMessageIds.push(id.toString());
          }

          // Create the mock Socket.IO and SocketManager
          const { mockIO, emittedEvents } = createMockSocketIO();
          const socketManager = new SocketManager(mockIO);

          // Call deliverMissedMessages to simulate reconnection sync
          await socketManager.deliverMissedMessages(recipientId, lastReceivedTimestamp);

          // Filter events emitted to the user's personal room
          const userRoomEvents = emittedEvents.filter(
            (e) => e.room === `user_${recipientId}` && e.event === 'new_message'
          );

          // Property: ALL missed messages must be delivered
          expect(userRoomEvents.length).toBe(numMessages);

          // Verify each message was delivered
          const deliveredMessageIds = userRoomEvents.map(
            (e) => ((e.data as Record<string, unknown>)._id as mongoose.Types.ObjectId).toString()
          );

          for (const id of createdMessageIds) {
            expect(deliveredMessageIds).toContain(id);
          }

          // Verify all messages are now marked as 'delivered'
          const updatedMessages = await Message.find({
            _id: { $in: createdMessageIds.map((id) => new mongoose.Types.ObjectId(id)) },
          });

          for (const msg of updatedMessages) {
            expect(msg.deliveryStatus).toBe('delivered');
            expect(msg.deliveredAt).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: Messages created BEFORE the last-received timestamp should NOT be delivered,
   * even if they exist in pending state. Only messages created AFTER the timestamp
   * are delivered on reconnection.
   *
   * Validates: Requirements 8.5, 8.8
   */
  it('should only deliver messages created after the last-received timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Number of messages BEFORE timestamp (shouldn't be delivered)
        fc.integer({ min: 1, max: 10 }),
        // Number of messages AFTER timestamp (should be delivered)
        fc.integer({ min: 1, max: 20 }),
        async (numBefore, numAfter) => {
          await Message.deleteMany({});

          const recipientId = generateObjectIdHex();
          const senderId = generateObjectIdHex();

          const lastReceivedTimestamp = new Date('2024-06-15T10:00:00.000Z');

          // Create messages BEFORE the timestamp (should NOT be delivered)
          for (let i = 0; i < numBefore; i++) {
            const msgTime = new Date(lastReceivedTimestamp.getTime() - (i + 1) * 60000);
            await createPendingMessage(recipientId, senderId, msgTime, `Old message ${i}`);
          }

          // Create messages AFTER the timestamp (SHOULD be delivered)
          const afterMessageIds: string[] = [];
          for (let i = 0; i < numAfter; i++) {
            const msgTime = new Date(lastReceivedTimestamp.getTime() + (i + 1) * 60000);
            const id = await createPendingMessage(
              recipientId,
              senderId,
              msgTime,
              `New message ${i}`
            );
            afterMessageIds.push(id.toString());
          }

          const { mockIO, emittedEvents } = createMockSocketIO();
          const socketManager = new SocketManager(mockIO);

          await socketManager.deliverMissedMessages(recipientId, lastReceivedTimestamp);

          // Filter events emitted to the user's personal room
          const userRoomEvents = emittedEvents.filter(
            (e) => e.room === `user_${recipientId}` && e.event === 'new_message'
          );

          // Property: Only messages AFTER timestamp are delivered
          expect(userRoomEvents.length).toBe(numAfter);

          // Messages before timestamp should still be 'pending'
          const oldMessages = await Message.find({
            recipientId: new mongoose.Types.ObjectId(recipientId),
            createdAt: { $lte: lastReceivedTimestamp },
          });

          for (const msg of oldMessages) {
            expect(msg.deliveryStatus).toBe('pending');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: Messages that are already 'delivered' or messages for other recipients
   * should NOT be re-delivered when a specific user reconnects.
   *
   * Validates: Requirements 8.5, 8.8
   */
  it('should not re-deliver already delivered messages or messages for other users', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Number of pending messages for THIS user
        fc.integer({ min: 1, max: 15 }),
        // Number of already-delivered messages for THIS user
        fc.integer({ min: 0, max: 10 }),
        // Number of pending messages for OTHER user
        fc.integer({ min: 0, max: 10 }),
        async (numPending, numDelivered, numOtherUser) => {
          await Message.deleteMany({});

          const recipientId = generateObjectIdHex();
          const otherUserId = generateObjectIdHex();
          const senderId = generateObjectIdHex();

          const lastReceivedTimestamp = new Date('2024-03-01T08:00:00.000Z');

          // Create pending messages for THIS user (should be delivered)
          const pendingIds: string[] = [];
          for (let i = 0; i < numPending; i++) {
            const msgTime = new Date(lastReceivedTimestamp.getTime() + (i + 1) * 60000);
            const id = await createPendingMessage(
              recipientId,
              senderId,
              msgTime,
              `Pending for target ${i}`
            );
            pendingIds.push(id.toString());
          }

          // Create already-delivered messages for THIS user (should NOT be re-delivered)
          for (let i = 0; i < numDelivered; i++) {
            const msgTime = new Date(lastReceivedTimestamp.getTime() + (i + 1) * 60000);
            const senderOid = new mongoose.Types.ObjectId(senderId);
            const recipientOid = new mongoose.Types.ObjectId(recipientId);
            const studentOid = new mongoose.Types.ObjectId();

            await Message.create({
              conversationId: `conv_${senderId}_${recipientId}`,
              subject: 'Already Delivered',
              content: `Already delivered ${i}`,
              senderId: senderOid,
              senderModel: 'Faculty',
              senderName: 'Test Teacher',
              recipientId: recipientOid,
              recipientModel: 'Parent',
              recipientName: 'Test Parent',
              studentId: studentOid,
              studentName: 'Test Student',
              deliveryStatus: 'delivered',
              deliveredAt: new Date(),
              isDeleted: false,
              createdAt: msgTime,
              updatedAt: msgTime,
            });
          }

          // Create pending messages for OTHER user (should NOT be delivered to our user)
          for (let i = 0; i < numOtherUser; i++) {
            const msgTime = new Date(lastReceivedTimestamp.getTime() + (i + 1) * 60000);
            await createPendingMessage(
              otherUserId,
              senderId,
              msgTime,
              `Pending for other user ${i}`
            );
          }

          const { mockIO, emittedEvents } = createMockSocketIO();
          const socketManager = new SocketManager(mockIO);

          await socketManager.deliverMissedMessages(recipientId, lastReceivedTimestamp);

          // Filter events emitted to the target user's personal room
          const userRoomEvents = emittedEvents.filter(
            (e) => e.room === `user_${recipientId}` && e.event === 'new_message'
          );

          // Property: Only pending messages for THIS user should be delivered
          expect(userRoomEvents.length).toBe(numPending);

          // Verify correct messages were delivered
          const deliveredIds = userRoomEvents.map(
            (e) => ((e.data as Record<string, unknown>)._id as mongoose.Types.ObjectId).toString()
          );

          for (const id of pendingIds) {
            expect(deliveredIds).toContain(id);
          }

          // Messages for other user should remain pending
          const otherUserMessages = await Message.find({
            recipientId: new mongoose.Types.ObjectId(otherUserId),
          });
          for (const msg of otherUserMessages) {
            expect(msg.deliveryStatus).toBe('pending');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: Delivery confirmation events should be emitted to the sender
   * for each missed message that is delivered upon reconnection.
   *
   * Validates: Requirements 8.5, 8.8
   */
  it('should emit delivery confirmation to senders for each delivered message', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Number of messages from distinct senders
        fc.integer({ min: 1, max: 20 }),
        async (numMessages) => {
          await Message.deleteMany({});

          const recipientId = generateObjectIdHex();
          const lastReceivedTimestamp = new Date('2024-05-01T00:00:00.000Z');

          // Create messages from different senders
          const senderMessagePairs: Array<{ senderId: string; messageId: string }> = [];
          for (let i = 0; i < numMessages; i++) {
            const senderId = generateObjectIdHex();
            const msgTime = new Date(lastReceivedTimestamp.getTime() + (i + 1) * 60000);
            const id = await createPendingMessage(recipientId, senderId, msgTime, `Msg ${i}`);
            senderMessagePairs.push({ senderId, messageId: id.toString() });
          }

          const { mockIO, emittedEvents } = createMockSocketIO();
          const socketManager = new SocketManager(mockIO);

          await socketManager.deliverMissedMessages(recipientId, lastReceivedTimestamp);

          // Filter delivery confirmation events
          const confirmationEvents = emittedEvents.filter(
            (e) => e.event === 'message_delivered'
          );

          // Property: One delivery confirmation per delivered message
          expect(confirmationEvents.length).toBe(numMessages);

          // Each confirmation should go to the correct sender's room
          for (const pair of senderMessagePairs) {
            const confirmation = confirmationEvents.find(
              (e) =>
                e.room === `user_${pair.senderId}` &&
                (e.data as Record<string, unknown>).messageId === pair.messageId
            );
            expect(confirmation).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);
});
