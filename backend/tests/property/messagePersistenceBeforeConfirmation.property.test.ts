/**
 * Property-Based Test: Message Persistence Before Confirmation (Property 22)
 *
 * Feature: gurukul-ai-modernization, Property 22: Message Persistence Before Confirmation
 *
 * For any message processed by the Realtime_Layer, the message SHALL be
 * persisted to the database before a delivery confirmation event is emitted
 * to the sender.
 *
 * **Validates: Requirements 8.6**
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Tracks the order of operations (persist, confirmation) so we can verify
 * that persistence always happens before delivery confirmation.
 */
let operationLog: Array<{ op: 'persist' | 'delivery_confirmation' | 'delivery_failed'; messageId?: string }>;

const mockSave = jest.fn<() => Promise<Record<string, unknown>>>();
const mockUpdateOne = jest.fn<(filter: unknown, update: unknown) => Promise<{ modifiedCount: number }>>();

jest.unstable_mockModule('../../src/models/Message.js', () => {
  const MockMessage = jest.fn().mockImplementation((data: unknown) => {
    const msgData = data as Record<string, unknown>;
    return {
      ...msgData,
      _id: { toString: () => `msg-${msgData.senderId}-${Date.now()}` },
      conversationId: msgData.conversationId || `conv_${msgData.senderId}_${msgData.recipientId}`,
      createdAt: new Date(),
      save: mockSave,
    };
  });

  (MockMessage as unknown as Record<string, unknown>).updateOne = mockUpdateOne;

  return { default: MockMessage };
});

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock messaging RBAC - allow all messages for these tests
const mockValidateMessagingPermission = jest.fn<() => Promise<{ allowed: boolean; reason?: string }>>();
jest.unstable_mockModule('../../src/realtime/messagingRbac.js', () => ({
  validateMessagingPermission: mockValidateMessagingPermission,
  canPost: jest.fn().mockReturnValue({ allowed: true }),
  canJoin: jest.fn().mockReturnValue({ allowed: true }),
  resolveChannelType: jest.fn().mockReturnValue('parent_teacher'),
  CHANNEL_ROLE_PAIRS: {
    parent_teacher: ['parent', 'teacher'],
    teacher_student: ['teacher', 'student'],
    teacher_admin: ['teacher', 'admin'],
  },
  ALL_CHANNEL_TYPES: ['parent_teacher', 'teacher_student', 'teacher_admin'],
}));

// Mock envelope utilities
jest.unstable_mockModule('../../src/utils/envelope.js', () => ({
  failure: jest.fn((message: string, details?: unknown[]) => ({
    success: false,
    message,
    ...(details && { details }),
  })),
}));

const { setupMessageHandlers } = await import('../../src/realtime/messageHandler.js');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockSocket(userId: string, role: string) {
  const handlers = new Map<string, (...args: unknown[]) => void>();

  const socket = {
    user: { userId, role },
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emit: jest.fn(),
    __trigger: (event: string, ...args: unknown[]) => {
      const handler = handlers.get(event);
      if (handler) {
        return handler(...args);
      }
    },
  };

  return socket;
}

function createMockSocketManager(recipientConnected: boolean) {
  return {
    isUserConnected: jest.fn<(userId: string) => boolean>().mockReturnValue(recipientConnected),
    broadcastMessage: jest.fn(),
    emitDeliveryConfirmation: jest.fn((_userId: string, _messageId: string) => {
      operationLog.push({ op: 'delivery_confirmation', messageId: _messageId });
    }),
    emitTypingIndicator: jest.fn(),
    joinConversation: jest.fn(),
    deliverMissedMessages: jest.fn(),
    authenticateConnection: jest.fn(),
    getConnectedUsers: jest.fn(),
    getIO: jest.fn(),
  };
}

// Arbitrary for sender roles that are valid for messaging
const senderRoleArb = fc.constantFrom('parent', 'teacher');

// Arbitrary for recipient models
const recipientModelArb = fc.constantFrom<'Parent' | 'Faculty'>('Parent', 'Faculty');

// Arbitrary for message types
const messageTypeArb = fc.constantFrom<'general' | 'academic' | 'behavioral' | 'attendance' | 'urgent'>(
  'general', 'academic', 'behavioral', 'attendance', 'urgent'
);

