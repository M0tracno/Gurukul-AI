/**
 * Database Schema Documentation
 *
 * This file contains the schema definitions for all collections in the database.
 * It serves as documentation and is not used in the actual application.
 */

// User schema (stored in users collection)
const userSchema = {
  email: 'string', // User's email address
  role: 'string', // User role: 'faculty', 'student', 'parent', 'admin'
  displayName: 'string', // User's display name
  createdAt: 'timestamp', // When the account was created
  lastLogin: 'timestamp', // Last login timestamp
  phoneNumber: 'string', // Optional phone number
};

// Faculty schema (stored in faculty collection)
const facultySchema = {
  userId: 'string', // Reference to user ID
  firstName: 'string',
  lastName: 'string',
  email: 'string',
  department: 'string',
  position: 'string', // e.g., 'Professor', 'Assistant Professor', etc.
  specialization: 'string',
  qualifications: 'array', // Array of qualifications
  joiningDate: 'timestamp',
  employeeId: 'string', // Faculty ID number
  contactNumber: 'string',
  address: 'object', // Contains address details
  profilePictureUrl: 'string', // URL to profile picture (optional)
  bio: 'string', // Short biography (optional)
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// Student schema (stored in students collection)
const studentSchema = {
  userId: 'string', // Reference to user ID
  firstName: 'string',
  lastName: 'string',
  email: 'string',
  rollNumber: 'string', // Student roll number/ID
  classId: 'string', // Reference to class (e.g., '10', '12' for grades)
  section: 'string', // Class section (e.g., 'A', 'B')
  admissionDate: 'timestamp',
  dateOfBirth: 'timestamp',
  gender: 'string',
  contactNumber: 'string',
  parentId: 'string', // Reference to parent user ID (optional)
  address: 'object', // Contains address details
  profilePictureUrl: 'string', // URL to profile picture (optional)
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// Parent schema (stored in parents collection)
const parentSchema = {
  userId: 'string', // Reference to user ID
  firstName: 'string',
  lastName: 'string',
  email: 'string',
  contactNumber: 'string',
  alternateContactNumber: 'string', // Secondary contact (optional)
  occupation: 'string', // (optional)
  relationship: 'string', // e.g., 'Father', 'Mother', 'Guardian'
  studentIds: 'array', // Array of student IDs (references to student collection)
  address: 'object', // Contains address details
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// Course schema (stored in courses collection)
const courseSchema = {
  name: 'string', // Course name
  code: 'string', // Course code
  description: 'string',
  classId: 'string', // Class for which this course is (e.g., '10', '12')
  section: 'string', // Section (optional, if specific to a section)
  facultyId: 'string', // Reference to faculty teaching this course
  academicYear: 'string', // e.g., '2023-2024'
  semester: 'string', // e.g., 'Fall', 'Spring', or '1', '2'
  startDate: 'timestamp',
  endDate: 'timestamp',
  schedule: 'array', // Array of schedule objects with day, startTime, endTime
  creditHours: 'number',
  maxCapacity: 'number', // Maximum number of students allowed
  studentIds: 'array', // Array of enrolled student IDs
  materials: 'array', // Array of course material objects (optional)
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// Enrollment schema (stored in enrollments collection)
const enrollmentSchema = {
  studentId: 'string', // Reference to student ID
  courseId: 'string', // Reference to course ID
  enrollmentDate: 'timestamp',
  status: 'string', // e.g., 'active', 'dropped', 'completed'
  grade: 'string', // Final grade (once completed)
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// Marks/Assessment schema (stored in marks collection)
// Document ID format: courseId_assessmentType_assessmentName
const marksSchema = {
  courseId: 'string', // Reference to course ID
  assessmentName: 'string', // e.g., 'Midterm', 'Quiz 1', 'Final Exam'
  assessmentType: 'string', // e.g., 'quiz', 'exam', 'assignment', 'project'
  date: 'string', // YYYY-MM-DD format for the date of this assessment
  totalMarks: 'number', // Maximum possible marks
  weightage: 'number', // Percentage contribution to final grade (optional)
  studentMarks: 'map', // Map of studentId -> marks scored
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// Notification schema (stored in notifications collection)
const notificationSchema = {
  recipientId: 'string', // User ID of recipient
  recipientRole: 'string', // Role of the recipient (faculty, student, parent)
  senderId: 'string', // User ID of sender (optional)
  title: 'string', // Notification title
  message: 'string', // Notification content
  type: 'string', // e.g., 'announcement', 'grade', 'message'
  relatedTo: 'object', // Contains references to related entities (courseId, etc.)
  read: 'boolean', // Whether notification has been read
  createdAt: 'timestamp',
};

// Attendance schema (stored in attendance collection)
const attendanceSchema = {
  courseId: 'string', // Reference to course ID
  date: 'string', // Date of attendance in YYYY-MM-DD format
  studentRecords: 'map', // Map of studentId -> attendance status ('present', 'absent', 'late')
  facultyId: 'string', // Reference to faculty who recorded attendance
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

// Export all schemas
export default {
  userSchema,
  facultySchema,
  studentSchema,
  parentSchema,
  courseSchema,
  enrollmentSchema,
  marksSchema,
  notificationSchema,
  attendanceSchema,
};
