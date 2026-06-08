/**
 * Student feature module types
 */

/** Student profile information */
export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  enrollmentNumber: string;
  semester: number;
  department: string;
}

/** Student dashboard summary data */
export interface StudentDashboardData {
  totalCourses: number;
  attendancePercentage: number;
  upcomingExams: number;
  pendingAssignments: number;
}

/** Student enrollment record */
export interface StudentEnrollment {
  courseId: string;
  courseName: string;
  teacherName: string;
  semester: string;
  status: 'active' | 'completed' | 'dropped';
}
