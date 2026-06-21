import mongoose from 'mongoose';
import type { Types } from 'mongoose';

import { AppError } from '../middleware/errorHandler.js';
import Message from '../models/Message.js';
import type { IMessage } from '../models/Message.js';
import Parent from '../models/Parent.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import { validateMessagingPermission } from '../realtime/messagingRbac.js';
import type { UserRole } from '../types/common.js';
import { redactSecrets, type AuditContext } from '../utils/auditContext.js';
import { auditService } from './auditService.js';
import { authorizationService } from './authorizationService.js';

/**
 * The two participant models a {@link Message} can reference. Messaging is
 * strictly between a Parent and a Faculty member.
 */
type MessageParticipantModel = 'Parent' | 'Faculty';

/**
 * The `userType` discriminator accepted by `Message.getUserConversations`.
 * Faculty members (`teacher`/`faculty`) map to `'teacher'`, parents to
 * `'parent'`.
 */
type MessageUserType = 'parent' | 'teacher';

/**
 * Outward-facing message shape returned by the Messaging_API. Internal-only
 * fields (`isDeleted`, delivery bookkeeping, attachments, thread linkage) are
 * intentionally omitted; the soft-delete flag in particular is never exposed.
 */
export interface MessageDTO {
  id: string;
  conversationId: string;
  subject: string;
  content: string;
  senderId: string;
  senderModel: MessageParticipantModel;
  senderName: string;
  recipientId: string;
  recipientModel: MessageParticipantModel;
  recipientName: string;
  studentId: string;
  studentName: string;
  isRead: boolean;
  readAt?: Date;
  messageType: string;
  priority: string;
  createdAt: Date;
}

/**
 * Summary of a single Conversation for the conversation-list endpoint. The
 * `latestMessage`, `unreadCount`, and `messageCount` are computed by the
 * reused `Message.getUserConversations` aggregation (Requirement 1.3).
 */
export interface ConversationSummary {
  conversationId: string;
  /** Most recent non-deleted message in the conversation. */
  latestMessage: MessageDTO;
  /** Unread, non-deleted messages where the viewer is the recipient. */
  unreadCount: number;
  /** Total non-deleted messages in the conversation. */
  messageCount: number;
}

/**
 * Minimal structural shape shared by a hydrated {@link IMessage} document and
 * the raw `latestMessage` sub-document produced by the conversation
 * aggregation, so {@link toMessageDTO} can map either without re-querying.
 */
type MessageLike = Pick<
  IMessage,
  | 'conversationId'
  | 'subject'
  | 'content'
  | 'senderModel'
  | 'senderName'
  | 'recipientModel'
  | 'recipientName'
  | 'studentName'
  | 'isRead'
  | 'readAt'
  | 'messageType'
  | 'priority'
  | 'createdAt'
> & {
  _id: Types.ObjectId | string;
  senderId: Types.ObjectId | string;
  recipientId: Types.ObjectId | string;
  studentId: Types.ObjectId | string;
};

/**
 * Shape of each entry produced by the `Message.getUserConversations`
 * aggregation: the grouped `conversationId`, the latest message sub-document,
 * and the per-user unread/total counts.
 */
interface ConversationAggregate {
  _id: string;
  latestMessage: MessageLike;
  unreadCount: number;
  messageCount: number;
}

/**
 * Map a Message document (or aggregated sub-document) to the outward-facing
 * {@link MessageDTO}, omitting `isDeleted` and other internal bookkeeping
 * fields. `readAt` is only present when the message has actually been read.
 */
function toMessageDTO(message: MessageLike): MessageDTO {
  return {
    id: String(message._id),
    conversationId: message.conversationId,
    subject: message.subject,
    content: message.content,
    senderId: String(message.senderId),
    senderModel: message.senderModel,
    senderName: message.senderName,
    recipientId: String(message.recipientId),
    recipientModel: message.recipientModel,
    recipientName: message.recipientName,
    studentId: String(message.studentId),
    studentName: message.studentName,
    isRead: message.isRead,
    ...(message.readAt ? { readAt: message.readAt } : {}),
    messageType: message.messageType,
    priority: message.priority,
    createdAt: message.createdAt,
  };
}

