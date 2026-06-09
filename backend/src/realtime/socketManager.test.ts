import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const mockValidateAccessToken = jest.fn<(token: string) => Promise<{ userId: string; role: string; iat: number; exp: number }>>();

// Mock Message model
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFind = jest.fn<(...args: any[]) => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateOne = jest.fn<(...args: any[]) => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindOneAndUpdate = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule('../models/Message.js', () => ({
  default: {
    find: mockFind,
    updateOne: mockUpdateOne,
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

// Use unstable_mockModule for proper ESM mocking
jest.unstable_mockModule('../services/authTokenService.js', () => ({
  authTokenService: {
    validateAccessToken: mockValidateAccessToken,
  },
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock messageHandler since socketManager imports it
jest.unstable_mockModule('./messageHandler.js', () => ({
  setupMessageHandlers: jest.fn(),
}));

// Mock messagingRbac since socketManager imports it
jest.unstable_mockModule('./messagingRbac.js', () => ({
  canJoin: jest.fn<() => { allowed: boolean }>().mockReturnValue({ allowed: true }),
  canPost: jest.fn<() => { allowed: boolean }>().mockReturnValue({ allowed: true }),
  resolveChannelType: jest.fn<() => string>().mockReturnValue('parent_teacher'),
  validateMessagingPermission: jest.fn<() => Promise<{ allowed: boolean }>>().mockResolvedValue({ allowed: true }),
  CHANNEL_ROLE_PAIRS: {
    parent_teacher: ['parent', 'teacher'],
    teacher_student: ['teacher', 'student'],
    teacher_admin: ['teacher', 'admin'],
  },
  ALL_CHANNEL_TYPES: ['parent_teacher', 'teacher_student', 'teacher_admin'],
}));

// Mock envelope utilities
jest.unstable_mockModule('../utils/envelope.js', () => ({
  failure: jest.fn((message: string, details?: unknown[]) => ({
    success: false,
    message,
    ...(details && { details }),
  })),
}));

// Dynamic imports after mocks are registered
const { SocketManager, createSocketManager } = await import('./socketManager.js');

const TEST_PORT = 0; // OS-assigned port to avoid conflicts with parallel test workers
const JWT_SECRET = 'test-secret-key';

function generateTestToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
}

describe('SocketManager', () => {
  let httpServer: http.Server;
  let socketManager: InstanceType<typeof SocketManager>;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll((done) => {
    httpServer = http.createServer();
    socketManager = createSocketManager(httpServer);
    httpServer.listen(TEST_PORT, () => {
      const addr = httpServer.address();
      serverPort = typeof addr === 'object' && addr ? addr.port : TEST_PORT;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    socketManager.getIO().close();
    httpServer.close(done);
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    mockValidateAccessToken.mockReset();
    mockFind.mockReset();
    mockUpdateOne.mockReset();
  });

  describe('Authentication', () => {
    it('should reject connections without a token', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: {},
        transports: ['websocket'],
      });

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication token required');
        done();
      });
    });

    it('should reject connections with an invalid token', (done) => {
      mockValidateAccessToken.mockRejectedValueOnce(
        new Error('Invalid access token')
      );

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      clientSocket.on('connect_error', (err) => {
        expect(err.message).toBe('Invalid authentication token');
        done();
      });
    });

    it('should accept connections with a valid token', (done) => {
      const token = generateTestToken('user123', 'student');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user123',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        expect(socketManager.isUserConnected('user123')).toBe(true);
        done();
      });
    });
  });

  describe('Connection tracking', () => {
    it('should track connected users and remove them on disconnect', (done) => {
      const token = generateTestToken('user456', 'teacher');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user456',
        role: 'teacher',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        expect(socketManager.isUserConnected('user456')).toBe(true);

        const users = socketManager.getConnectedUsers();
        const userInfo = users.get('user456');
        expect(userInfo).toBeDefined();
        expect(userInfo!.role).toBe('teacher');
        expect(userInfo!.userId).toBe('user456');

        clientSocket.disconnect();

        // Give a small delay for the disconnect event to propagate
        setTimeout(() => {
          expect(socketManager.isUserConnected('user456')).toBe(false);
          done();
        }, 100);
      });
    });
  });

  describe('Conversation rooms', () => {
    it('should allow users to join and leave conversation rooms', (done) => {
      const token = generateTestToken('user789', 'student');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user789',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join_conversation', 'conv-abc');

        // Give a small delay for the room join to process
        setTimeout(() => {
          // Verify the socket is in the room by checking server-side
          const io = socketManager.getIO();
          const rooms = io.sockets.adapter.rooms;
          expect(rooms.has('conversation_conv-abc')).toBe(true);

          clientSocket.emit('leave_conversation', 'conv-abc');

          setTimeout(() => {
            expect(rooms.has('conversation_conv-abc')).toBe(false);
            done();
          }, 100);
        }, 100);
      });
    });
  });

  describe('ISocketManager interface methods', () => {
    it('authenticateConnection should validate a token', async () => {
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'testuser',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      const decoded = await socketManager.authenticateConnection('some-token');
      expect(decoded.userId).toBe('testuser');
      expect(decoded.role).toBe('admin');
    });

    it('broadcastMessage should emit to conversation room', (done) => {
      const token = generateTestToken('user-broadcast', 'student');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user-broadcast',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join_conversation', 'conv-broadcast');

        clientSocket.on('new_message', (msg) => {
          expect(msg).toEqual({ text: 'hello', from: 'someone' });
          done();
        });

        setTimeout(() => {
          socketManager.broadcastMessage('conv-broadcast', { text: 'hello', from: 'someone' });
        }, 100);
      });
    });

    it('emitDeliveryConfirmation should emit to user room', (done) => {
      const token = generateTestToken('user-confirm', 'teacher');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user-confirm',
        role: 'teacher',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.on('message_delivered', (data) => {
          expect(data.messageId).toBe('msg-123');
          expect(data.timestamp).toBeDefined();
          done();
        });

        setTimeout(() => {
          socketManager.emitDeliveryConfirmation('user-confirm', 'msg-123');
        }, 100);
      });
    });

    it('emitTypingIndicator should broadcast typing events', (done) => {
      const token = generateTestToken('user-typing', 'parent');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user-typing',
        role: 'parent',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('join_conversation', 'conv-typing');

        clientSocket.on('user_typing', (data) => {
          expect(data.userId).toBe('another-user');
          expect(data.conversationId).toBe('conv-typing');
          done();
        });

        setTimeout(() => {
          socketManager.emitTypingIndicator('conv-typing', 'another-user', true);
        }, 100);
      });
    });
  });

  describe('createSocketManager factory', () => {
    it('should create a SocketManager with a configured Socket.IO server', () => {
      const testServer = http.createServer();
      const manager = createSocketManager(testServer);

      expect(manager).toBeInstanceOf(SocketManager);
      expect(manager.getIO()).toBeInstanceOf(SocketIOServer);

      manager.getIO().close();
    });
  });

  describe('sync_messages and deliverMissedMessages', () => {
    it('should deliver missed messages when sync_messages is emitted', (done) => {
      const token = generateTestToken('user-sync', 'student');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user-sync',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      const missedMessage = {
        _id: 'msg-missed-1',
        senderId: 'sender-1',
        recipientId: 'user-sync',
        content: 'Hello, you missed this!',
        createdAt: new Date(),
        deliveryStatus: 'pending',
      };

      // Mock Message.find to return missed messages
      mockFind.mockReturnValueOnce({
        sort: () => ({
          lean: () => Promise.resolve([missedMessage]),
        }),
      });
      mockFindOneAndUpdate.mockResolvedValueOnce(missedMessage);

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      const receivedMessages: unknown[] = [];

      clientSocket.on('connect', () => {
        clientSocket.on('new_message', (msg) => {
          receivedMessages.push(msg);
        });

        clientSocket.on('sync_complete', (data) => {
          expect(data.userId).toBe('user-sync');
          expect(data.syncedAt).toBeDefined();
          expect(receivedMessages.length).toBe(1);
          // Socket.IO serializes Date to string, so compare individual fields
          const received = receivedMessages[0] as Record<string, unknown>;
          expect(received._id).toBe(missedMessage._id);
          expect(received.senderId).toBe(missedMessage.senderId);
          expect(received.recipientId).toBe(missedMessage.recipientId);
          expect(received.content).toBe(missedMessage.content);
          expect(received.deliveryStatus).toBe(missedMessage.deliveryStatus);
          expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'msg-missed-1', deliveryStatus: 'pending' },
            { $set: { deliveryStatus: 'delivered', deliveredAt: expect.any(Date) } },
            { new: true }
          );
          done();
        });

        setTimeout(() => {
          clientSocket.emit('sync_messages', {
            lastMessageTimestamp: new Date(Date.now() - 60000).toISOString(),
          });
        }, 100);
      });
    });

    it('should emit sync_complete with no messages when none are pending', (done) => {
      const token = generateTestToken('user-sync-empty', 'teacher');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user-sync-empty',
        role: 'teacher',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      // Mock Message.find to return empty array
      mockFind.mockReturnValueOnce({
        sort: () => ({
          lean: () => Promise.resolve([]),
        }),
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.on('sync_complete', (data) => {
          expect(data.userId).toBe('user-sync-empty');
          expect(data.syncedAt).toBeDefined();
          done();
        });

        setTimeout(() => {
          clientSocket.emit('sync_messages', {
            lastMessageTimestamp: new Date().toISOString(),
          });
        }, 100);
      });
    });

    it('should emit sync_error when invalid timestamp is provided', (done) => {
      const token = generateTestToken('user-sync-bad', 'parent');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user-sync-bad',
        role: 'parent',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.on('sync_error', (data) => {
          expect(data.error).toBe('invalid_timestamp');
          expect(data.message).toBe('Invalid lastMessageTimestamp provided');
          done();
        });

        setTimeout(() => {
          clientSocket.emit('sync_messages', {
            lastMessageTimestamp: 'not-a-valid-date',
          });
        }, 100);
      });
    });

    it('should emit sync_error when database query fails', (done) => {
      const token = generateTestToken('user-sync-fail', 'student');
      mockValidateAccessToken.mockResolvedValueOnce({
        userId: 'user-sync-fail',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      // Mock Message.find to throw an error
      mockFind.mockReturnValueOnce({
        sort: () => ({
          lean: () => Promise.reject(new Error('Database connection lost')),
        }),
      });

      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        clientSocket.on('sync_error', (data) => {
          expect(data.error).toBe('sync_failed');
          expect(data.message).toBe('Failed to synchronize missed messages');
          done();
        });

        setTimeout(() => {
          clientSocket.emit('sync_messages', {
            lastMessageTimestamp: new Date().toISOString(),
          });
        }, 100);
      });
    });
  });
});
