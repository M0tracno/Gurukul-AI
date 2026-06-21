import mongoose from 'mongoose';

import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/common.js';
import type { IMessage } from '../models/Message.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { auditService } from './auditService.js';
import { redactSecrets, type AuditContext } from '../utils/auditContext.js';

/**
 * The two participant models a {@link Message} can reference. Messaging is
 * strictly between a Parent and a Faculty member, so a participant is always
 * identified by the pair `(id, model)`.
 */
type MessageParticipantModel = 'Parent' | 'Faculty';

/**
 * Minimal shape of a sender on a loaded Message document. Methods accept the
 * already-loaded record (rather than re-querying) so the service layer keeps
 * control over the required check ordering (existence-before-ownership for
 * delete in Req 5.9 vs. ownership-before-existence for mark-read in Req 4.3).
 */
type MessageSender = Pick<IMessage, 'senderId' | 'senderModel'>;

/** Minimal shape of a recipient on a loaded Message document. */
type MessageRecipient = Pick<IMessage, 'recipientId' | 'recipientModel'>;

/** Minimal shape of both participants on a loaded Message document. */
type MessageParticipants = MessageSender & MessageRecipient;

/**
 * Minimal shape of a loaded Feedback document needed to authorize a reply.
 * Declared structurally so the AuthorizationService does not depend on the
 * Feedback model directly.
 */
interface FeedbackTarget {
  targetType: 'teacher' | 'course';
  targetId: unknown;
}

/**
 * Service-level authorization for data isolation.
 *
 * Validates that users can only access data they are authorized to view/modify:
 * - Students: only their own records
 * - Parents: only their linked ward's data
 * - Teachers: only courses they are assigned to and enrolled students
 * - Admins: unrestricted access
 *
 * This provides a second layer of defense beyond the route-level RBAC middleware,
 * preventing privilege escalation through direct service calls.
 */
export class AuthorizationService {
  /**
   * Verify that a student can only access their own records.
   * Throws 403 if requestorId !== targetStudentId and role is not admin.
   *
   * @param ctx - Optional audit context for the requestor. When provided, an
   *   `access_denied` audit entry is written before the 403 is thrown (Req 8.3).
   *   Omitting it preserves the original throw-only behavior for callers that
   *   do not carry request context.
   */
  assertStudentOwnership(
    requestorId: string,
    targetStudentId: string,
    role: UserRole,
    ctx?: AuditContext,
  ): void {
    if (this.isAdmin(role)) {
      return;
    }

    if (requestorId !== targetStudentId) {
      this.recordScopeDenial(ctx, 'student', targetStudentId);
      throw AppError.forbidden(
        'Students can only access their own records',
      );
    }
  }

  /**
   * Verify that a parent can only access their linked ward's data.
   * Queries the ParentStudentRelation collection to check the link.
   * Throws 403 if the parent has no active relationship to the target student.
   *
   * @param ctx - Optional audit context for the requestor; see
   *   {@link AuthorizationService.assertStudentOwnership} (Req 8.3).
   */
  async assertParentAccess(
    parentId: string,
    targetStudentId: string,
    role: UserRole,
    ctx?: AuditContext,
  ): Promise<void> {
    if (this.isAdmin(role)) {
      return;
    }

    // Access the ParentStudentRelation model dynamically to avoid circular imports
    // The model uses the 'parent_student_relations' collection
    const ParentStudentRelation =
      mongoose.models['ParentStudentRelation'] ??
      mongoose.model(
        'ParentStudentRelation',
        new mongoose.Schema(
          {
            parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
            studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
            isActive: { type: Boolean, default: true },
          },
          { collection: 'parent_student_relations' },
        ),
      );

    const relation = await ParentStudentRelation.findOne({
      parentId: new mongoose.Types.ObjectId(parentId),
      studentId: new mongoose.Types.ObjectId(targetStudentId),
      isActive: true,
    }).lean();

    if (!relation) {
      this.recordScopeDenial(ctx, 'student', targetStudentId);
      throw AppError.forbidden(
        'Parents can only access their linked ward\'s data',
      );
    }
  }