/**
 * Input accepted by {@link MessageService.send}. The sender is never taken
 * from this payload — `senderId`/`senderModel`/`senderName` are derived from
 * the authenticated user (Requirement 3.1). Field-level validation (non-empty
 * subject/content, length bounds, required ids) is enforced upstream by the
 * messaging Zod schema (Requirement 3.2).
 */
export interface SendMessageInput {
  subject: string;
  content: string;
  recipientId: string;
  recipientModel: MessageParticipantModel;
  studentId: string;
  messageType?: IMessage['messageType'];
  priority?: IMessage['priority'];
}

/**
 * Messaging service — HTTP-agnostic business logic over the existing
 * {@link Message} model. All participant scope is derived from the passed
 * `userId`/`role` (sourced from `req.user`), never from client input
 * (Requirement 1.2).
 */
export class MessageService {
  /**
   * Map an authenticated user's role to the `userType` discriminator used by
   * the Message participant model and the `getUserConversations` aggregation.
   * Faculty (`teacher`/`faculty`) → `'teacher'`, parents → `'parent'`.
   */
  private userTypeForRole(role: UserRole): MessageUserType | null {
    if (role === 'teacher' || role === 'faculty') {
      return 'teacher';
    }
    if (role === 'parent') {
      return 'parent';
    }
    return null;
  }

  /** Normalize a 1-based page number, defaulting to 1 for invalid input. */
  private normalizePage(page: number): number {
    return Math.max(Math.trunc(page) || 1, 1);
  }

  /** Normalize a positive page size, defaulting to 20 for invalid input. */
  private normalizeLimit(limit: number): number {
    return Math.max(Math.trunc(limit) || 20, 1);
  }

  /**
   * List the Conversations the authenticated user participates in
   * (Requirements 1.1, 1.2, 1.3).
   *
   * Filters at the Conversation level to those where the user is the sender or
   * recipient under the role-to-model mapping, excluding `isDeleted` messages,
   * by reusing the `Message.getUserConversations` aggregation (which already
   * computes `latestMessage`, `unreadCount`, and `messageCount`). Results are
   * ordered by latest activity (descending) and paginated; `total` is the full
   * count of in-scope conversations.
   */
  async listConversations(
    userId: string,
    role: UserRole,
    page: number,
    limit: number,
  ): Promise<{ data: ConversationSummary[]; total: number }> {
    const userType = this.userTypeForRole(role);
    if (userType === null) {
      // No messaging participant model for this role → no conversations.
      return { data: [], total: 0 };
    }

    const effectivePage = this.normalizePage(page);
    const effectiveLimit = this.normalizeLimit(limit);

    // Conversation-level scope filter, excluding soft-deleted messages
    // (Requirement 1.1). Mirrors the $match built inside getUserConversations.
    const scopeFilter: Record<string, unknown> = {
      isDeleted: false,
      $or:
        userType === 'parent'
          ? [
              { senderId: userId, senderModel: 'Parent' },
              { recipientId: userId, recipientModel: 'Parent' },
            ]
          : [
              { senderId: userId, senderModel: 'Faculty' },
              { recipientId: userId, recipientModel: 'Faculty' },
            ],
    };

    // Total in-scope conversation count (distinct conversationId).
    const conversationIds = await Message.distinct('conversationId', scopeFilter);
    const total = conversationIds.length;

    // Reuse the aggregation for the latest-message/unread/count computation,
    // requesting enough rows to cover the requested page, then slice the page.
    const aggregated = (await Message.getUserConversations(userId, userType, {
      limit: effectivePage * effectiveLimit,
    })) as ConversationAggregate[];

    const start = (effectivePage - 1) * effectiveLimit;
    const pageSlice = aggregated.slice(start, start + effectiveLimit);

    const data = pageSlice.map((entry) => ({
      conversationId: entry._id,
      latestMessage: toMessageDTO(entry.latestMessage),
      unreadCount: entry.unreadCount,
      messageCount: entry.messageCount,
    }));

    return { data, total };
  }

