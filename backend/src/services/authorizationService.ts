import mongoose from 'mongoose';

import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/common.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

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
   */
  assertStudentOwnership(
    requestorId: string,
    targetStudentId: string,
    role: UserRole,
  ): void {
    if (this.isAdmin(role)) {
      return;
    }

    if (requestorId !== targetStudentId) {
      throw AppError.forbidden(
        'Students can only access their own records',
      );
    }
  }

  /**
   * Verify that a parent can only access their linked ward's data.
   * Queries the ParentStudentRelation collection to check the link.
   * Throws 403 if the parent has no active relationship to the target student.
   */
  async assertParentAccess(
    parentId: string,
    targetStudentId: string,
    role: UserRole,
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
      throw AppError.forbidden(
        'Parents can only access their linked ward\'s data',
      );
    }
  }

  /**
   * Verify that a teacher can only access courses they are assigned to.
   * Checks that the course's faculty field matches the teacher's ID.
   * Throws 403 if the teacher is not the assigned faculty for the course.
   */
  async assertTeacherCourseAccess(
    teacherId: string,
    courseId: string,
    role: UserRole,
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
      throw AppError.forbidden(
        'Teachers can only access their assigned courses',
      );
    }
  }

  /**
   * Verify that a teacher can access a specific student's data.
   * The student must be enrolled in one of the teacher's courses.
   * Throws 403 if the student is not enrolled in any of the teacher's courses.
   */
  async assertTeacherStudentAccess(
    teacherId: string,
    targetStudentId: string,
    role: UserRole,
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
}

// Export a singleton instance for convenience
export const authorizationService = new AuthorizationService();
