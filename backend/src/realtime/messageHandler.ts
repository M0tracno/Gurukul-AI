import type { AuthenticatedSocket, SocketManager } from './socketManager.js';
import Message from '../models/Message.js';
import { logger } from '../utils/logger.js';
import { validateMessagingPermission, canPost, resolveChannelType } from './messagingRbac.js';
import { failure } from '../utils/envelope.js';

/**
 * Payload expected from the client when emitting a `send_message` event.
 */
export interface SendMessagePayload {
  conversationId?: string;
  subject: string;
  content: string;
  recipientId: string;
  recipientModel: 'Parent' | 'Faculty' | 'Student';
  recipientName: string;
  studentId: string;
  studentName: string;
  messageType?: 'general' | 'academic' | 'behavioral' | 'attendance' | 'urgent';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  threadId?: string;
  replyToMessageId?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

/**
 * Sets up message event handlers on an authenticated socket.
 *
 * Implements the persistence-first guarantee:
 * 1. Persist message to MongoDB FIRST (deliveryStatus: 'pending')
 * 2. If persistence succeeds and recipient is connected:
 *    - Update deliveryStatus to 'delivered', set deliveredAt
 *    - Broadcast message to recipient's room
 *    - Emit delivery confirmation to sender
 * 3. If persistence succeeds but recipient is offline:
 *    - Message stays persisted with 'pending' status (delivered on reconnection via task 10.4)
 *    - No delivery confirmation emitted
 * 4. If persistence fails:
 *    - Emit message_delivery_failed to sender
 *    - Do NOT emit delivery confirmation
 */
export function setupMessageHandlers(
  socket: AuthenticatedSocket,
  socketManager: SocketManager
): void {
  socket.on('send_message', async (payload: SendMessagePayload) => {
    const { userId, role } = socket.user;
    const senderModel = role === 'parent' ? 'Parent' : 'Faculty';

    // Determine sender name from socket user context (can be extended)
    const senderName = payload.recipientName ? `${role}_${userId}` : `${role}_${userId}`;

    // RBAC check: validate messaging permission before persisting
    try {
      const permission = await validateMessagingPermission(
        userId,
        role,
        payload.recipientId,
        payload.recipientModel,
      );

      if (!permission.allowed) {
        logger.warn('Messaging RBAC rejected', {
          senderId: userId,
          senderRole: role,
          recipientId: payload.recipientId,
          recipientModel: payload.recipientModel,
          reason: permission.reason,
        });

        socket.emit('message_delivery_failed', {
          error: 'MESSAGING_UNAUTHORIZED',
          message: permission.reason || 'You are not authorized to message this recipient',
          recipientId: payload.recipientId,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } catch (rbacError) {
      const errorMessage = rbacError instanceof Error ? rbacError.message : 'Unknown error';
      logger.error('Messaging RBAC check failed', {
        senderId: userId,
        recipientId: payload.recipientId,
        error: errorMessage,
      });

      socket.emit('message_delivery_failed', {
        error: 'MESSAGING_AUTHORIZATION_ERROR',
        message: 'Failed to verify messaging permissions. Please try again.',
        recipientId: payload.recipientId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Channel-level canPost enforcement (Requirement 16.3)
    // Determine the recipient role from model for channel resolution
    const recipientRole = payload.recipientModel === 'Faculty' ? 'teacher'
      : payload.recipientModel === 'Student' ? 'student'
      : 'parent';
    const channelType = resolveChannelType(role, recipientRole);

    if (channelType) {
      const postResult = canPost(role, channelType);
      if (!postResult.allowed) {
        logger.warn('Channel canPost rejected', {
          senderId: userId,
          senderRole: role,
          channelType,
          reason: postResult.reason,
        });

        socket.emit('channel_error', {
          status: 403,
          envelope: postResult.errorEnvelope,
          channelType,
        });
        return;
      }
    } else {
      // No valid channel type exists for this role pair
      logger.warn('No valid channel for role pair', {
        senderId: userId,
        senderRole: role,
        recipientRole,
      });

      socket.emit('channel_error', {
        status: 403,
        envelope: failure(
          `No messaging channel exists between '${role}' and '${recipientRole}' roles`
        ),
      });
      return;
    }

    try {
      // Step 1: Persist to MongoDB FIRST with deliveryStatus 'pending'
      const message = new Message({
        conversationId: payload.conversationId,
        subject: payload.subject,
        content: payload.content,
        senderId: userId,
        senderModel,
        senderName: senderName,
        recipientId: payload.recipientId,
        recipientModel: payload.recipientModel,
        recipientName: payload.recipientName,
        studentId: payload.studentId,
        studentName: payload.studentName,
        messageType: payload.messageType || 'general',
        priority: payload.priority || 'normal',
        threadId: payload.threadId,
        replyToMessageId: payload.replyToMessageId || undefined,
        attachments: payload.attachments || [],
        deliveryStatus: 'pending',
        persistedAt: new Date(),
      });

      const savedMessage = await message.save();
      const messageId = savedMessage._id.toString();

      logger.info('Message persisted successfully', {
        messageId,
        senderId: userId,
        recipientId: payload.recipientId,
        conversationId: savedMessage.conversationId,
      });

      // Step 2: Check if recipient is connected
      const recipientConnected = socketManager.isUserConnected(payload.recipientId);

      if (recipientConnected) {
        // Deliver to recipient - broadcast to their personal room
        socketManager.broadcastMessage(savedMessage.conversationId, {
          messageId,
          conversationId: savedMessage.conversationId,
          subject: savedMessage.subject,
          content: savedMessage.content,
          senderId: userId,
          senderModel,
          senderName,
          recipientId: payload.recipientId,
          recipientModel: payload.recipientModel,
          recipientName: payload.recipientName,
          studentId: payload.studentId,
          studentName: payload.studentName,
          messageType: savedMessage.messageType,
          priority: savedMessage.priority,
          threadId: savedMessage.threadId,
          createdAt: savedMessage.createdAt,
        });

        // Update delivery status to 'delivered'
        await Message.updateOne(
          { _id: savedMessage._id },
          { deliveryStatus: 'delivered', deliveredAt: new Date() }
        );

        // Emit delivery confirmation to sender
        socketManager.emitDeliveryConfirmation(userId, messageId);

        logger.info('Message delivered to online recipient', {
          messageId,
          recipientId: payload.recipientId,
        });
      } else {
        // Recipient is offline - message stays persisted with 'pending' status
        // Will be delivered on reconnection (task 10.4)
        // Do NOT emit delivery confirmation
        logger.info('Recipient offline, message persisted for later delivery', {
          messageId,
          recipientId: payload.recipientId,
        });
      }
    } catch (error) {
      // Step 3: Persistence failure - notify sender
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Message persistence failed', {
        senderId: userId,
        recipientId: payload.recipientId,
        error: errorMessage,
      });

      // Emit delivery failure to sender
      socket.emit('message_delivery_failed', {
        error: 'MESSAGE_PERSISTENCE_FAILED',
        message: 'Failed to save message. Please try again.',
        recipientId: payload.recipientId,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