  /**
   * Fetch a Conversation thread by `conversationId` (Requirements 2.1, 2.2,
   * 2.3, 2.7).
   *
   * Verifies the authenticated user is a participant before any message
   * content is returned: it loads a single message of the conversation
   * (including soft-deleted ones, so participation can still be checked when
   * every message is deleted) and delegates to
   * {@link AuthorizationService.assertConversationParticipant}, which throws
   * 403 for a non-participant (Requirement 2.3).
   *
   * Returns the non-deleted messages ordered by `createdAt` ascending,
   * paginated, with `total` counting only non-deleted messages. The
   * `conversationExists` flag distinguishes a conversation that exists but has
   * no viewable (non-deleted) messages (`true`, Requirement 2.7) from one that
   * matches no message at all (`false`, Requirement 2.6).
   */
  async getThread(
    userId: string,
    role: UserRole,
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<{ data: MessageDTO[]; total: number; conversationExists: boolean }> {
    // Load any single message of the conversation, including soft-deleted ones,
    // to determine existence and participant identity.
    const anyMessage = await Message.findOne({ conversationId })
      .lean<MessageLike & {
        senderId: Types.ObjectId;
        senderModel: MessageParticipantModel;
        recipientId: Types.ObjectId;
        recipientModel: MessageParticipantModel;
      }>()
      .exec();

    // Non-existent conversation: return an empty, success-shaped result with
    // conversationExists = false (Requirement 2.6). No participant exists to
    // authorize against, and no content is leaked.
    if (!anyMessage) {
      return { data: [], total: 0, conversationExists: false };
    }

    // Participation check before returning any content (Requirements 2.2, 2.3),
    // including when the conversation has only soft-deleted messages.
    authorizationService.assertConversationParticipant(userId, role, anyMessage);

    const effectivePage = this.normalizePage(page);
    const effectiveLimit = this.normalizeLimit(limit);
    const skip = (effectivePage - 1) * effectiveLimit;

    const threadFilter = { conversationId, isDeleted: false };

    const [messages, total] = await Promise.all([
      Message.find(threadFilter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(effectiveLimit)
        .lean<MessageLike[]>()
        .exec(),
      Message.countDocuments(threadFilter).exec(),
    ]);

    return {
      data: messages.map(toMessageDTO),
      total,
      conversationExists: true,
    };
  }

  /**
   * Map an authenticated user's role to the participant model used on Message
   * documents. Faculty (`teacher`/`faculty`) → `Faculty`, parents → `Parent`;
   * any other role has no messaging participant model.
   */
  private participantModelForRole(role: UserRole): MessageParticipantModel | null {
    if (role === 'teacher' || role === 'faculty') {
      return 'Faculty';
    }
    if (role === 'parent') {
      return 'Parent';
    }
    return null;
  }

  /**
   * Resolve the display name for a Parent or Faculty participant by id. Returns
   * `null` when no matching record exists.
   */
  private async resolveParticipantName(
    id: string,
    model: MessageParticipantModel,
  ): Promise<string | null> {
    if (model === 'Faculty') {
      const faculty = await Faculty.findById(id).select('firstName lastName').lean().exec();
      return faculty ? `${faculty.firstName} ${faculty.lastName}` : null;
    }
    const parent = await Parent.findById(id).select('firstName lastName').lean().exec();
    return parent ? `${parent.firstName} ${parent.lastName}` : null;
  }

  /**
   * Resolve a Student's display name by id. Returns `null` when no matching
   * record exists.
   */
  private async resolveStudentName(studentId: string): Promise<string | null> {
    const student = await Student.findById(studentId).select('firstName lastName').lean().exec();
    return student ? `${student.firstName} ${student.lastName}` : null;
  }

  /**
   * Send a new message (Requirements 3.1, 3.3, 3.4, 3.6).
   *
   * `senderId`/`senderModel`/`senderName` are derived from the authenticated
   * user (`role` → participant model), never from the client payload. Messaging
   * permission is checked via the existing `validateMessagingPermission` helper
   * **before** any document is persisted, so a denial produces a 403 with no
   * side effect (Requirements 3.3, 3.4). On a confirmed write an audit entry is
   * recorded through `auditService.logEvent`, with metadata passed through
   * `redactSecrets` (Requirement 3.6).
   */
  async send(
    userId: string,
    role: UserRole,
    input: SendMessageInput,
    ctx: AuditContext,
  ): Promise<MessageDTO> {
    const senderModel = this.participantModelForRole(role);
    if (senderModel === null) {
      throw AppError.forbidden('Only faculty and parents can send messages');
    }

    // Authorization before persistence (Requirements 3.3, 3.4): a denial must
    // not create any Message document.
    const permission = await validateMessagingPermission(
      userId,
      role,
      input.recipientId,
      input.recipientModel,
    );
    if (!permission.allowed) {
      throw AppError.forbidden(
        permission.reason ?? 'You are not permitted to message this recipient',
      );
    }

    // Resolve participant display names (reads only; no side effects).
    const [senderName, recipientName, studentName] = await Promise.all([
      this.resolveParticipantName(userId, senderModel),
      this.resolveParticipantName(input.recipientId, input.recipientModel),
      this.resolveStudentName(input.studentId),
    ]);

    if (senderName === null) {
      throw AppError.notFound('Sender record not found');
    }
    if (recipientName === null) {
      throw AppError.notFound('Recipient record not found');
    }
    if (studentName === null) {
      throw AppError.notFound('Student record not found');
    }

    const created = await Message.create({
      subject: input.subject,
      content: input.content,
      senderId: userId,
      senderModel,
      senderName,
      recipientId: input.recipientId,
      recipientModel: input.recipientModel,
      recipientName,
      studentId: input.studentId,
      studentName,
      ...(input.messageType ? { messageType: input.messageType } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
    });

    // Audit only after the write is confirmed (Requirement 3.6).
    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'message_sent',
      resource: 'message',
      resourceId: String(created._id),
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        recipientId: input.recipientId,
        recipientModel: input.recipientModel,
        studentId: input.studentId,
        conversationId: created.conversationId,
      }),
    });

