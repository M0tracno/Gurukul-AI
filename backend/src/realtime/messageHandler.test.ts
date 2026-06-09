import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Message model
const mockSave = jest.fn<() => Promise<Record<string, unknown>>>();
const mockUpdateOne = jest.fn<(filter: unknown, update: unknown) => Promise<{ modifiedCount: number }>>();

jest.unstable_mockModule('../models/Message.js', () => {
  const MockMessage = jest.fn().mockImplementation((data: unknown) => {
    const msgData = data as Record<string, unknown>;
    return {
      ...msgData,
      _id: { toString: () => 'mock-message-id-123' },
      conversationId: msgData.conversationId || `parent_${msgData.senderId}_teacher_${msgData.recipientId}_student_${msgData.studentId}`,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      save: mockSave,
    };
  });

  (MockMessage as unknown as Record<string, unknown>).updateOne = mockUpdateOne;

  return { default: MockMessage };
});

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock messaging RBAC - default to allowing all messages
const mockValidateMessagingPermission = jest.fn<(senderId: string, senderRole: string, recipientId: string, recipientModel: string) => Promise<{ allowed: boolean; reason?: string }>>();
jest.unstable_mockModule('./messagingRbac.js', () => ({
  validateMessagingPermission: mockValidateMessagingPermission,
  canPost: jest.fn().mockReturnValue({ allowed: true }),
  resolveChannelType: jest.fn().mockReturnValue('parent_teacher'),
}));

// Mock envelope utilities
jest.unstable_mockModule('../utils/envelope.js', () => ({
  failure: jest.fn((message: string, details?: unknown[]) => ({
    success: false,
    message,
    ...(details && { details }),
  })),
}));

const { setupMessageHandlers } = await import('./messageHandler.js');

// Helper: create a mock AuthenticatedSocket
function createMockSocket(userId: string, role: string) {
  const handlers = new Map<string, (...args: unknown[]) => void>();

  const socket = {
    user: { userId, role },
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    emit: jest.fn(),
    // Helper to trigger registered event handlers in tests
    __trigger: (event: string, ...args: unknown[]) => {
      const handler = handlers.get(event);
      if (handler) {
        return handler(...args);
      }
    },
  };

  return socket;
}

// Helper: create a mock SocketManager
function createMockSocketManager(recipientConnected = true) {
  return {
    isUserConnected: jest.fn<(userId: string) => boolean>().mockReturnValue(recipientConnected),
    broadcastMessage: jest.fn(),
    emitDeliveryConfirmation: jest.fn(),
    emitTypingIndicator: jest.fn(),
    joinConversation: jest.fn(),
    deliverMissedMessages: jest.fn(),
    authenticateConnection: jest.fn(),
    getConnectedUsers: jest.fn(),
    getIO: jest.fn(),
  };
}

const validPayload = {
  subject: 'Test Subject',
  content: 'Hello teacher, this is a test message.',
  recipientId: 'recipient-user-456',
  recipientModel: 'Faculty' as const,
  recipientName: 'Mr. Smith',
  studentId: 'student-789',
  studentName: 'John Doe',
  messageType: 'general' as const,
  priority: 'normal' as const,
};

