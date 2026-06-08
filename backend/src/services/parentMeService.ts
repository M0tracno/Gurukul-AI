import mongoose from 'mongoose';
import Student from '../models/Student.js';
import { AppError } from '../middleware/errorHandler.js';
import { authorizationService } from './authorizationService.js';
import { studentMeService } from './studentMeService.js';
import type { UserRole } from '../types/common.js';

/**
 * Service layer for parent self-service endpoints.
 * Provides methods to fetch children info and child academic data.
 * Uses AuthorizationService to verify parent-child linkage before access.
 */
class ParentMeService {
  /**
   * Get all children (students) linked to this parent via ParentStudentRelation.
   */
  async getChildren(parentId: string) {
    // Access ParentStudentRelation model dynamically (same pattern as authorizationService)
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

    // Find active relations for this parent
    const relations = await ParentStudentRelation.find({
      parentId: new mongoose.Types.ObjectId(parentId),
      isActive: true,
    }).lean();

    if (relations.length === 0) return [];

    // Get the linked student IDs
    const studentIds = (relations as any[]).map((r) => r.studentId);

    // Fetch student details
    const students = await Student.find({
      _id: { $in: studentIds },
      deletedAt: null,
    })
      .select('firstName lastName studentId grade active')
      .lean();

    return students.map((s: any) => ({
      id: s._id.toString(),
      firstName: s.firstName,
      lastName: s.lastName,
      studentId: s.studentId,
      grade: s.grade,
      active: s.active ?? true,
    }));
  }

  /**
   * Verify parent has access to this child, and that child exists.
   * Throws 403 if not linked, 404 if child doesn't exist.
   */
  private async verifyChildAccess(parentId: string, childId: string, role: UserRole): Promise<void> {
    // Check parent-child linkage (throws 403 if not linked)
    await authorizationService.assertParentAccess(parentId, childId, role);

    // Verify child exists
    const student = await Student.findById(childId).lean();
    if (!student) {
      throw AppError.notFound('Student not found');
    }
  }

  /**
   * Get courses for a specific child (after verifying access).
   */
  async getChildCourses(parentId: string, childId: string, role: UserRole) {
    await this.verifyChildAccess(parentId, childId, role);
    return studentMeService.getCourses(childId);
  }

  /**
   * Get grades for a specific child (after verifying access).
   */
  async getChildGrades(parentId: string, childId: string, role: UserRole) {
    await this.verifyChildAccess(parentId, childId, role);
    return studentMeService.getGrades(childId);
  }

  /**
   * Get attendance for a specific child (after verifying access).
   */
  async getChildAttendance(
    parentId: string,
    childId: string,
    role: UserRole,
    dateRange?: { startDate?: Date; endDate?: Date },
  ) {
    await this.verifyChildAccess(parentId, childId, role);
    return studentMeService.getAttendance(childId, dateRange);
  }
}

export const parentMeService = new ParentMeService();
