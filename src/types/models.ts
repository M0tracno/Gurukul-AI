/**
 * Shared type definitions for Gurukul AI
 * These types define the data contracts between frontend and backend.
 * 
 * Convention:
 *   - I* prefix for interfaces that mirror Mongoose documents
 *   - *DTO suffix for data transfer objects (API payloads)
 *   - *Params suffix for request parameters
 */

// ─── User Roles ──────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'faculty' | 'parent' | 'admin';

// ─── Base Document ───────────────────────────────────────────────────────────

export interface ITimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface IBaseDocument extends ITimestamps {
  _id: string;
}

// ─── Faculty ─────────────────────────────────────────────────────────────────

export interface IFaculty extends IBaseDocument {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // select: false
  employeeId: string;
  department: string;
  title: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  courses: string[]; // ObjectId refs
  active: boolean;
}

export interface FacultyRegistrationDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  employeeId: string;
  department: string;
  title?: string;
}

// ─── Student ─────────────────────────────────────────────────────────────────

export interface IStudent extends IBaseDocument {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // select: false
  studentId: string;
  grade: string;
  section: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  profilePictureUrl?: string;
  active: boolean;
}

export interface StudentRegistrationDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  studentId: string;
  grade: string;
  section: string;
  dateOfBirth?: string;
}

// ─── Parent ──────────────────────────────────────────────────────────────────

export interface IParent extends IBaseDocument {
  parentId: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  password?: string; // select: false
  address?: string;
  occupation?: string;
  relationToStudent: 'Father' | 'Mother' | 'Guardian' | 'Other';
  isActive: boolean;
  lastLogin?: Date;
  isVerified: boolean;
  firebaseUid?: string;
}

// ─── Parent-Student Relation ─────────────────────────────────────────────────

export interface IParentStudentRelation extends IBaseDocument {
  parentId: string; // ObjectId ref
  studentId: string; // ObjectId ref
  relationship: 'Father' | 'Mother' | 'Guardian' | 'Other';
  isPrimary: boolean;
  isActive: boolean;
  emergencyContact: boolean;
  notes?: string;
}

// ─── Course ──────────────────────────────────────────────────────────────────

export interface ICourse extends IBaseDocument {
  courseCode: string;
  courseName: string;
  description?: string;
  department: string;
  credits: number;
  faculty: string; // ObjectId ref
  semester: string;
  academicYear: string;
  maxStudents: number;
  isActive: boolean;
}

// ─── Enrollment ──────────────────────────────────────────────────────────────

export interface IEnrollment extends IBaseDocument {
  student: string; // ObjectId ref
  course: string; // ObjectId ref
  enrollmentDate: Date;
  status: 'active' | 'dropped' | 'completed';
  grade?: string;
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export interface IAttendance extends IBaseDocument {
  enrollment: string; // ObjectId ref
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
}

// ─── Mark / Grade ────────────────────────────────────────────────────────────

export interface IMark extends IBaseDocument {
  student: string; // ObjectId ref
  course: string; // ObjectId ref
  examType: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade?: string;
  remarks?: string;
  examDate: Date;
}

export interface IGrade extends IBaseDocument {
  studentId: string; // ObjectId ref
  subject: string;
  gradeType: string;
  score: number;
  maxScore: number;
  letterGrade?: string;
  percentage?: number;
  feedback?: string;
  gradeDate: Date;
  academicYear?: string;
  semester?: string;
}

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'announcement' | 'notification' | 'academic_update' | 'attendance_alert';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type SenderRole = 'faculty' | 'student' | 'parent' | 'admin' | 'system';

export interface IMessage extends IBaseDocument {
  conversationId: string;
  senderId: string; // ObjectId ref
  senderRole: SenderRole;
  senderName: string;
  recipientId: string; // ObjectId ref
  recipientRole: SenderRole;
  recipientName: string;
  studentId?: string; // ObjectId ref
  content: string;
  messageType: MessageType;
  priority: MessagePriority;
  isRead: boolean;
  readAt?: Date;
  threadId?: string;
  attachments: IAttachment[];
}

export interface IAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    email: string;
    [key: string]: unknown;
  };
}

export interface JWTPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

// ─── ID Sequence ─────────────────────────────────────────────────────────────

export type SequenceType = 'student' | 'employee' | 'parent' | 'course' | 'other';

export interface IIdSequence extends IBaseDocument {
  sequenceType: SequenceType;
  currentValue: number;
  prefix: string;
  suffix: string;
  minLength: number;
  description?: string;
}

// ─── Health Check ────────────────────────────────────────────────────────────

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
  database?: {
    status: string;
    name: string;
  };
  uptime?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  nodeVersion?: string;
  environment?: string;
}