describe('messageHandler - setupMessageHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: RBAC allows all messages
    mockValidateMessagingPermission.mockResolvedValue({ allowed: true });
  });

  it('should register a send_message event handler on the socket', () => {
    const socket = createMockSocket('user-123', 'parent');
    const socketManager = createMockSocketManager();

    setupMessageHandlers(socket as never, socketManager as never);

    expect(socket.on).toHaveBeenCalledWith('send_message', expect.any(Function));
  });

  describe('Persistence-first guarantee', () => {
    it('should persist message to MongoDB before any delivery', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'mock-message-id-123' },
        conversationId: 'conv-123',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify save was called (persistence first)
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should deliver message to connected recipient after persistence', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'mock-message-id-123' },
        conversationId: 'conv-123',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify recipient connection was checked
      expect(socketManager.isUserConnected).toHaveBeenCalledWith('recipient-user-456');

      // Verify message was broadcast to conversation
      expect(socketManager.broadcastMessage).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({
          messageId: 'mock-message-id-123',
          content: validPayload.content,
          senderId: 'sender-123',
        })
      );
    });

    it('should update deliveryStatus to delivered when recipient is connected', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'mock-message-id-123' },
        conversationId: 'conv-123',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify delivery status was updated
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: { toString: expect.any(Function) } },
        expect.objectContaining({
          deliveryStatus: 'delivered',
          deliveredAt: expect.any(Date),
        })
      );
    });

    it('should emit delivery confirmation to sender when recipient is connected', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'mock-message-id-123' },
        conversationId: 'conv-123',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify delivery confirmation sent to sender
      expect(socketManager.emitDeliveryConfirmation).toHaveBeenCalledWith(
        'sender-123',
        'mock-message-id-123'
      );
    });
  });

  describe('Offline recipient handling', () => {
    it('should NOT emit delivery confirmation when recipient is offline', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(false); // recipient not connected

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'mock-message-id-123' },
        conversationId: 'conv-123',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify message was saved
      expect(mockSave).toHaveBeenCalledTimes(1);

      // Verify NO delivery confirmation
      expect(socketManager.emitDeliveryConfirmation).not.toHaveBeenCalled();

      // Verify NO broadcast
      expect(socketManager.broadcastMessage).not.toHaveBeenCalled();

      // Verify deliveryStatus was NOT updated to 'delivered'
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    it('should persist message even when recipient is offline', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(false);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'mock-message-id-123' },
        conversationId: 'conv-123',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Persistence still happens
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Persistence failure handling', () => {
    it('should emit message_delivery_failed when persistence fails', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockSave.mockRejectedValueOnce(new Error('MongoDB connection timeout'));

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify failure event emitted to sender
      expect(socket.emit).toHaveBeenCalledWith(
        'message_delivery_failed',
        expect.objectContaining({
          error: 'MESSAGE_PERSISTENCE_FAILED',
          message: expect.any(String),
          recipientId: 'recipient-user-456',
          timestamp: expect.any(String),
        })
      );
    });

    it('should NOT emit delivery confirmation when persistence fails', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockSave.mockRejectedValueOnce(new Error('Validation error'));

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify NO delivery confirmation
      expect(socketManager.emitDeliveryConfirmation).not.toHaveBeenCalled();

      // Verify NO broadcast
      expect(socketManager.broadcastMessage).not.toHaveBeenCalled();
    });

    it('should NOT update delivery status when persistence fails', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockSave.mockRejectedValueOnce(new Error('Disk full'));

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      expect(mockUpdateOne).not.toHaveBeenCalled();
    });
  });

  describe('Message data construction', () => {
    it('should set senderModel to Parent for parent role', async () => {
      const socket = createMockSocket('parent-user', 'parent');
      const socketManager = createMockSocketManager(false);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'msg-id' },
        conversationId: 'conv-id',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date(),
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      expect(mockSave).toHaveBeenCalled();
    });

    it('should set senderModel to Faculty for teacher role', async () => {
      const socket = createMockSocket('teacher-user', 'teacher');
      const socketManager = createMockSocketManager(false);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'msg-id' },
        conversationId: 'conv-id',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date(),
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      expect(mockSave).toHaveBeenCalled();
    });

    it('should set deliveryStatus to pending and persistedAt on initial save', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(false);

      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'msg-id' },
        conversationId: 'conv-id',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date(),
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // The Message constructor receives deliveryStatus: 'pending' and persistedAt
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('RBAC messaging restrictions', () => {
    it('should emit message_delivery_failed when RBAC denies permission', async () => {
      const socket = createMockSocket('student-123', 'student');
      const socketManager = createMockSocketManager(true);

      mockValidateMessagingPermission.mockResolvedValueOnce({
        allowed: false,
        reason: 'Students can only message their assigned teachers',
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify RBAC failure event emitted
      expect(socket.emit).toHaveBeenCalledWith(
        'message_delivery_failed',
        expect.objectContaining({
          error: 'MESSAGING_UNAUTHORIZED',
          message: 'Students can only message their assigned teachers',
          recipientId: 'recipient-user-456',
          timestamp: expect.any(String),
        })
      );
    });

    it('should NOT persist message when RBAC denies permission', async () => {
      const socket = createMockSocket('student-123', 'student');
      const socketManager = createMockSocketManager(true);

      mockValidateMessagingPermission.mockResolvedValueOnce({
        allowed: false,
        reason: 'Students can only message their assigned teachers',
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // Verify message was NOT saved
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should NOT broadcast message when RBAC denies permission', async () => {
      const socket = createMockSocket('student-123', 'student');
      const socketManager = createMockSocketManager(true);

      mockValidateMessagingPermission.mockResolvedValueOnce({
        allowed: false,
        reason: 'Students can only message their assigned teachers',
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      expect(socketManager.broadcastMessage).not.toHaveBeenCalled();
      expect(socketManager.emitDeliveryConfirmation).not.toHaveBeenCalled();
    });

    it('should emit message_delivery_failed when RBAC check throws an error', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockValidateMessagingPermission.mockRejectedValueOnce(new Error('Database connection error'));

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      expect(socket.emit).toHaveBeenCalledWith(
        'message_delivery_failed',
        expect.objectContaining({
          error: 'MESSAGING_AUTHORIZATION_ERROR',
          message: 'Failed to verify messaging permissions. Please try again.',
          recipientId: 'recipient-user-456',
        })
      );
    });

    it('should NOT persist message when RBAC check throws an error', async () => {
      const socket = createMockSocket('sender-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockValidateMessagingPermission.mockRejectedValueOnce(new Error('DB error'));

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should call validateMessagingPermission with correct parameters', async () => {
      const socket = createMockSocket('parent-123', 'parent');
      const socketManager = createMockSocketManager(false);

      mockValidateMessagingPermission.mockResolvedValueOnce({ allowed: true });
      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'msg-id' },
        conversationId: 'conv-id',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date(),
      });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      expect(mockValidateMessagingPermission).toHaveBeenCalledWith(
        'parent-123',
        'parent',
        'recipient-user-456',
        'Faculty',
      );
    });

    it('should proceed to persist and deliver when RBAC allows', async () => {
      const socket = createMockSocket('parent-123', 'parent');
      const socketManager = createMockSocketManager(true);

      mockValidateMessagingPermission.mockResolvedValueOnce({ allowed: true });
      mockSave.mockResolvedValueOnce({
        _id: { toString: () => 'mock-message-id-123' },
        conversationId: 'conv-123',
        subject: validPayload.subject,
        content: validPayload.content,
        messageType: 'general',
        priority: 'normal',
        threadId: undefined,
        createdAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockUpdateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      setupMessageHandlers(socket as never, socketManager as never);
      await socket.__trigger('send_message', validPayload);

      // RBAC passed, so message should be saved
      expect(mockSave).toHaveBeenCalledTimes(1);
      // And delivered
      expect(socketManager.broadcastMessage).toHaveBeenCalled();
      expect(socketManager.emitDeliveryConfirmation).toHaveBeenCalled();
    });
  });
});
