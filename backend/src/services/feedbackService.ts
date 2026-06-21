import mongoose from 'mongoose';

import { AppError } from '../middleware/errorHandler.js';
import Feedback from '../models/Feedback.js';
import type { IFeedback, IFeedbackReply } from '../models/Feedback.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Message from '../models/Message.js';
import { authorizationService } from './authorizationService.js';
import { auditService } from './auditService.js';
import { redactSecrets } from '../utils/auditContext.js';
import type { AuditContext } from '../utils/auditContext.js';
import { POSITIVE_THRESHOLD, NEEDS_ATTENTION_THRESHOLD } from '../config/index.js';
import type { UserRole } from '../types/common.js';

/**
 * Author-supplied fields for submitting feedback. The author identity is NEVER
 * part of this shape — it is always derived from `req.user` (Requirement 6.4).
 */
export interface SubmitFeedbackInput {
  targetType: 'teacher' | 'course';
  targetId: string;
  rating: number;
  comment: string;
}

/**
 * Aggregate statistics computed on read over a faculty member's non-deleted
 * received feedback (Requirements 8.2, 8.5). No denormalized counters are kept;
 * the Feedback collection remains the single source of truth.
 */
export interface FeedbackStats {
  /** Count of non-deleted feedback addressed to the teacher. */
  total: number;
  /** Count of those with `rating >= POSITIVE_THRESHOLD`. */
  positive: number;
  /** Count of those with `rating <= NEEDS_ATTENTION_THRESHOLD`. */
  needsAttention: number;
  /** Mean rating over those, or exactly 0 when `total === 0`. */
  averageRating: number;
}

/**
 * Faculty-supplied fields for the "request feedback" action. The teacher
 * identity (sender) is always derived from `req.user`, never from this shape.
 * `courseId`, when present, scopes the request to a single course owned by the
 * teacher; otherwise every course the teacher is assigned to is targeted.
 */
export interface RequestFeedbackInput {
  /** Optional subject line for the generated messages. */
  subject?: string;
  /** Optional body for the generated messages. */
  message?: string;
  /** Optional course id to scope eligible recipients to one course. */
  courseId?: string;
}

/**
 * Outward-facing result of a "request feedback" action: how many recipients
 * were notified and the identifiers of the messages created (Design Decision
 * 7 — the request is realized as `Message` documents).
 */
export interface FeedbackRequestDTO {
  recipientsNotified: number;
  messageIds: string[];
}

/** Outward-facing shape for a single feedback reply. */
export interface FeedbackReplyDTO {
  id?: string;
  responderId: string;
  responderModel: 'Faculty';
  message: string;
  createdAt: Date;
}

/**
 * Outward-facing feedback shape. Internal fields (`isDeleted`, `__v`,
 * `targetModel`) are intentionally omitted.
 */
