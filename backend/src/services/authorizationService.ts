import mongoose from 'mongoose';

import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/common.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { auditService } from './auditService.js';
import { redactSecrets, type AuditContext } from '../utils/auditContext.js';

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
