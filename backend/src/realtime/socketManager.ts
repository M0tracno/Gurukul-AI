import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authTokenService, type DecodedToken } from '../services/authTokenService.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '../types/common.js';
import { setupTypingHandlers } from './typingHandler.js';
import Message from '../models/Message.js';

/**
 * Extended Socket type with authenticated user data attached after
 * the auth middleware validates the JWT access token.
 */
export interface AuthenticatedSocket extends Socket {
  user: { userId: string; role: UserRole };
}

/**
 * Tracks connected user metadata for presence queries.
 */
interface ConnectedUserInfo {
  socketId: string;
  userId: string;
  role: UserRole;
  connectedAt: Date;
}

/**
 * ISocketManager interface as defined in the design document.
 * Provides real-time communication capabilities with authentication,
 * room management, and messaging primitives.
 */
export interface ISocketManager {
  authenticateConnection(token: string): Promise<DecodedToken>;
  joinConversation(userId: string, conversationId: string): void;
  broadcastMessage(conversationId: string, message: unknown): void;
  emitTypingIndicator(conversationId: string, userId: string, isTyping: boolean): void;
  emitDeliveryConfirmation(userId: string, messageId: string): void;
  deliverMissedMessages(userId: string, lastMessageTimestamp: Date): Promise<void>;
}

/**
 * SocketManager implements the ISocketManager interface, encapsulating
 * all Socket.IO server logic: JWT authentication middleware, room/namespace
 * management for conversations, and utility methods for message delivery.
 */
