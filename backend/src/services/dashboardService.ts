import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Parent from '../models/Parent.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import AuditLog from '../models/AuditLog.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/common.js';
import { studentMeService } from './studentMeService.js';
import { parentMeService } from './parentMeService.js';
import { facultyMeService } from './facultyMeService.js';
import type {
  FacultyProfileDTO,
  ScheduleSlotDTO,
  Weekday,
} from './facultyMeService.js';
import { authorizationService } from './authorizationService.js';

/**
 * Per-role dashboard summary service.
 *
 * Assembles a compact, role-scoped summary for each dashboard from
 * AUTHORITATIVE records and their references only — never from hardcoded,
 * mocked, or duplicated data (Req 3.1, 3.2, 3.3). Every method is scoped
 * strictly by the id passed in by the controller, which sources it from
 * `req.user` (never a client-supplied identifier — Req 2.1, 2.5). Parent
 * summaries are gated on an active `ParentStudentRelation` via
 * `AuthorizationService.assertParentAccess` (Req 2.6).
 *
 * This service is HTTP-agnostic: it never references Request/Response objects
 * and delegates self-scoped reads to the existing `studentMeService`,
 * `parentMeService`, and `facultyMeService`.
 */

/** A single recent grade entry surfaced on the student dashboard. */
export interface RecentGradeDTO {
  id: string;
  title: string;
  type: string;
  score: number;
  maxScore: number;
  percentage: number;
  course: { id: string; name: string; code: string } | null;
  date: Date | null;
}

/** Profile slice for the student dashboard, from the authoritative Student. */
export interface StudentDashboardProfileDTO {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  studentId: string;
  grade: string;
  active: boolean;
}

/** Student dashboard summary payload. */
export interface StudentDashboardDTO {
  profile: StudentDashboardProfileDTO;
  activeCourseCount: number;
  recentGrades: RecentGradeDTO[];
  /** Percentage (0–100) of attendance sessions not marked `absent`. */
  attendanceRate: number;
}

/** Faculty dashboard summary payload (reuses facultyMeService DTOs). */
export interface FacultyDashboardDTO {
  profile: FacultyProfileDTO;
  ownedCourseCount: number;
  totalStudents: number;
  todaysSchedule: ScheduleSlotDTO[];
}

/** Per-child summary surfaced on the parent dashboard. */
export interface ChildSummaryDTO {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  studentId: string;
  grade: string;
  active: boolean;
  activeCourseCount: number;
  attendanceRate: number;
}

/** Parent dashboard summary payload. */
export interface ParentDashboardDTO {
  children: ChildSummaryDTO[];
}

/** A recent audit highlight surfaced on the admin dashboard. */
export interface AuditHighlightDTO {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  actorRole: string;
  timestamp: Date;
}

/** Admin dashboard summary payload. */
export interface AdminDashboardDTO {
  totals: {
    students: number;
    faculty: number;
    parents: number;
    courses: number;
  };
  recentAudit: AuditHighlightDTO[];
}

/** Number of recent grades surfaced on the student dashboard. */
const RECENT_GRADES_LIMIT = 5;
/** Number of recent audit highlights surfaced on the admin dashboard. */
const RECENT_AUDIT_LIMIT = 10;

/** Statuses counted as "attended" when computing an attendance rate. */
const ATTENDED_STATUSES = new Set(['present', 'late', 'excused']);