export interface FeedbackDTO {
  id: string;
  authorId: string;
  authorModel: 'Student' | 'Parent';
  authorRole: 'student' | 'parent';
  targetType: 'teacher' | 'course';
  targetId: string;
  rating: number;
  comment: string;
  replies: FeedbackReplyDTO[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resolve the author model/role pair for a feedback submission from the
 * authenticated user's role. Only students and parents may author feedback
 * (Requirement 6.1, 6.7); any other role is rejected defensively even though
 * the route-level RBAC middleware already enforces this.
 */
function authorIdentityFromRole(role: UserRole): {
  authorModel: 'Student' | 'Parent';
  authorRole: 'student' | 'parent';
} {
  if (role === 'student') {
    return { authorModel: 'Student', authorRole: 'student' };
  }
  if (role === 'parent') {
    return { authorModel: 'Parent', authorRole: 'parent' };
  }
  throw AppError.forbidden('Only students and parents can submit feedback');
}

/** Map a persisted reply subdocument to its outward-facing shape. */
function toReplyDTO(reply: IFeedbackReply): FeedbackReplyDTO {
  const id = (reply as IFeedbackReply & { _id?: unknown })._id;
  return {
    id: id !== undefined ? String(id) : undefined,
    responderId: String(reply.responderId),
    responderModel: reply.responderModel,
    message: reply.message,
    createdAt: reply.createdAt,
  };
}

/**
 * Map a persisted Feedback document to the outward-facing {@link FeedbackDTO}
 * shape, excluding internal fields.
 */
function toFeedbackDTO(feedback: IFeedback): FeedbackDTO {
  return {
    id: String(feedback._id),
    authorId: String(feedback.authorId),
    authorModel: feedback.authorModel,
    authorRole: feedback.authorRole,
    targetType: feedback.targetType,
    targetId: String(feedback.targetId),
    rating: feedback.rating,
    comment: feedback.comment,
    replies: (feedback.replies ?? []).map(toReplyDTO),
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
}

/**
 * Feedback service — business logic layer. Never references HTTP
 * Request/Response objects; throws {@link AppError} for failures and returns
 * plain DTOs.
 */
export class FeedbackService {
  /**
   * Submit feedback about a teacher or course.
   *
   * The Feedback_Author identity (`authorId`/`authorModel`/`authorRole`) is
   * derived solely from the authenticated user (Requirements 6.1, 6.4) and is
   * never taken from the request body. The target is validated to exist and to
   * not be soft-deleted before any write: a malformed target id yields HTTP 400
   * and an absent/soft-deleted target yields HTTP 404 (Design Decision 4). No
   * author–target relationship is required in this iteration.
   *
   * The created document is returned only after the database confirms the write
   * (Requirement 6.3), and a success audit entry is written with metadata
   * passed through the redaction guard so no secret can ever be recorded.
   *
   * @see Requirements 6.1, 6.3, 6.4
   */
  async submit(
    authorId: string,
    role: UserRole,
    input: SubmitFeedbackInput,
    ctx: AuditContext,
  ): Promise<FeedbackDTO> {
    const { authorModel, authorRole } = authorIdentityFromRole(role);

    // Validate the target exists and is not soft-deleted (Design Decision 4).
    await this.assertTargetExists(input.targetType, input.targetId);

    // Persist; the create promise resolves only after the write is confirmed
    // (Requirement 6.3), so no 201 can be returned before persistence.
    const created = await Feedback.create({
      authorId: new mongoose.Types.ObjectId(authorId),
      authorModel,
      authorRole,
      targetType: input.targetType,
      targetId: new mongoose.Types.ObjectId(input.targetId),
      rating: input.rating,
      comment: input.comment,
    });

    // Success audit entry — metadata passes through the redaction guard so no
    // secret can ever be written (Requirement 12.7).
    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'feedback_submitted',
      resource: 'Feedback',
      resourceId: String(created._id),
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        targetType: input.targetType,
        targetId: input.targetId,
        rating: input.rating,
      }),
    });