export class SocketManager implements ISocketManager {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, ConnectedUserInfo>();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupAuthMiddleware();
    this.setupConnectionHandlers();
  }

  /**
   * Validate a JWT access token. Can be used externally (e.g., in tests)
   * or internally by the auth middleware.
   */
  async authenticateConnection(token: string): Promise<DecodedToken> {
    return authTokenService.validateAccessToken(token);
  }

  /**
   * Add a user to a conversation room so they receive messages
   * broadcast to that conversation.
   */
  joinConversation(userId: string, conversationId: string): void {
    const userInfo = this.connectedUsers.get(userId);
    if (!userInfo) {
      logger.warn('Cannot join conversation — user not connected', { userId, conversationId });
      return;
    }
    const socket = this.io.sockets.sockets.get(userInfo.socketId);
    if (socket) {
      socket.join(`conversation_${conversationId}`);
      logger.info('User joined conversation via manager', { userId, conversationId });
    }
  }

  /**
   * Broadcast a message to all sockets in a conversation room.
   */
  broadcastMessage(conversationId: string, message: unknown): void {
    this.io.to(`conversation_${conversationId}`).emit('new_message', message);
  }

  /**
   * Emit a typing or stopped-typing indicator to a conversation room.
   */
  emitTypingIndicator(conversationId: string, userId: string, isTyping: boolean): void {
    const event = isTyping ? 'user_typing' : 'user_stopped_typing';
    this.io.to(`conversation_${conversationId}`).emit(event, {
      userId,
      conversationId,
    });
  }

  /**
   * Send a delivery confirmation event to a specific user's personal room.
   */
  emitDeliveryConfirmation(userId: string, messageId: string): void {
    this.io.to(`user_${userId}`).emit('message_delivered', {
      messageId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Deliver messages that were sent while the user was disconnected.
   * Queries messages where the user is the recipient, created after
   * the provided timestamp, and still in 'pending' delivery status.
   * Each missed message is emitted to the user's personal room and
   * its delivery status is updated to 'delivered'.
   */
  async deliverMissedMessages(userId: string, lastMessageTimestamp: Date): Promise<void> {
    try {
      const missedMessages = await Message.find({
        recipientId: userId,
        createdAt: { $gt: lastMessageTimestamp },
        deliveryStatus: 'pending',
        isDeleted: false,
      })
        .sort({ createdAt: 1 })
        .lean();

      if (missedMessages.length === 0) {
        logger.info('No missed messages to deliver', { userId });
        return;
      }

      logger.info('Delivering missed messages', {
        userId,
        count: missedMessages.length,
        since: lastMessageTimestamp.toISOString(),
      });

      for (const message of missedMessages) {
        // Emit the missed message to the user's personal room
        this.io.to(`user_${userId}`).emit('new_message', message);

        // Update delivery status to 'delivered'
        await Message.updateOne(
          { _id: message._id },
          {
            $set: {
              deliveryStatus: 'delivered',
              deliveredAt: new Date(),
            },
          }
        );

        // Notify the sender of successful delivery
        this.emitDeliveryConfirmation(
          message.senderId.toString(),
          (message._id as unknown as string).toString()
        );
      }

      logger.info('Missed messages delivered successfully', {
        userId,
        deliveredCount: missedMessages.length,
      });
    } catch (error) {
      logger.error('Failed to deliver missed messages', {
        userId,
        lastMessageTimestamp: lastMessageTimestamp.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // --- Accessor methods ---

  /** Get the map of currently connected users. */
  getConnectedUsers(): Map<string, ConnectedUserInfo> {
    return this.connectedUsers;
  }

  /** Check if a specific user is currently connected. */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /** Get the underlying Socket.IO server instance. */
  getIO(): SocketIOServer {
    return this.io;
  }

  // --- Private setup methods ---

  /**
   * Install authentication middleware that validates the JWT access token
   * from `socket.handshake.auth.token` before allowing the connection.
   */
  private setupAuthMiddleware(): void {
    this.io.use(async (socket: Socket, next: (err?: Error) => void) => {
      const token = socket.handshake.auth.token as string | undefined;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = await this.authenticateConnection(token);
        (socket as AuthenticatedSocket).user = {
          userId: decoded.userId,
          role: decoded.role,
        };
        next();
      } catch {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Set up connection event handlers: track connected users, join personal
   * rooms, and register per-socket event listeners for conversation
   * join/leave and disconnect.
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      const { userId, role } = authSocket.user;

      // Track the connected user
      this.connectedUsers.set(userId, {
        socketId: socket.id,
        userId,
        role,
        connectedAt: new Date(),
      });

      // Join the user's personal room for direct messages
      socket.join(`user_${userId}`);

      logger.info('Socket connected', { userId, role, socketId: socket.id });

      // Set up typing indicator handlers with rate limiting
      setupTypingHandlers(authSocket, this.io);

      // Handle message synchronization on reconnection
      // Client emits this event with the timestamp of its last received message
      socket.on('sync_messages', async (data: { lastMessageTimestamp: string | Date }) => {
        try {
          const timestamp = new Date(data.lastMessageTimestamp);
          if (isNaN(timestamp.getTime())) {
            socket.emit('sync_error', {
              error: 'invalid_timestamp',
              message: 'Invalid lastMessageTimestamp provided',
            });
            return;
          }

          logger.info('Client requesting message sync', {
            userId,
            lastMessageTimestamp: timestamp.toISOString(),
          });

          await this.deliverMissedMessages(userId, timestamp);

          socket.emit('sync_complete', {
            userId,
            syncedAt: new Date().toISOString(),
          });
        } catch (error) {
          logger.error('Error during message sync', {
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
          socket.emit('sync_error', {
            error: 'sync_failed',
            message: 'Failed to synchronize missed messages',
          });
        }
      });

      // Handle joining a conversation room
      socket.on('join_conversation', (conversationId: string) => {
        socket.join(`conversation_${conversationId}`);
        logger.info('User joined conversation', { userId, conversationId });
      });

      // Handle leaving a conversation room
      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation_${conversationId}`);
        logger.info('User left conversation', { userId, conversationId });
      });

      // Handle disconnect: clean up tracking
      socket.on('disconnect', () => {
        this.connectedUsers.delete(userId);
        logger.info('Socket disconnected', { userId, role });
      });
    });
  }
}

/**
 * Factory function that creates a Socket.IO server attached to the given
 * HTTP server and returns a fully configured SocketManager instance.
 */
export function createSocketManager(server: http.Server): SocketManager {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  return new SocketManager(io);
}