/** JS `Date.getDay()` (0=Sunday) → schedule weekday name. */
const WEEKDAY_NAMES: Weekday[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export class DashboardService {
  /**
   * Assemble the student dashboard summary for the authenticated student.
   *
   * Profile fields come from the authoritative `Student` record (Req 3.1);
   * the active course count, recent grades, and attendance rate are derived
   * from the student's own `Enrollment`/`Mark`/`Attendance` records resolved
   * through references (Req 3.3). Throws 404 when the student does not exist.
   */
  async getStudentDashboard(studentId: string): Promise<StudentDashboardDTO> {
    const student = await Student.findById(studentId).lean();
    if (!student) {
      throw AppError.notFound(`Student with id ${studentId} not found`);
    }

    const [activeCourseCount, gradeGroups, attendanceRecords] =
      await Promise.all([
        Enrollment.countDocuments({ student: studentId, status: 'active' }),
        studentMeService.getGrades(studentId),
        studentMeService.getAttendance(studentId),
      ]);

    return {
      profile: {
        id: String((student as any)._id),
        firstName: (student as any).firstName,
        lastName: (student as any).lastName,
        fullName: `${(student as any).firstName} ${(student as any).lastName}`,
        studentId: (student as any).studentId,
        grade: (student as any).grade,
        active: (student as any).active ?? true,
      },
      activeCourseCount,
      recentGrades: this.toRecentGrades(gradeGroups),
      attendanceRate: this.computeAttendanceRate(attendanceRecords),
    };
  }

  /**
   * Assemble the faculty dashboard summary for the authenticated faculty
   * member by reusing `facultyMeService` (Req 2.4, 3.1, 3.3).
   *
   * Returns the authoritative profile, the count of owned (non-deleted)
   * courses, the distinct enrolled-student count, and today's schedule slots.
   */
  async getFacultyDashboard(facultyId: string): Promise<FacultyDashboardDTO> {
    const today = WEEKDAY_NAMES[new Date().getDay()];

    const [profile, courses, students, todaysSchedule] = await Promise.all([
      facultyMeService.getProfile(facultyId),
      facultyMeService.getCourses(facultyId),
      facultyMeService.getStudents(facultyId),
      facultyMeService.getSchedule(facultyId, today),
    ]);

    return {
      profile,
      ownedCourseCount: courses.length,
      totalStudents: students.length,
      todaysSchedule,
    };
  }

  /**
   * Assemble the parent dashboard summary for the authenticated parent.
   *
   * Children are resolved through active `ParentStudentRelation` linkages via
   * `parentMeService.getChildren` (Req 2.6). Each child's summary is gated by
   * `AuthorizationService.assertParentAccess` before any of that child's
   * records are read, so a deactivated linkage flips access to denied
   * (Req 2.6, 7.2). Per-child figures are derived from each child's own
   * records through references (Req 3.3).
   */
  async getParentDashboard(parentId: string): Promise<ParentDashboardDTO> {
    const children = await parentMeService.getChildren(parentId);

    const summaries = await Promise.all(
      children.map(async (child: any): Promise<ChildSummaryDTO> => {
        // Gate access on an active linkage (Req 2.6, 7.2); throws 403 if absent.
        await authorizationService.assertParentAccess(
          parentId,
          child.id,
          'parent' as UserRole,
        );

        const [activeCourseCount, attendanceRecords] = await Promise.all([
          Enrollment.countDocuments({ student: child.id, status: 'active' }),
          studentMeService.getAttendance(child.id),
        ]);

        return {
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          fullName: `${child.firstName} ${child.lastName}`,
          studentId: child.studentId,
          grade: child.grade,
          active: child.active ?? true,
          activeCourseCount,
          attendanceRate: this.computeAttendanceRate(attendanceRecords),
        };
      }),
    );

    return { children: summaries };
  }

  /**
   * Assemble the admin dashboard summary: aggregate counts over the
   * authoritative collections plus the most recent audit highlights
   * (Req 3.1). Counts exclude soft-deleted records.
   */
  async getAdminDashboard(): Promise<AdminDashboardDTO> {
    const [students, faculty, parents, courses, recent] = await Promise.all([
      Student.countDocuments({ deletedAt: null }),
      Faculty.countDocuments({ deletedAt: null }),
      Parent.countDocuments({ deletedAt: null }),
      Course.countDocuments({ deletedAt: null }),
      AuditLog.find().sort({ timestamp: -1 }).limit(RECENT_AUDIT_LIMIT).lean(),
    ]);

    return {
      totals: { students, faculty, parents, courses },
      recentAudit: (recent as any[]).map((entry) => ({
        id: String(entry._id),
        action: entry.action,
        resource: entry.target?.resource ?? '',
        resourceId: entry.target?.resourceId,
        actorRole: entry.actor?.role ?? '',
        timestamp: entry.timestamp,
      })),
    };
  }

  /**
   * Flatten the per-course grade groups from `studentMeService.getGrades`
   * into a single recent-first list, keeping the most recent entries.
   */
  private toRecentGrades(gradeGroups: any[]): RecentGradeDTO[] {
    const flattened: RecentGradeDTO[] = [];

    for (const group of gradeGroups) {
      const course = group.course
        ? {
            id: String(group.course.id),
            name: group.course.name,
            code: group.course.code,
          }
        : null;

      for (const mark of group.marks ?? []) {
        flattened.push({
          id: String(mark.id),
          title: mark.title,
          type: mark.type,
          score: mark.score,
          maxScore: mark.maxScore,
          percentage: mark.percentage,
          course,
          date: mark.submissionDate ?? mark.dueDate ?? null,
        });
      }
    }

    return flattened
      .sort((a, b) => {
        const at = a.date ? new Date(a.date).getTime() : 0;
        const bt = b.date ? new Date(b.date).getTime() : 0;
        return bt - at;
      })
      .slice(0, RECENT_GRADES_LIMIT);
  }

  /**
   * Compute the attendance rate as the percentage (0–100, rounded) of
   * attendance sessions whose status is not `absent`. Returns 0 when there
   * are no attendance records.
   */
  private computeAttendanceRate(records: any[]): number {
    if (!Array.isArray(records) || records.length === 0) {
      return 0;
    }

    const attended = records.filter((r) =>
      ATTENDED_STATUSES.has(r.status),
    ).length;

    return Math.round((attended / records.length) * 100);
  }
}

export const dashboardService = new DashboardService();