  /**
   * Verify that a teacher can only access courses they are assigned to.
   * Checks that the course's faculty field matches the teacher's ID.
   * Throws 403 if the teacher is not the assigned faculty for the course.
   *
   * @param ctx - Optional audit context for the requestor; see
   *   {@link AuthorizationService.assertStudentOwnership} (Req 8.3).
   */
  async assertTeacherCourseAccess(
    teacherId: string,
    courseId: string,
    role: UserRole,
    ctx?: AuditContext,
  ): Promise<void> {
    if (this.isAdmin(role)) {
      return;
    }

    const course = await Course.findOne({
      _id: new mongoose.Types.ObjectId(courseId),
      faculty: new mongoose.Types.ObjectId(teacherId),
      deletedAt: null,
    }).lean();

    if (!course) {
      this.recordScopeDenial(ctx, 'course', courseId);
      throw AppError.forbidden(
        'Teachers can only access their assigned courses',
      );
    }
  }

  /**
   * Verify that a teacher can access a specific student's data.
   * The student must be enrolled in one of the teacher's courses.
   * Throws 403 if the student is not enrolled in any of the teacher's courses.
   *
   * @param ctx - Optional audit context for the requestor; see
   *   {@link AuthorizationService.assertStudentOwnership} (Req 8.3).
   */
  async assertTeacherStudentAccess(
    teacherId: string,
    targetStudentId: string,
    role: UserRole,
    ctx?: AuditContext,
  ): Promise<void> {
    if (this.isAdmin(role)) {
      return;
    }

    // Find courses assigned to this teacher
    const teacherCourses = await Course.find({
      faculty: new mongoose.Types.ObjectId(teacherId),
      deletedAt: null,
    })
      .select('_id')
      .lean();

    if (teacherCourses.length === 0) {
      this.recordScopeDenial(ctx, 'student', targetStudentId);
      throw AppError.forbidden(
        'Teachers can only access students enrolled in their courses',
      );
    }

    const courseIds = teacherCourses.map((c) => c._id);

    // Check if the target student is enrolled in any of the teacher's courses
    const enrollment = await Enrollment.findOne({
      student: new mongoose.Types.ObjectId(targetStudentId),
      course: { $in: courseIds },
      status: { $in: ['active', 'completed'] },
    }).lean();

    if (!enrollment) {
      this.recordScopeDenial(ctx, 'student', targetStudentId);
      throw AppError.forbidden(
        'Teachers can only access students enrolled in their courses',
      );
    }
  }

  /**
   * Check if the user role is admin (unrestricted access).
   */
  isAdmin(role: UserRole): boolean {
    return role === 'admin';
  }

  /**
   * Verify that a parent or faculty member is a participant of a Conversation
   * before any thread content is returned (Req 2.2, 2.3).
   *
   * A Conversation is strictly between one Parent and one Faculty member about
   * one Student, so every Message sharing a `conversationId` has the same
   * participant pair. The caller therefore passes any single Message from the
   * Conversation (loaded including soft-deleted messages) and this method
   * verifies the authenticated user is that message's sender or recipient.
   * This still rejects with 403 when the Conversation exists but contains no
   * viewable (non-deleted) messages (Req 2.3). Existence vs. non-existence of
   * the Conversation itself is handled by the caller (Req 2.6).
   *
   * @param ctx - Optional audit context for the requestor; see
   *   {@link AuthorizationService.assertStudentOwnership} (Req 8.3).
   */
  assertConversationParticipant(
    userId: string,
    role: UserRole,
    message: MessageParticipants,
    ctx?: AuditContext,
  ): void {
    if (this.isAdmin(role)) {
      return;
    }

    if (!this.isMessageParticipant(userId, role, message)) {
      this.recordScopeDenial(ctx, 'conversation', undefined);
      throw AppError.forbidden(
        'You are not a participant in this conversation',
      );
    }
  }

  /**
   * Verify that the authenticated user is the recipient of a Message before a
   * mark-as-read update is applied (Req 4.2).
   *
   * The caller passes the loaded Message so it can evaluate this authorization
   * check before message-existence handling when required (Req 4.3).
   *
   * @param ctx - Optional audit context for the requestor; see
   *   {@link AuthorizationService.assertStudentOwnership} (Req 8.3).
   */
  assertMessageRecipient(
    userId: string,
    role: UserRole,
    message: MessageRecipient,
    ctx?: AuditContext,
  ): void {
    if (this.isAdmin(role)) {
      return;
    }

    const model = this.messageModelForRole(role);
    const isRecipient =
      model !== null &&
      message.recipientModel === model &&
      String(message.recipientId) === userId;

    if (!isRecipient) {
      this.recordScopeDenial(ctx, 'message', undefined);
      throw AppError.forbidden(
        'Only the recipient can mark this message as read',
      );
    }
  }

