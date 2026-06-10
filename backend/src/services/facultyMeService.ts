import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * A weekday name as stored on a course's schedule (see {@link IScheduleItem}).
 */
export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

/**
 * Outward-facing faculty profile shape, sourced entirely from the authoritative
 * `Faculty` record (Req 3.1). Credential/setup-token material is never included.
 */
export interface FacultyProfileDTO {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  title: string;
  phone?: string;
  bio?: string;
  active: boolean;
}

/**
 * Outward-facing course shape for a faculty member's own courses.
 */
export interface CourseDTO {
  id: string;
  title: string;
  code: string;
  description: string;
  credits: number;
  maxStudents: number;
  startDate: Date;
  endDate: Date;
  schedule: ScheduleSlotDTO[];
  active: boolean;
}

/**
 * A summary of a student enrolled in one of the faculty member's own courses.
 * Display fields are joined from the authoritative `Student` record (Req 3.1).
 */
export interface StudentSummaryDTO {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  studentId: string;
  grade: string;
  active: boolean;
}

/**
 * A single schedule slot derived from a faculty member's own courses'
 * `schedule[]` entries, annotated with the owning course.
 */
export interface ScheduleSlotDTO {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  room?: string;
}

/**
 * Teacher self-scoped read service.
 *
 * Every method is scoped strictly by the authenticated `facultyId` (derived
 * from `req.user`, never a client-supplied identifier — Req 2.4) and resolves
 * data through references to the authoritative `Faculty`/`Course`/`Student`
 * records rather than copied identity fields (Req 3.1, 3.3).
 *
 * This service is HTTP-agnostic: it never references Request/Response objects.
 */
export class FacultyMeService {
  /**
   * Return the faculty member's own authoritative `Faculty` record (Req 3.1).
   * Throws 404 when no such record exists.
   */
  async getProfile(facultyId: string): Promise<FacultyProfileDTO> {
    const faculty = await Faculty.findById(facultyId).lean();
    if (!faculty) {
      throw AppError.notFound(`Faculty with id ${facultyId} not found`);
    }

    return {
      id: String(faculty._id),
      firstName: faculty.firstName,
      lastName: faculty.lastName,
      fullName: `${faculty.firstName} ${faculty.lastName}`,
      email: faculty.email,
      employeeId: faculty.employeeId,
      department: faculty.department,
      title: faculty.title,
      phone: faculty.phone,
      bio: faculty.bio,
      active: faculty.active ?? true,
    };
  }

  /**
   * Return the courses owned by this faculty member: `Course.faculty ===
   * facultyId` and not soft-deleted (`deletedAt` null). Scoped strictly by the
   * authenticated faculty id (Req 2.4).
   */
  async getCourses(facultyId: string): Promise<CourseDTO[]> {
    const courses = await Course.find({
      faculty: facultyId,
      deletedAt: null,
    })
      .sort({ startDate: -1 })
      .lean();

    return courses.map((course: any) => this.toCourseDTO(course));
  }

  /**
   * Return the distinct students enrolled in this faculty member's own courses.
   *
   * Students are resolved through `Enrollment.course ∈ {own courses}`
   * references (Req 3.3) rather than copied identity fields, then joined to the
   * authoritative `Student` record for display fields (Req 3.1). Reference
   * resolution does not filter on `active`, so a historical enrollment whose
   * student is now inactive still resolves and returns that record's data
   * (Req 3.4).
   */
  async getStudents(facultyId: string): Promise<StudentSummaryDTO[]> {
    // Resolve the faculty member's own (non-deleted) course ids.
    const courses = await Course.find({
      faculty: facultyId,
      deletedAt: null,
    })
      .select('_id')
      .lean();

    if (courses.length === 0) {
      return [];
    }

    const courseIds = courses.map((c: any) => c._id);

    // Resolve enrolled students via Enrollment.course references (Req 3.3).
    const studentIds = await Enrollment.distinct('student', {
      course: { $in: courseIds },
    });

    if (studentIds.length === 0) {
      return [];
    }

    // Join to the authoritative Student record for display fields (Req 3.1).
    // No `active` filter here: references resolve regardless of active (Req 3.4).
    const students = await Student.find({
      _id: { $in: studentIds },
      deletedAt: null,
    })
      .select('firstName lastName studentId grade active')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    return students.map((s: any) => ({
      id: String(s._id),
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      studentId: s.studentId,
      grade: s.grade,
      active: s.active ?? true,
    }));
  }

  /**
   * Return the schedule slots drawn from this faculty member's own courses'
   * `schedule[]` arrays, optionally filtered to a single weekday. Scoped
   * strictly by the authenticated faculty id (Req 2.4).
   */
  async getSchedule(facultyId: string, day?: Weekday): Promise<ScheduleSlotDTO[]> {
    const courses = await Course.find({
      faculty: facultyId,
      deletedAt: null,
    })
      .select('title code schedule')
      .lean();

    const slots: ScheduleSlotDTO[] = [];
    for (const course of courses as any[]) {
      const schedule: any[] = Array.isArray(course.schedule) ? course.schedule : [];
      for (const slot of schedule) {
        if (day && slot.day !== day) {
          continue;
        }
        slots.push({
          courseId: String(course._id),
          courseTitle: course.title,
          courseCode: course.code,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
        });
      }
    }

    return slots;
  }

  /**
   * Map a persisted Course document to the outward-facing {@link CourseDTO}.
   */
  private toCourseDTO(course: any): CourseDTO {
    const schedule: any[] = Array.isArray(course.schedule) ? course.schedule : [];
    return {
      id: String(course._id),
      title: course.title,
      code: course.code,
      description: course.description,
      credits: course.credits,
      maxStudents: course.maxStudents,
      startDate: course.startDate,
      endDate: course.endDate,
      schedule: schedule.map((slot) => ({
        courseId: String(course._id),
        courseTitle: course.title,
        courseCode: course.code,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
      })),
      active: course.active ?? true,
    };
  }
}

export const facultyMeService = new FacultyMeService();
