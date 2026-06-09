import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authTokenService, type DecodedToken } from '../services/authTokenService.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '../types/common.js';
import { setupTypingHandlers } from './typingHandler.js';
import { setupMessageHandlers } from './messageHandler.js';
import { setupWebRTCSignaling } from './webrtcSignaling.js';
import { canJoin, resolveChannelType, type ChannelType } from './messagingRbac.js';
import { failure } from '../utils/envelope.js';
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
 *
 * Phase 4 additions:
 * - Channel-type enforcement via canJoin/canPost (Requirement 16.3)
 * - Exactly-once offline message flush on reconnect (Requirement 16.5)
 */
export class SocketManager implements ISocketManager {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, ConnectedUserInfo>();
  /** Tracks ongoing flush operations to ensure exactly-once delivery (Requirement 16.5) */
  private flushingUsers = new Set<string>();

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
   * Join a channel with role-based enforcement (Requirement 16.3).
   * Returns true if the join was permitted, false otherwise.
   * On denial, a 403 Error_Envelope is emitted to the socket.
   */
  joinChannel(userId: string, channelType: ChannelType, channelId: string): boolean {
    const userInfo = this.connectedUsers.get(userId);
    if (!userInfo) {
      logger.warn('Cannot join channel — user not connected', { userId, channelType, channelId });
      return false;
    }

    const accessResult = canJoin(userInfo.role, channelType);
    if (!accessResult.allowed) {
      const socket = this.io.sockets.sockets.get(userInfo.socketId);
      if (socket) {
        socket.emit('channel_error', {
          status: 403,
          envelope: accessResult.errorEnvelope,
          channelType,
          channelId,
        });
      }
      logger.warn('Channel join denied by RBAC', {
        userId,
        role: userInfo.role,
        channelType,
        channelId,
        reason: accessResult.reason,
      });
      return false;
    }

    const socket = this.io.sockets.sockets.get(userInfo.socketId);
    if (socket) {
      socket.join(`channel_${channelType}_${channelId}`);
      logger.info('User joined channel', { userId, channelType, channelId });
    }
    return true;
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
   * Implements exactly-once flush semantics (Requirement 16.5):
   * - Uses a `flushingUsers` set to prevent concurrent/duplicate flushes
   * - Atomically marks messages as 'delivered' using findOneAndUpdate
   * - Each message is emitted to the user's personal room exactly once
   *
   * Queries messages where the user is the recipient, created after
   * the provided timestamp, and still in 'pending' delivery status.
   */
  async deliverMissedMessages(userId: string, lastMessageTimestamp: Date): Promise<void> {
    // Exactly-once guard: if a flush is already in progress, skip
    if (this.flushingUsers.has(userId)) {
      logger.info('Flush already in progress, skipping duplicate', { userId });
      return;
    }

    this.flushingUsers.add(userId);

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
        // Atomically claim this message for delivery (exactly-once)
        const updated = await Message.findOneAndUpdate(
          { _id: message._id, deliveryStatus: 'pending' },
          { $set: { deliveryStatus: 'delivered', deliveredAt: new Date() } },
          { new: true }
        );

        // If update returns null, another flush already delivered this message
        if (!updated) {
          logger.debug('Message already delivered by concurrent flush', {
            messageId: (message._id as unknown as string).toString(),
          });
          continue;
        }

        // Emit the missed message to the user's personal room
        this.io.to(`user_${userId}`).emit('new_message', message);

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
    } finally {
      // Always release the flush lock
      this.flushingUsers.delete(userId);
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
   * join/leave, channel join with RBAC, and disconnect.
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

      // Set up message send handlers with RBAC and persistence
      setupMessageHandlers(authSocket, this);

      // Set up WebRTC signaling handlers for PTM video (Phase 4, Requirement 18)
      setupWebRTCSignaling(authSocket, this.io);

      // ─── Channel Join with RBAC Enforcement (Requirement 16.3) ──────────
      socket.on('join_channel', (data: { channelType: ChannelType; channelId: string }) => {
        const { channelType, channelId } = data;
        if (!channelType || !channelId) {
          socket.emit('channel_error', {
            status: 400,
            envelope: failure('channelType and channelId are required'),
            channelType,
            channelId,
          });
          return;
        }

        this.joinChannel(userId, channelType, channelId);
      });

      // ─── Channel Leave ──────────────────────────────────────────────────
      socket.on('leave_channel', (data: { channelType: ChannelType; channelId: string }) => {
        const { channelType, channelId } = data;
        if (channelType && channelId) {
          socket.leave(`channel_${channelType}_${channelId}`);
          logger.info('User left channel', { userId, channelType, channelId });
        }
      });

      // Handle message synchronization on reconnection (Requirement 16.5)
      // Client emits this event with the timestamp of its last received message.
      // Flush is exactly-once: concurrent calls for the same user are deduplicated.
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

      // Handle joining a conversation room (legacy / direct)
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
