import mongoose from 'mongoose';

import type { UserRole } from '../types/common.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

/**
 * Result of a messaging permission check.
 */
export interface MessagingPermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether a sender has permission to message a recipient
 * based on the RBAC rules for the Gurukul AI platform.
 *
 * Rules:
 * - Admin: Can message anyone
 * - Student → Teacher only: Student can only message Faculty who teach courses they're enrolled in
 * - Parent → Teacher only: Parent can only message Faculty who teach courses their linked ward is enrolled in
 * - Teacher → Student/Parent: Teacher can message Students/Parents who are in their courses
 *
 * @param senderId - The ID of the message sender
 * @param senderRole - The role of the sender (admin, teacher, student, parent)
 * @param recipientId - The ID of the message recipient
 * @param recipientModel - The model type of the recipient ('Parent' | 'Faculty' | 'Student')
 * @returns A promise resolving to an object with `allowed` boolean and optional `reason` string
 */
export async function validateMessagingPermission(
  senderId: string,
  senderRole: UserRole,
  recipientId: string,
  recipientModel: 'Parent' | 'Faculty' | 'Student',
): Promise<MessagingPermissionResult> {
  // Admin can message anyone
  if (senderRole === 'admin') {
    return { allowed: true };
  }

  // Student → Teacher only
  if (senderRole === 'student') {
    return validateStudentMessaging(senderId, recipientId, recipientModel);
  }

  // Parent → Teacher only
  if (senderRole === 'parent') {
    return validateParentMessaging(senderId, recipientId, recipientModel);
  }

  // Teacher → Student/Parent in their courses
  if (senderRole === 'teacher') {
    return validateTeacherMessaging(senderId, recipientId, recipientModel);
  }

  return { allowed: false, reason: 'Unknown sender role' };
}

/**
 * Student can only message Faculty who teach courses they are enrolled in.
 */
async function validateStudentMessaging(
  studentId: string,
  recipientId: string,
  recipientModel: 'Parent' | 'Faculty' | 'Student',
): Promise<MessagingPermissionResult> {
  // Students can only message teachers (Faculty)
  if (recipientModel !== 'Faculty') {
    return {
      allowed: false,
      reason: 'Students can only message their assigned teachers',
    };
  }

  // Find courses that this student is enrolled in (active or completed)
  const enrollments = await Enrollment.find({
    student: new mongoose.Types.ObjectId(studentId),
    status: { $in: ['active', 'completed'] },
  })
    .select('course')
    .lean();

  if (enrollments.length === 0) {
    return {
      allowed: false,
      reason: 'Students can only message their assigned teachers',
    };
  }

  const courseIds = enrollments.map((e) => e.course);

  // Check if the recipient (Faculty) teaches any of the student's courses
  const course = await Course.findOne({
    _id: { $in: courseIds },
    faculty: new mongoose.Types.ObjectId(recipientId),
    deletedAt: null,
  }).lean();

  if (!course) {
    return {
      allowed: false,
      reason: 'Students can only message their assigned teachers',
    };
  }

  return { allowed: true };
}

/**
 * Parent can only message Faculty who teach courses their linked ward is enrolled in.
 */
async function validateParentMessaging(
  parentId: string,
  recipientId: string,
  recipientModel: 'Parent' | 'Faculty' | 'Student',
): Promise<MessagingPermissionResult> {
  // Parents can only message teachers (Faculty)
  if (recipientModel !== 'Faculty') {
    return {
      allowed: false,
      reason: 'Parents can only message their ward\'s teachers',
    };
  }

  // Get the ParentStudentRelation model (handles circular import avoidance)
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

  // Find linked wards (students)
  const relations = await ParentStudentRelation.find({
    parentId: new mongoose.Types.ObjectId(parentId),
    isActive: true,
  })
    .select('studentId')
    .lean();

  if (relations.length === 0) {
    return {
      allowed: false,
      reason: 'Parents can only message their ward\'s teachers',
    };
  }

  const studentIds = relations.map((r: { studentId: mongoose.Types.ObjectId }) => r.studentId);

  // Find courses that any of the parent's wards are enrolled in
  const enrollments = await Enrollment.find({
    student: { $in: studentIds },
    status: { $in: ['active', 'completed'] },
  })
    .select('course')
    .lean();

  if (enrollments.length === 0) {
    return {
      allowed: false,
      reason: 'Parents can only message their ward\'s teachers',
    };
  }

  const courseIds = enrollments.map((e) => e.course);

  // Check if the recipient (Faculty) teaches any of those courses
  const course = await Course.findOne({
    _id: { $in: courseIds },
    faculty: new mongoose.Types.ObjectId(recipientId),
    deletedAt: null,
  }).lean();

  if (!course) {
    return {
      allowed: false,
      reason: 'Parents can only message their ward\'s teachers',
    };
  }

  return { allowed: true };
}

/**
 * Teacher can message Students/Parents who are in their courses.
 */
async function validateTeacherMessaging(
  teacherId: string,
  recipientId: string,
  recipientModel: 'Parent' | 'Faculty' | 'Student',
): Promise<MessagingPermissionResult> {
  // Teachers cannot message other teachers via this system
  if (recipientModel === 'Faculty') {
    return {
      allowed: false,
      reason: 'Teachers can only message students and parents in their courses',
    };
  }

  // Find courses taught by this teacher
  const teacherCourses = await Course.find({
    faculty: new mongoose.Types.ObjectId(teacherId),
    deletedAt: null,
  })
    .select('_id')
    .lean();

  if (teacherCourses.length === 0) {
    return {
      allowed: false,
      reason: 'Teachers can only message students and parents in their courses',
    };
  }

  const courseIds = teacherCourses.map((c) => c._id);

  if (recipientModel === 'Student') {
    // Check if the student is enrolled in any of the teacher's courses
    const enrollment = await Enrollment.findOne({
      student: new mongoose.Types.ObjectId(recipientId),
      course: { $in: courseIds },
      status: { $in: ['active', 'completed'] },
    }).lean();

    if (!enrollment) {
      return {
        allowed: false,
        reason: 'Teachers can only message students and parents in their courses',
      };
    }

    return { allowed: true };
  }

  if (recipientModel === 'Parent') {
    // Get the ParentStudentRelation model
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

    // Find the parent's linked students
    const relations = await ParentStudentRelation.find({
      parentId: new mongoose.Types.ObjectId(recipientId),
      isActive: true,
    })
      .select('studentId')
      .lean();

    if (relations.length === 0) {
      return {
        allowed: false,
        reason: 'Teachers can only message students and parents in their courses',
      };
    }

    const studentIds = relations.map((r: { studentId: mongoose.Types.ObjectId }) => r.studentId);

    // Check if any of the parent's students are enrolled in the teacher's courses
    const enrollment = await Enrollment.findOne({
      student: { $in: studentIds },
      course: { $in: courseIds },
      status: { $in: ['active', 'completed'] },
    }).lean();

    if (!enrollment) {
      return {
        allowed: false,
        reason: 'Teachers can only message students and parents in their courses',
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'Invalid recipient model' };
}
