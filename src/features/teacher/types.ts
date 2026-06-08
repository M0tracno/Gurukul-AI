/**
 * Teacher feature module types
 */

/** Teacher profile information */
export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  subjects: string[];
}

/** Teacher dashboard summary data */
export interface TeacherDashboardData {
  totalStudents: number;
  totalCourses: number;
  pendingAssignments: number;
  upcomingClasses: number;
}

/** Teacher course assignment */
export interface TeacherCourseAssignment {
  courseId: string;
  courseName: string;
  semester: string;
  enrolledStudents: number;
}
