import Enrollment from '../models/Enrollment.js';
import Mark from '../models/Mark.js';
import Attendance from '../models/Attendance.js';

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service layer for student self-service endpoints.
 * Provides methods to fetch a student's own courses, grades, and attendance.
 */
class StudentMeService {
  /**
   * Get courses the student is actively enrolled in.
   * Returns enrollments populated with course details.
   */
  async getCourses(studentId: string) {
    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'active',
    })
      .populate('course', 'title code description faculty')
      .lean();

    return enrollments.map((e: any) => ({
      enrollmentId: e._id.toString(),
      course: e.course
        ? {
            id: e.course._id?.toString(),
            name: e.course.title,
            code: e.course.code,
            description: e.course.description,
            faculty: e.course.faculty?.toString(),
          }
        : null,
      enrollmentDate: e.enrollmentDate,
      status: e.status,
      grade: e.grade,
    }));
  }

  /**
   * Get all marks/grades for the student, grouped by course.
   */
  async getGrades(studentId: string) {
    // Step 1: Get active enrollments
    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'active',
    })
      .populate('course', 'title code')
      .lean();

    if (enrollments.length === 0) return [];

    const enrollmentIds = enrollments.map((e: any) => e._id);

    // Step 2: Get marks for those enrollments
    const marks = await Mark.find({
      enrollment: { $in: enrollmentIds },
    }).lean();

    // Step 3: Group marks by course
    const courseMap = new Map<string, { course: any; marks: any[] }>();

    for (const enrollment of enrollments as any[]) {
      const courseId = enrollment.course?._id?.toString();
      if (courseId && !courseMap.has(courseId)) {
        courseMap.set(courseId, {
          course: {
            id: courseId,
            name: enrollment.course.title,
            code: enrollment.course.code,
          },
          marks: [],
        });
      }
    }

    for (const mark of marks as any[]) {
      const enrollment = enrollments.find(
        (e: any) => e._id.toString() === mark.enrollment.toString(),
      ) as any;
      if (enrollment) {
        const courseId = enrollment.course?._id?.toString();
        if (courseId && courseMap.has(courseId)) {
          courseMap.get(courseId)!.marks.push({
            id: mark._id.toString(),
            title: mark.title,
            type: mark.type,
            score: mark.score,
            maxScore: mark.maxScore,
            percentage:
              mark.maxScore > 0
                ? Math.round((mark.score / mark.maxScore) * 100)
                : 0,
            dueDate: mark.dueDate,
            submissionDate: mark.submissionDate,
            feedback: mark.feedback,
          });
        }
      }
    }

    return Array.from(courseMap.values());
  }

  /**
   * Get attendance records for the student, optionally filtered by date range.
   */
  async getAttendance(studentId: string, dateRange?: DateRange) {
    // Get active enrollments
    const enrollments = await Enrollment.find({
      student: studentId,
      status: 'active',
    })
      .populate('course', 'title code')
      .lean();

    if (enrollments.length === 0) return [];

    const enrollmentIds = enrollments.map((e: any) => e._id);

    // Build query with optional date filter
    const query: Record<string, any> = {
      enrollment: { $in: enrollmentIds },
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      query.date = {};
      if (dateRange.startDate) query.date.$gte = dateRange.startDate;
      if (dateRange.endDate) query.date.$lte = dateRange.endDate;
    }

    const records = await Attendance.find(query).sort({ date: -1 }).lean();

    // Map to response format with course info
    return records.map((record: any) => {
      const enrollment = enrollments.find(
        (e: any) => e._id.toString() === record.enrollment.toString(),
      ) as any;
      return {
        id: record._id.toString(),
        course: enrollment?.course
          ? {
              id: enrollment.course._id?.toString(),
              name: enrollment.course.title,
              code: enrollment.course.code,
            }
          : null,
        date: record.date,
        status: record.status,
        notes: record.notes,
      };
    });
  }
}

export const studentMeService = new StudentMeService();
