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

jest.setTimeout(60000);

const TEST_PORT = 0; // OS-assigned port to avoid conflicts with parallel test workers

describe('TypingHandler', () => {
  let httpServer: http.Server;
  let socketManager: InstanceType<typeof SocketManager>;
  let senderSocket: ClientSocket;
  let receiverSocket: ClientSocket;
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
    if (senderSocket?.connected) senderSocket.disconnect();
    if (receiverSocket?.connected) receiverSocket.disconnect();
    // Give Socket.IO time to process disconnections before closing the server
    setTimeout(() => {
      socketManager.getIO().close();
      httpServer.close(done);
    }, 100);
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
    return new Promise((resolve, reject) => {
      let joinedCount = 0;
      const checkDone = () => {
        joinedCount++;
        if (joinedCount === 2) {
          // Small delay for room joins to propagate
          setTimeout(resolve, 50);
        }
      };

      // Set up auth mocks for both connections before creating sockets
      mockValidateAccessToken
        .mockResolvedValueOnce({
          userId: 'user-sender',
          role: 'student',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        })
        .mockResolvedValueOnce({
          userId: 'user-receiver',
          role: 'teacher',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        });

      // Connect sender (user-sender)
      senderSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'sender-token' },
        transports: ['websocket'],
        reconnection: false,
      });

      senderSocket.on('connect', () => {
        senderSocket.emit('join_conversation', conversationId);
        setTimeout(checkDone, 30);
      });

      senderSocket.on('connect_error', (err) => {
        reject(new Error(`Sender socket connect error: ${err.message}`));
      });

      // Connect receiver (user-receiver)
      receiverSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: 'receiver-token' },
        transports: ['websocket'],
        reconnection: false,
      });

      receiverSocket.on('connect', () => {
        receiverSocket.emit('join_conversation', conversationId);
        setTimeout(checkDone, 30);
      });

      receiverSocket.on('connect_error', (err) => {
        reject(new Error(`Receiver socket connect error: ${err.message}`));
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

        // After 2s, only the first typing event should have been broadcast
        // (use 2s instead of 1.5s for stability under load)
        setTimeout(() => {
          expect(typingCount).toBe(1);
          done();
        }, 2000);
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
          }, 500);
        }, TYPING_RATE_LIMIT_MS + 200);
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
          // So total elapsed ~7s from start. Use 6000ms lower bound for CI stability.
          expect(elapsed).toBeGreaterThanOrEqual(6000);
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
    }, 15000); // Extended timeout
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