  /**
   * Verify that the authenticated user is the sender or recipient of a Message
   * before a soft-delete is applied (Req 5.2).
   *
   * @param ctx - Optional audit context for the requestor; see
   *   {@link AuthorizationService.assertStudentOwnership} (Req 8.3).
   */
  assertMessageParticipant(
    userId: string,
    role: UserRole,
    message: MessageParticipants,
    ctx?: AuditContext,
  ): void {
    if (this.isAdmin(role)) {
      return;
    }

    if (!this.isMessageParticipant(userId, role, message)) {
      this.recordScopeDenial(ctx, 'message', undefined);
      throw AppError.forbidden(
        'Only the sender or recipient can delete this message',
      );
    }
  }

  /**
   * Verify that a Feedback document is addressed to the authenticated faculty
   * member before a reply is persisted (Req 9.2, 9.3).
   *
   * The caller loads the Feedback document first (returning 404 when it does
   * not exist, Req 9.4) and passes it here; only feedback whose `targetType`
   * is `teacher` and whose `targetId` is the authenticated user is authorized.
   *
   * @param ctx - Optional audit context for the requestor; see
   *   {@link AuthorizationService.assertStudentOwnership} (Req 8.3).
   */
  assertFeedbackTarget(
    userId: string,
    role: UserRole,
    feedback: FeedbackTarget,
    ctx?: AuditContext,
  ): void {
    if (this.isAdmin(role)) {
      return;
    }

    const isTarget =
      feedback.targetType === 'teacher' &&
      String(feedback.targetId) === userId;

    if (!isTarget) {
      this.recordScopeDenial(ctx, 'feedback', String(feedback.targetId));
      throw AppError.forbidden(
        'You can only reply to feedback addressed to you',
      );
    }
  }

  /**
   * Map an authenticated user's role to the participant model used on Message
   * documents. Faculty members (`teacher`/`faculty`) map to `Faculty` and
   * parents map to `Parent`; any other role has no messaging participant model.
   */
  private messageModelForRole(role: UserRole): MessageParticipantModel | null {
    if (role === 'teacher' || role === 'faculty') {
      return 'Faculty';
    }
    if (role === 'parent') {
      return 'Parent';
    }
    return null;
  }

  /**
   * Determine whether the authenticated user is the sender or recipient of a
   * Message, matching both the identifier and the role-to-model mapping so a
   * parent and faculty member sharing an id can never be confused.
   */
  private isMessageParticipant(
    userId: string,
    role: UserRole,
    message: MessageParticipants,
  ): boolean {
    const model = this.messageModelForRole(role);
    if (model === null) {
      return false;
    }

    const isSender =
      message.senderModel === model && String(message.senderId) === userId;
    const isRecipient =
      message.recipientModel === model &&
      String(message.recipientId) === userId;

    return isSender || isRecipient;
  }

  /**
   * Write an `access_denied` audit entry for an out-of-scope data-isolation
   * denial (Req 8.3).
   *
   * Fired (not awaited) immediately before the owning method throws 403 so the
   * existing synchronous/async throw semantics — and the tests that rely on
   * them — are unchanged. When no audit context is supplied (callers that do
   * not carry request context), the denial is thrown without an audit entry.
   * Any audit-write failure is swallowed so it can never mask or delay the 403.
   *
   * @param ctx - Requestor audit context (actor id/role, source IP, correlation id).
   * @param resource - Coarse resource category for the targeted record.
   * @param resourceId - Identifier of the targeted record, when known.
   */
  private recordScopeDenial(
    ctx: AuditContext | undefined,
    resource: string,
    resourceId?: string,
  ): void {
    if (!ctx) {
      return;
    }

    void auditService
      .logEvent({
        userId: ctx.userId,
        role: ctx.role,
        ip: ctx.ip,
        action: 'access_denied',
        resource,
        resourceId,
        correlationId: ctx.correlationId,
        metadata: redactSecrets({ scope: 'data-isolation' }),
      })
      .catch(() => {
        /* never let an audit failure affect the 403 response */
      });
  }
}

// Export a singleton instance for convenience
export const authorizationService = new AuthorizationService();
