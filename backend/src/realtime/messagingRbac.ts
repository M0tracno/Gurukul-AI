import mongoose from 'mongoose';

import type { UserRole } from '../types/common.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { failure, type ErrorEnvelope } from '../utils/envelope.js';

// ─── Channel Type Definitions (Requirement 16.1) ─────────────────────────────

/**
 * The three supported channel types per Requirement 16.1.
 * Each channel type restricts participation to exactly two role types.
 */
export type ChannelType = 'parent_teacher' | 'teacher_student' | 'teacher_admin';

/**
 * Mapping from channel type to the pair of user roles permitted on that channel.
 */
export const CHANNEL_ROLE_PAIRS: Record<ChannelType, [UserRole, UserRole]> = {
  parent_teacher: ['parent', 'teacher'],
  teacher_student: ['teacher', 'student'],
  teacher_admin: ['teacher', 'admin'],
};

/**
 * All valid channel types as an array for iteration/validation.
 */
export const ALL_CHANNEL_TYPES: ChannelType[] = ['parent_teacher', 'teacher_student', 'teacher_admin'];

/**
 * Determines the channel type for a conversation between two roles.
 * Returns undefined if no valid channel exists for the role pair.
 */
export function resolveChannelType(roleA: UserRole, roleB: UserRole): ChannelType | undefined {
  // Normalize 'faculty' to 'teacher' for channel resolution
  const normA = roleA === 'faculty' ? 'teacher' : roleA;
  const normB = roleB === 'faculty' ? 'teacher' : roleB;

  for (const [channelType, [r1, r2]] of Object.entries(CHANNEL_ROLE_PAIRS)) {
    if ((normA === r1 && normB === r2) || (normA === r2 && normB === r1)) {
      return channelType as ChannelType;
    }
  }
  return undefined;
}

/**
 * Checks whether a given role is permitted on a given channel type.
 */
function isRolePermittedOnChannel(role: UserRole, channelType: ChannelType): boolean {
  const normalizedRole = role === 'faculty' ? 'teacher' : role;
  const [r1, r2] = CHANNEL_ROLE_PAIRS[channelType];
  return normalizedRole === r1 || normalizedRole === r2;
}

// ─── canJoin / canPost (Requirement 16.3) ─────────────────────────────────────

/**
 * Result of a channel access check (canJoin/canPost).
 * When `allowed` is false, `errorEnvelope` contains a 403-shaped Error_Envelope.
 */
export interface ChannelAccessResult {
  allowed: boolean;
  errorEnvelope?: ErrorEnvelope;
  reason?: string;
}

/**
 * Determines if a user is authorized to JOIN a channel.
 * Violations produce a 403 Error_Envelope per Requirement 16.3.
 *
 * @param userRole - The role of the user attempting to join
 * @param channelType - The channel type being joined
 * @returns ChannelAccessResult with allowed status and optional error
 */
export function canJoin(userRole: UserRole, channelType: ChannelType): ChannelAccessResult {
  if (!ALL_CHANNEL_TYPES.includes(channelType)) {
    return {
      allowed: false,
      reason: `Invalid channel type: ${channelType}`,
      errorEnvelope: failure(`Invalid channel type: ${channelType}`),
    };
  }

  if (!isRolePermittedOnChannel(userRole, channelType)) {
    const [r1, r2] = CHANNEL_ROLE_PAIRS[channelType];
    return {
      allowed: false,
      reason: `Role '${userRole}' is not permitted on channel '${channelType}'. Allowed roles: ${r1}, ${r2}`,
      errorEnvelope: failure(
        `Access denied: role '${userRole}' cannot join '${channelType}' channel`,
        [{ field: 'channel', reason: `Only ${r1} and ${r2} roles are permitted` }]
      ),
    };
  }

  return { allowed: true };
}

/**
 * Determines if a user is authorized to POST a message on a channel.
 * Violations produce a 403 Error_Envelope per Requirement 16.3.
 *
 * @param userRole - The role of the user attempting to post
 * @param channelType - The channel type being posted to
 * @returns ChannelAccessResult with allowed status and optional error
 */
export function canPost(userRole: UserRole, channelType: ChannelType): ChannelAccessResult {
  if (!ALL_CHANNEL_TYPES.includes(channelType)) {
    return {
      allowed: false,
      reason: `Invalid channel type: ${channelType}`,
      errorEnvelope: failure(`Invalid channel type: ${channelType}`),
    };
  }

  if (!isRolePermittedOnChannel(userRole, channelType)) {
    const [r1, r2] = CHANNEL_ROLE_PAIRS[channelType];
    return {
      allowed: false,
      reason: `Role '${userRole}' is not permitted to post on channel '${channelType}'. Allowed roles: ${r1}, ${r2}`,
      errorEnvelope: failure(
        `Access denied: role '${userRole}' cannot post on '${channelType}' channel`,
        [{ field: 'channel', reason: `Only ${r1} and ${r2} roles may post` }]
      ),
    };
  }

  return { allowed: true };
}

// ─── Existing Messaging Permission Validation ─────────────────────────────────

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
