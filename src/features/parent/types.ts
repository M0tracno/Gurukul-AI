/**
 * Parent feature module types
 */

/** Parent profile information */
export interface ParentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  wards: ParentWard[];
}

/** Parent's ward (student) reference */
export interface ParentWard {
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  semester: number;
}

/** Parent dashboard summary data */
export interface ParentDashboardData {
  totalWards: number;
  wardsSummary: WardSummary[];
}

/** Summary data for a single ward */
export interface WardSummary {
  studentId: string;
  studentName: string;
  attendancePercentage: number;
  totalCourses: number;
  averageGrade: string;
}