    return toMessageDTO(created as unknown as MessageLike);
  }

  /**
   * Mark a message as read (Requirements 4.1, 4.2, 4.3, 4.6).
   *
   * Recipient authorization is evaluated **before** message-existence handling
   * (Requirement 4.3): a non-recipient receives 403 even when the id matches no
   * document. To preserve that ordering for a missing message, authorization is
   * evaluated against a placeholder recipient that no non-admin can match, so an
   * admin falls through to the 404 below while any other caller gets 403.
   *
   * The update is idempotent — when the message is already read, `readAt` is
   * left unchanged (Requirement 4.6).
   */
  async markRead(userId: string, role: UserRole, messageId: string): Promise<MessageDTO> {
    const message = await Message.findById(messageId).exec();

    authorizationService.assertMessageRecipient(
      userId,
      role,
      message ?? {
        recipientId: new mongoose.Types.ObjectId(),
        recipientModel: 'Parent',
      },
    );

    if (!message) {
      throw AppError.notFound('Message not found');
    }

    // Idempotent: markAsRead leaves an already-read message (and its `readAt`)
    // unchanged (Requirement 4.6).
    await message.markAsRead();

    return toMessageDTO(message as unknown as MessageLike);
  }

  /**
   * Soft-delete a message (Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.10).
   *
   * Existence is checked first (404 when the id matches no document,
   * Requirement 5.4); then sender-or-recipient ownership is verified
   * (Requirements 5.2, 5.3). On authorization, `isDeleted`/`deletedAt` are set
   * and the write is persisted. The persisted result is re-checked and, if the
   * soft-delete is not confirmed, an error is thrown rather than reporting
   * success (Requirement 5.10). An audit entry is recorded only after the write
   * is confirmed (Requirement 5.5).
   */
  async softDelete(
    userId: string,
    role: UserRole,
    messageId: string,
    ctx: AuditContext,
  ): Promise<void> {
    // Existence before ownership (Requirement 5.4).
    const message = await Message.findById(messageId).exec();
    if (!message) {
      throw AppError.notFound('Message not found');
    }

    // Sender-or-recipient ownership (Requirements 5.2, 5.3).
    authorizationService.assertMessageParticipant(userId, role, message);

    message.isDeleted = true;
    message.deletedAt = new Date();
    const saved = await message.save();

    // Confirm the soft-delete persisted (Requirement 5.10); never report
    // success when the write is not confirmed.
    if (!saved.isDeleted || !saved.deletedAt) {
      throw AppError.internal('Failed to delete message');
    }

    // Audit only after the write is confirmed (Requirement 5.5).
    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'message_deleted',
      resource: 'message',
      resourceId: String(message._id),
      correlationId: ctx.correlationId,
      metadata: redactSecrets({ conversationId: message.conversationId }),
    });
  }
}

export const messageService = new MessageService();
