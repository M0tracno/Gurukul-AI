import { describe, it, expect, beforeAll, afterAll, afterEach, jest, beforeEach } from '@jest/globals';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';

const mockValidateAccessToken = jest.fn<(token: string) => Promise<{ userId: string; role: string; iat: number; exp: number }>>();

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

const { createSocketManager, SocketManager } = await import('./socketManager.js');
const {
  _clearAllTypingState,
  _getLastTypingBroadcast,
  _getTypingTimeouts,
  TYPING_RATE_LIMIT_MS,
  TYPING_TIMEOUT_MS,
} = await import('./typingHandler.js');

const TEST_PORT = 9877;

function createMockToken(userId: string, role: string) {
  mockValidateAccessToken.mockResolvedValueOnce({
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  });
}

describe('TypingHandler', () => {
  let httpServer: http.Server;
  let socketManager: InstanceType<typeof SocketManager>;
  let senderSocket: ClientSocket;
  let receiverSocket: ClientSocket;

  beforeAll((done) => {
    httpServer = http.createServer();
    socketManager = createSocketManager(httpServer);
    httpServer.listen(TEST_PORT, done);
  });

  afterAll((done) => {
    if (senderSocket?.connected) senderSocket.disconnect();
    if (receiverSocket?.connected) receiverSocket.disconnect();
    socketManager.getIO().close();
    httpServer.close(done);
  });

  beforeEach(() => {
    _clearAllTypingState();
  });

  afterEach(() => {
    if (senderSocket?.connected) senderSocket.disconnect();
    if (receiverSocket?.connected) receiverSocket.disconnect();
    mockValidateAccessToken.mockReset();
    _clearAllTypingState();
  });

  /**
   * Helper: connect two clients to the same conversation.
   * Returns after both are connected and joined to the room.
   */
  function connectBothToConversation(
    conversationId: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      let joinedCount = 0;
      const checkDone = () => {
        joinedCount++;
        if (joinedCount === 2) {
          // Small delay for room joins to propagate
          setTimeout(resolve, 50);
        }
      };

      // Connect sender (user-sender)
      createMockToken('user-sender', 'student');
      senderSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'sender-token' },
        transports: ['websocket'],
      });

      senderSocket.on('connect', () => {
        senderSocket.emit('join_conversation', conversationId);
        setTimeout(checkDone, 30);
      });

      // Connect receiver (user-receiver)
      createMockToken('user-receiver', 'teacher');
      receiverSocket = ioClient(`http://localhost:${TEST_PORT}`, {
        auth: { token: 'receiver-token' },
        transports: ['websocket'],
      });

      receiverSocket.on('connect', () => {
        receiverSocket.emit('join_conversation', conversationId);
        setTimeout(checkDone, 30);
      });
    });
  }

  describe('Typing event broadcasting', () => {
    it('should broadcast user_typing to other users in the conversation', (done) => {
      connectBothToConversation('conv-type-1').then(() => {
        receiverSocket.on('user_typing', (data) => {
          expect(data.userId).toBe('user-sender');
          expect(data.conversationId).toBe('conv-type-1');
          done();
        });

        senderSocket.emit('typing_start', { conversationId: 'conv-type-1' });
      });
    });

    it('should broadcast user_stopped_typing when typing_stop is emitted', (done) => {
      connectBothToConversation('conv-type-2').then(() => {
        receiverSocket.on('user_stopped_typing', (data) => {
          expect(data.userId).toBe('user-sender');
          expect(data.conversationId).toBe('conv-type-2');
          done();
        });

        senderSocket.emit('typing_stop', { conversationId: 'conv-type-2' });
      });
    });
  });

  describe('Rate limiting', () => {
    it('should rate-limit typing broadcasts to once per 3 seconds', (done) => {
      connectBothToConversation('conv-rate-1').then(() => {
        let typingCount = 0;

        receiverSocket.on('user_typing', () => {
          typingCount++;
        });

        // Emit typing_start multiple times rapidly
        senderSocket.emit('typing_start', { conversationId: 'conv-rate-1' });
        setTimeout(() => senderSocket.emit('typing_start', { conversationId: 'conv-rate-1' }), 100);
        setTimeout(() => senderSocket.emit('typing_start', { conversationId: 'conv-rate-1' }), 200);
        setTimeout(() => senderSocket.emit('typing_start', { conversationId: 'conv-rate-1' }), 500);
        setTimeout(() => senderSocket.emit('typing_start', { conversationId: 'conv-rate-1' }), 1000);

        // After 1.5s, only the first typing event should have been broadcast
        setTimeout(() => {
          expect(typingCount).toBe(1);
          done();
        }, 1500);
      });
    });

    it('should allow a new broadcast after the rate limit period expires', (done) => {
      connectBothToConversation('conv-rate-2').then(() => {
        let typingCount = 0;

        receiverSocket.on('user_typing', () => {
          typingCount++;
        });

        // First emit - should broadcast
        senderSocket.emit('typing_start', { conversationId: 'conv-rate-2' });

        // Second emit after 3+ seconds - should broadcast again
        setTimeout(() => {
          senderSocket.emit('typing_start', { conversationId: 'conv-rate-2' });

          setTimeout(() => {
            expect(typingCount).toBe(2);
            done();
          }, 200);
        }, TYPING_RATE_LIMIT_MS + 100);
      });
    });
  });

  describe('Stopped-typing after inactivity', () => {
    it('should emit user_stopped_typing after 5 seconds of no typing', (done) => {
      connectBothToConversation('conv-timeout-1').then(() => {
        receiverSocket.on('user_stopped_typing', (data) => {
          expect(data.userId).toBe('user-sender');
          expect(data.conversationId).toBe('conv-timeout-1');
          done();
        });

        senderSocket.emit('typing_start', { conversationId: 'conv-timeout-1' });
      });
    }, TYPING_TIMEOUT_MS + 3000); // Extended timeout for this test

    it('should reset the inactivity timeout when typing continues', (done) => {
      connectBothToConversation('conv-timeout-2').then(() => {
        let stoppedTypingCount = 0;
        const startTime = Date.now();

        receiverSocket.on('user_stopped_typing', () => {
          stoppedTypingCount++;
          const elapsed = Date.now() - startTime;
          // Should fire roughly 5s after the LAST typing_start (sent at 2s mark)
          // So total elapsed ~7s from start
          expect(elapsed).toBeGreaterThanOrEqual(6500);
          expect(stoppedTypingCount).toBe(1);
          done();
        });

        // First typing event
        senderSocket.emit('typing_start', { conversationId: 'conv-timeout-2' });

        // Continue typing at 2 seconds — resets the 5-second timeout
        setTimeout(() => {
          senderSocket.emit('typing_start', { conversationId: 'conv-timeout-2' });
        }, 2000);
      });
    }, 10000); // Extended timeout
  });

  describe('Cleanup on leave/disconnect', () => {
    it('should emit user_stopped_typing when user leaves conversation while typing', (done) => {
      connectBothToConversation('conv-leave-1').then(() => {
        let receivedTyping = false;

        receiverSocket.on('user_typing', () => {
          receivedTyping = true;
        });

        receiverSocket.on('user_stopped_typing', (data) => {
          if (receivedTyping) {
            expect(data.userId).toBe('user-sender');
            expect(data.conversationId).toBe('conv-leave-1');
            done();
          }
        });

        // Start typing, then leave conversation
        senderSocket.emit('typing_start', { conversationId: 'conv-leave-1' });

        setTimeout(() => {
          senderSocket.emit('leave_conversation', 'conv-leave-1');
        }, 200);
      });
    });

    it('should clean up typing state on disconnect', (done) => {
      connectBothToConversation('conv-disconnect-1').then(() => {
        // Start typing
        senderSocket.emit('typing_start', { conversationId: 'conv-disconnect-1' });

        setTimeout(() => {
          // Verify state exists
          const key = 'user-sender:conv-disconnect-1';
          expect(_getTypingTimeouts().has(key)).toBe(true);
          expect(_getLastTypingBroadcast().has(key)).toBe(true);

          // Disconnect the sender
          senderSocket.disconnect();

          // After disconnect propagates, state should be cleaned up
          setTimeout(() => {
            expect(_getTypingTimeouts().has(key)).toBe(false);
            expect(_getLastTypingBroadcast().has(key)).toBe(false);
            done();
          }, 200);
        }, 100);
      });
    });
  });
});