    return toFeedbackDTO(created);
  }

  /**
   * List the feedback authored by the authenticated user.
   *
   * The author scope is derived solely from `req.user` (Requirement 7.2); a
   * client-supplied author identifier is never honored. Results are restricted
   * to the author's own non-deleted feedback (Requirement 7.1), ordered by
   * `createdAt` descending (Requirement 7.4), and paginated.
   *
   * @see Requirements 7.1, 7.2, 7.4
   */
  async listOwn(
    authorId: string,
    _role: UserRole,
    page: number,
    limit: number,
  ): Promise<{ data: FeedbackDTO[]; total: number }> {
    const effectiveLimit = Math.min(Math.max(Math.trunc(limit) || 1, 1), 100);
    const effectivePage = Math.max(Math.trunc(page) || 1, 1);
    const skip = (effectivePage - 1) * effectiveLimit;

    const query = {
      authorId: new mongoose.Types.ObjectId(authorId),
      isDeleted: false,
    };

    const [docs, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(effectiveLimit)
        .exec(),
      Feedback.countDocuments(query).exec(),
    ]);

    return {
      data: docs.map(toFeedbackDTO),
      total,
    };
  }

  /**
   * List the feedback addressed to a faculty member, with aggregate statistics
   * (Requirements 8.1, 8.2, 8.3, 8.4, 8.5).
   *
   * The target scope is derived solely from `req.user` (Requirement 8.3); a
   * client-supplied target identifier is never honored. Results are restricted
   * to non-deleted feedback whose `targetType` is `teacher` and whose
   * `targetId` is the authenticated teacher (Requirements 8.1, 8.3), ordered by
   * `createdAt` descending (Requirement 8.4), and paginated.
   *
   * {@link FeedbackStats} are computed on read over the teacher's *full*
   * non-deleted feedback set (not just the returned page): `total`, `positive`
   * (`rating >= POSITIVE_THRESHOLD`), `needsAttention`
   * (`rating <= NEEDS_ATTENTION_THRESHOLD`), and `averageRating` (mean rating,
   * exactly 0 when `total === 0`) (Requirements 8.2, 8.5).
   *
   * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5
   */
  async listReceived(
    teacherId: string,
    page: number,
    limit: number,
  ): Promise<{ data: FeedbackDTO[]; total: number; stats: FeedbackStats }> {
    const effectiveLimit = Math.min(Math.max(Math.trunc(limit) || 1, 1), 100);
    const effectivePage = Math.max(Math.trunc(page) || 1, 1);
    const skip = (effectivePage - 1) * effectiveLimit;

    const query = {
      targetType: 'teacher' as const,
      targetId: new mongoose.Types.ObjectId(teacherId),
      isDeleted: false,
    };

    // Page of feedback (ordered desc) plus the stats aggregation over the full
    // non-deleted target set, computed concurrently.
    const [docs, statsAgg] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(effectiveLimit)
        .exec(),
      Feedback.aggregate<{
        total: number;
        ratingSum: number;
        positive: number;
        needsAttention: number;
      }>([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            ratingSum: { $sum: '$rating' },
            positive: {
              $sum: {
                $cond: [{ $gte: ['$rating', POSITIVE_THRESHOLD] }, 1, 0],
              },
            },
            needsAttention: {
              $sum: {
                $cond: [{ $lte: ['$rating', NEEDS_ATTENTION_THRESHOLD] }, 1, 0],
              },
            },
          },
        },
      ]).exec(),
    ]);

    const agg = statsAgg[0];
    const total = agg?.total ?? 0;
    const stats: FeedbackStats = {
      total,
      positive: agg?.positive ?? 0,
      needsAttention: agg?.needsAttention ?? 0,
      averageRating: total > 0 ? (agg?.ratingSum ?? 0) / total : 0,
    };

    return {
      data: docs.map(toFeedbackDTO),
      total,
      stats,
    };
  }

  /**
   * Persist a faculty reply to a Feedback document addressed to them
   * (Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.8).
   *
   * The feedback is loaded first: a non-existent (or soft-deleted) document
   * yields HTTP 404 (Requirement 9.4). Authorization is then delegated to
   * {@link AuthorizationService.assertFeedbackTarget}, which throws 403 unless
   * the feedback's target is the authenticated teacher (Requirements 9.2, 9.3).
   * Only after the database confirms the write is the reply considered
   * persisted and the updated document returned (Requirement 9.8); if the
   * update is not confirmed, an error is thrown rather than a success returned.
   *
   * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.8
   */
  async reply(
    teacherId: string,
    feedbackId: string,
    message: string,
    ctx: AuditContext,
  ): Promise<FeedbackDTO> {
    // A malformed id matches no document → treat as not found (Requirement 9.4).
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
      throw AppError.notFound(`No feedback found for id ${feedbackId}`);
    }

    const feedback = await Feedback.findOne({
      _id: new mongoose.Types.ObjectId(feedbackId),
      isDeleted: false,
    }).exec();

    if (!feedback) {
      throw AppError.notFound(`No feedback found for id ${feedbackId}`);
    }

    // Only the targeted teacher may reply (Requirements 9.2, 9.3). The reply
    // route is teacher-scoped, so the role is `teacher`; the audit context is
    // forwarded so an out-of-scope attempt is recorded before the 403.
    authorizationService.assertFeedbackTarget(
      teacherId,
      'teacher',
      feedback,
      ctx,
    );

    const reply: IFeedbackReply = {
      responderId: new mongoose.Types.ObjectId(teacherId),
      responderModel: 'Faculty',
      message,
      createdAt: new Date(),
    };

    // Persist the reply; the document is only returned once the write is
    // confirmed (Requirement 9.8). A missing result means the write did not
    // take effect, so surface an error rather than a false success.
    const updated = await Feedback.findOneAndUpdate(
      { _id: feedback._id, isDeleted: false },
      { $push: { replies: reply } },
      { new: true },
    ).exec();

    if (!updated) {
      throw AppError.internal('Failed to persist feedback reply');
    }

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'feedback_replied',
      resource: 'Feedback',
      resourceId: String(updated._id),
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        targetType: updated.targetType,
        targetId: String(updated.targetId),
      }),
    });

    return toFeedbackDTO(updated);
  }

  /**
   * Request feedback from the people eligible to give it to a faculty member
   * (Requirements 9.1, 9.5; Design Decision 7).
   *
   * Per Design Decision 7 the request is realized in the lightest reasonable
   * way: a `Message` of `messageType: 'general'` is sent to each eligible
   * recipient — the parents linked to students enrolled (active/completed) in
   * the teacher's courses. When a `courseId` is supplied the request is scoped
   * to that single course, but only if it is assigned to the teacher (otherwise
   * no recipients resolve). The teacher (sender) is always derived from
   * `req.user`. A success audit entry records how many recipients were
   * notified; metadata passes through the redaction guard (Requirement 12.7).
   *
   * @see Requirements 9.1, 9.5
   */
  async requestFeedback(
    teacherId: string,
    input: RequestFeedbackInput,
    ctx: AuditContext,
  ): Promise<FeedbackRequestDTO> {
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    // Resolve the teacher's (optionally course-scoped) non-deleted courses.
    const courseFilter: Record<string, unknown> = {
      faculty: teacherObjectId,
      deletedAt: null,
    };
    if (input.courseId && mongoose.Types.ObjectId.isValid(input.courseId)) {
      courseFilter._id = new mongoose.Types.ObjectId(input.courseId);
    } else if (input.courseId) {
      // A malformed course id can match no course owned by the teacher.
      return this.emptyFeedbackRequest(teacherId, input, ctx);
    }

    const courses = await Course.find(courseFilter).select('_id').lean();
    if (courses.length === 0) {
      return this.emptyFeedbackRequest(teacherId, input, ctx);
    }
    const courseIds = courses.map((c) => c._id);

    // Students currently/previously enrolled in those courses.
    const enrollments = await Enrollment.find({
      course: { $in: courseIds },
      status: { $in: ['active', 'completed'] },
    })
      .select('student')
      .lean();

    const studentIds = [
      ...new Set(enrollments.map((e) => String(e.student))),
    ].map((id) => new mongoose.Types.ObjectId(id));

    if (studentIds.length === 0) {
      return this.emptyFeedbackRequest(teacherId, input, ctx);
    }

    // Active parent linkages for those students.
    const relations = await ParentStudentRelation.find({
      studentId: { $in: studentIds },
      isActive: true,
    })
      .select('parentId studentId')
      .lean();

    if (relations.length === 0) {
      return this.emptyFeedbackRequest(teacherId, input, ctx);
    }

    // Resolve the names required by the Message schema.
    const parentIds = [...new Set(relations.map((r) => String(r.parentId)))];
    const relStudentIds = [...new Set(relations.map((r) => String(r.studentId)))];

    const [teacher, parents, students] = await Promise.all([
      Faculty.findById(teacherObjectId).select('firstName lastName').lean(),
      Parent.find({ _id: { $in: parentIds }, isActive: true })
        .select('firstName lastName')
        .lean(),
      Student.find({ _id: { $in: relStudentIds } })
        .select('firstName lastName')
        .lean(),
    ]);

    if (!teacher) {
      throw AppError.notFound(`No teacher found for id ${teacherId}`);
    }

    const senderName = `${teacher.firstName} ${teacher.lastName}`;
    const parentNameById = new Map(
      parents.map((p) => [String(p._id), `${p.firstName} ${p.lastName}`]),
    );
    const studentNameById = new Map(
      students.map((s) => [String(s._id), `${s.firstName} ${s.lastName}`]),
    );

    const subject = input.subject?.trim() || 'Feedback requested';
    const content =
      input.message?.trim() ||
      `${senderName} has requested your feedback. Please share your thoughts when you have a moment.`;

    // Build one Message per eligible (parent, student) linkage. Only linkages
    // whose parent is still active resolve a recipient name.
    const messages = relations
      .filter((r) => parentNameById.has(String(r.parentId)))
      .map((r) => ({
        subject,
        content,
        senderId: teacherObjectId,
        senderModel: 'Faculty' as const,
        senderName,
        recipientId: r.parentId,
        recipientModel: 'Parent' as const,
        recipientName: parentNameById.get(String(r.parentId)) ?? 'Parent',
        studentId: r.studentId,
        studentName: studentNameById.get(String(r.studentId)) ?? 'Student',
        messageType: 'general' as const,
      }));

    if (messages.length === 0) {
      return this.emptyFeedbackRequest(teacherId, input, ctx);
    }

    const created = await Message.insertMany(messages);
    const messageIds = created.map((m) => String(m._id));

    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'feedback_requested',
      resource: 'Feedback',
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        recipientsNotified: messageIds.length,
        ...(input.courseId ? { courseId: input.courseId } : {}),
      }),
    });

    return {
      recipientsNotified: messageIds.length,
      messageIds,
    };
  }

  /**
   * Audit and return an empty {@link FeedbackRequestDTO} when no eligible
   * recipient resolves for a feedback request. The request is still recorded so
   * the action is observable even when it reaches nobody.
   */
  private async emptyFeedbackRequest(
    teacherId: string,
    input: RequestFeedbackInput,
    ctx: AuditContext,
  ): Promise<FeedbackRequestDTO> {
    await auditService.logEvent({
      userId: ctx.userId,
      role: ctx.role,
      ip: ctx.ip,
      action: 'feedback_requested',
      resource: 'Feedback',
      correlationId: ctx.correlationId,
      metadata: redactSecrets({
        recipientsNotified: 0,
        ...(input.courseId ? { courseId: input.courseId } : {}),
      }),
    });

    return { recipientsNotified: 0, messageIds: [] };
  }

  /**
   * Validate that a feedback target exists and is not soft-deleted.
   *
   * Returns HTTP 400 for a malformed target id and HTTP 404 when the target
   * does not exist or has been soft-deleted (Design Decision 4). A `teacher`
   * target must resolve to a non-deleted `Faculty` record; a `course` target to
   * a non-deleted `Course` record.
   */
  private async assertTargetExists(
    targetType: 'teacher' | 'course',
    targetId: string,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw AppError.badRequest('A valid feedback target identifier is required');
    }

    const _id = new mongoose.Types.ObjectId(targetId);

    if (targetType === 'teacher') {
      const faculty = await Faculty.findOne({ _id, deletedAt: null })
        .select('_id')
        .lean();
      if (!faculty) {
        throw AppError.notFound(`No teacher found for id ${targetId}`);
      }
      return;
    }

    const course = await Course.findOne({ _id, deletedAt: null })
      .select('_id')
      .lean();
    if (!course) {
      throw AppError.notFound(`No course found for id ${targetId}`);
    }
  }
}

export const feedbackService = new FeedbackService();