// Arbitrary for priorities
const priorityArb = fc.constantFrom<'low' | 'normal' | 'high' | 'urgent'>(
  'low', 'normal', 'high', 'urgent'
);

// Arbitrary for a message payload
const messagePayloadArb = fc.record({
  subject: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  recipientId: fc.string({ minLength: 5, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
  recipientModel: recipientModelArb,
  recipientName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  studentId: fc.string({ minLength: 5, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
  studentName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  messageType: messageTypeArb,
  priority: priorityArb,
});

// Arbitrary for a sender user ID
const senderIdArb = fc.string({ minLength: 5, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 22: Message Persistence Before Confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    operationLog = [];
    mockValidateMessagingPermission.mockResolvedValue({ allowed: true });
  });

  /**
   * Property: For any message where the recipient is connected, the persist
   * operation (save) must complete successfully BEFORE emitDeliveryConfirmation
   * is called. We verify this by tracking the order of operations.
   */
  it('persistence always happens before delivery confirmation when recipient is online', () => {
    return fc.assert(
      fc.asyncProperty(
        senderIdArb,
        senderRoleArb,
        messagePayloadArb,
        async (senderId, senderRole, payload) => {
          // Reset state for each iteration
          jest.clearAllMocks();
          operationLog = [];
          mockValidateMessagingPermission.mockResolvedValue({ allowed: true });

          const messageId = `msg-${senderId}-${Date.now()}`;

          // Mock save to succeed and record the persist operation
          mockSave.mockImplementation(async () => {
            operationLog.push({ op: 'persist', messageId });
            return {
              _id: { toString: () => messageId },
              conversationId: `conv_${senderId}_${payload.recipientId}`,
              subject: payload.subject,
              content: payload.content,
              messageType: payload.messageType,
              priority: payload.priority,
              threadId: undefined,
              createdAt: new Date(),
            };
          });
          mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

          const socket = createMockSocket(senderId, senderRole);
          const socketManager = createMockSocketManager(true); // recipient connected

          // Override emitDeliveryConfirmation to track order
          socketManager.emitDeliveryConfirmation = jest.fn((_userId: string, _msgId: string) => {
            operationLog.push({ op: 'delivery_confirmation', messageId: _msgId });
          });

          setupMessageHandlers(socket as never, socketManager as never);
          await socket.__trigger('send_message', payload);

          // Verify that persist happened
          const persistOps = operationLog.filter(o => o.op === 'persist');
          const confirmOps = operationLog.filter(o => o.op === 'delivery_confirmation');

          expect(persistOps.length).toBe(1);
          expect(confirmOps.length).toBe(1);

          // Verify persist happened BEFORE confirmation
          const persistIndex = operationLog.findIndex(o => o.op === 'persist');
          const confirmIndex = operationLog.findIndex(o => o.op === 'delivery_confirmation');

          expect(persistIndex).toBeLessThan(confirmIndex);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When persistence fails, no delivery confirmation is ever emitted.
   * This ensures the persistence-first guarantee is not violated on failure paths.
   */
  it('no delivery confirmation is emitted when persistence fails', () => {
    return fc.assert(
      fc.asyncProperty(
        senderIdArb,
        senderRoleArb,
        messagePayloadArb,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        async (senderId, senderRole, payload, errorMessage) => {
          // Reset state
          jest.clearAllMocks();
          operationLog = [];
          mockValidateMessagingPermission.mockResolvedValue({ allowed: true });

          // Mock save to fail (simulate DB errors)
          mockSave.mockImplementation(async () => {
            operationLog.push({ op: 'persist' });
            throw new Error(errorMessage);
          });

          const socket = createMockSocket(senderId, senderRole);
          const socketManager = createMockSocketManager(true); // recipient connected

          socketManager.emitDeliveryConfirmation = jest.fn((_userId: string, _msgId: string) => {
            operationLog.push({ op: 'delivery_confirmation', messageId: _msgId });
          });

          setupMessageHandlers(socket as never, socketManager as never);
          await socket.__trigger('send_message', payload);

          // Verify that delivery confirmation was NEVER emitted
          const confirmOps = operationLog.filter(o => o.op === 'delivery_confirmation');
          expect(confirmOps.length).toBe(0);

          // Verify delivery failure event was emitted to sender
          expect(socket.emit).toHaveBeenCalledWith(
            'message_delivery_failed',
            expect.objectContaining({
              error: 'MESSAGE_PERSISTENCE_FAILED',
            })
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When recipient is offline, persistence still happens but no
   * delivery confirmation is emitted. The message survives for later delivery.
   */
  it('persistence happens without delivery confirmation when recipient is offline', () => {
    return fc.assert(
      fc.asyncProperty(
        senderIdArb,
        senderRoleArb,
        messagePayloadArb,
        async (senderId, senderRole, payload) => {
          // Reset state
          jest.clearAllMocks();
          operationLog = [];
          mockValidateMessagingPermission.mockResolvedValue({ allowed: true });

          const messageId = `msg-${senderId}-offline`;

          mockSave.mockImplementation(async () => {
            operationLog.push({ op: 'persist', messageId });
            return {
              _id: { toString: () => messageId },
              conversationId: `conv_${senderId}_${payload.recipientId}`,
              subject: payload.subject,
              content: payload.content,
              messageType: payload.messageType,
              priority: payload.priority,
              threadId: undefined,
              createdAt: new Date(),
            };
          });

          const socket = createMockSocket(senderId, senderRole);
          const socketManager = createMockSocketManager(false); // recipient NOT connected

          socketManager.emitDeliveryConfirmation = jest.fn((_userId: string, _msgId: string) => {
            operationLog.push({ op: 'delivery_confirmation', messageId: _msgId });
          });

          setupMessageHandlers(socket as never, socketManager as never);
          await socket.__trigger('send_message', payload);

          // Verify persistence happened
          const persistOps = operationLog.filter(o => o.op === 'persist');
          expect(persistOps.length).toBe(1);

          // Verify NO delivery confirmation was emitted
          const confirmOps = operationLog.filter(o => o.op === 'delivery_confirmation');
          expect(confirmOps.length).toBe(0);

          // Verify no delivery failure was emitted either (message is just pending)
          expect(socket.emit).not.toHaveBeenCalledWith(
            'message_delivery_failed',
            expect.anything()
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The temporal ordering guarantee holds regardless of message content,
   * sender role, or recipient model — persistence is ALWAYS the first step in the
   * message lifecycle before any confirmation event.
   */
  it('persistence-first ordering holds for all valid sender/recipient combinations', () => {
    return fc.assert(
      fc.asyncProperty(
        senderIdArb,
        senderRoleArb,
        messagePayloadArb,
        fc.boolean(), // whether recipient is online
        async (senderId, senderRole, payload, recipientOnline) => {
          // Reset state
          jest.clearAllMocks();
          operationLog = [];
          mockValidateMessagingPermission.mockResolvedValue({ allowed: true });

          const messageId = `msg-${senderId}-combined`;

          mockSave.mockImplementation(async () => {
            operationLog.push({ op: 'persist', messageId });
            return {
              _id: { toString: () => messageId },
              conversationId: `conv_${senderId}_${payload.recipientId}`,
              subject: payload.subject,
              content: payload.content,
              messageType: payload.messageType,
              priority: payload.priority,
              threadId: undefined,
              createdAt: new Date(),
            };
          });
          mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

          const socket = createMockSocket(senderId, senderRole);
          const socketManager = createMockSocketManager(recipientOnline);

          socketManager.emitDeliveryConfirmation = jest.fn((_userId: string, _msgId: string) => {
            operationLog.push({ op: 'delivery_confirmation', messageId: _msgId });
          });

          setupMessageHandlers(socket as never, socketManager as never);
          await socket.__trigger('send_message', payload);

          // Persistence must always be the first operation
          expect(operationLog.length).toBeGreaterThanOrEqual(1);
          expect(operationLog[0].op).toBe('persist');

          // If delivery confirmation exists, it must come after persistence
          const confirmOps = operationLog.filter(o => o.op === 'delivery_confirmation');
          if (confirmOps.length > 0) {
            const persistIndex = operationLog.findIndex(o => o.op === 'persist');
            const confirmIndex = operationLog.findIndex(o => o.op === 'delivery_confirmation');
            expect(persistIndex).toBeLessThan(confirmIndex);
          }

          // Delivery confirmation should only exist when recipient is online
          if (recipientOnline) {
            expect(confirmOps.length).toBe(1);
          } else {
            expect(confirmOps.length).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
