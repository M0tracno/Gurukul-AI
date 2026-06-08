/**
 * Admin feature module types
 */

/** Admin profile information */
export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
}

/** Admin dashboard summary data */
export interface AdminDashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalCourses: number;
  activeEnrollments: number;
}

/** System configuration managed by admin */
export interface SystemConfig {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}
