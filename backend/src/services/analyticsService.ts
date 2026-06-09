import { Types } from 'mongoose';

import Mark from '../models/Mark.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { AppError } from '../middleware/errorHandler.js';
import { authorizationService } from './authorizationService.js';
import type { UserRole } from '../types/common.js';
import { logger } from '../utils/logger.js';

// ─── DTOs / Result Types ────────────────────────────────────────────────────────

export interface TrendMetric {
  period: string;
  average: number;
}

export interface StudentTrendResult {
  studentId: string;
  metrics: TrendMetric[];
  computedAt: Date;
}

export interface CourseAnalyticsResult {
  courseId: string;
  teacherId: string;
  studentCount: number;
  averageScore: number;
  metrics: TrendMetric[];
  computedAt: Date;
}

export interface PredictiveInsightResult {
  studentId: string;
  indicator: 'improving' | 'steady' | 'at_risk';
  confidence: number;
  computedAt: Date;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/**
 * Minimum number of graded marks required to compute meaningful analytics.
 * Below this threshold the data is considered insufficient.
 */
const MIN_GRADED_DATA_POINTS = 3;

// ─── Service ────────────────────────────────────────────────────────────────────

export class AnalyticsService {
  /**
   * Compute performance trend metrics for a student when sufficient graded
   * data exists (Requirement 15.1).
   *
   * Aggregates marks across all the student's enrollments, grouping by month
   * to produce per-period average percentages. Returns null if insufficient
   * data.
   *
   * Access is restricted to authorized teachers, the student themselves, and
   * linked parents (Requirement 15.4).
   */
  async computeStudentTrend(
    studentId: string,
    requestorId: string,
    requestorRole: UserRole,
  ): Promise<StudentTrendResult | null> {
    // Enforce access control (Requirement 15.4)
    await this.assertAnalyticsAccess(studentId, requestorId, requestorRole);

    // Find all active/completed enrollments for this student
    const enrollments = await Enrollment.find({
      student: new Types.ObjectId(studentId),
      status: { $in: ['active', 'completed'] },
    })
      .select('_id')
      .lean()
      .exec();

    if (enrollments.length === 0) {
      return null;
    }

    const enrollmentIds = enrollments.map((e) => e._id);

    // Retrieve all marks for those enrollments
    const marks = await Mark.find({
      enrollment: { $in: enrollmentIds },
      maxScore: { $gt: 0 },
    })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    // Check if we have enough data points
    if (marks.length < MIN_GRADED_DATA_POINTS) {
      return null;
    }

    // Group marks by month (YYYY-MM) and compute average percentage per period
    const periodMap = new Map<string, { totalPct: number; count: number }>();
    for (const mark of marks) {
      const date = mark.createdAt ?? new Date();
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const pct = (mark.score / mark.maxScore) * 100;

      const entry = periodMap.get(period) ?? { totalPct: 0, count: 0 };
      entry.totalPct += pct;
      entry.count += 1;
      periodMap.set(period, entry);
    }

    const metrics: TrendMetric[] = [];
    for (const [period, { totalPct, count }] of periodMap.entries()) {
      metrics.push({
        period,
        average: Math.round((totalPct / count) * 100) / 100,
      });
    }

    // Sort metrics chronologically
    metrics.sort((a, b) => a.period.localeCompare(b.period));

    const result: StudentTrendResult = {
      studentId,
      metrics,
      computedAt: new Date(),
    };

    logger.info('Computed student trend', {
      studentId,
      periodCount: metrics.length,
      markCount: marks.length,
    });

    return result;
  }

  /**
   * Aggregate performance analytics across a teacher's enrolled students
   * for a specific course (Requirement 15.2).
   *
   * Returns the overall average score and per-month trend metrics computed
   * from all marks belonging to students enrolled in that course.
   *
   * Access is restricted to the course's assigned teacher and admins.
   */
  async courseAnalytics(
    courseId: string,
    teacherId: string,
    requestorId: string,
    requestorRole: UserRole,
  ): Promise<CourseAnalyticsResult> {
    // Verify the teacher owns this course (or requestor is admin)
    await authorizationService.assertTeacherCourseAccess(
      teacherId,
      courseId,
      requestorRole,
    );

    // Verify the requestor is the teacher themselves or an admin
    if (!authorizationService.isAdmin(requestorRole) && requestorId !== teacherId) {
      throw AppError.forbidden(
        'Only the assigned teacher or an admin can view course analytics',
      );
    }

    // Ensure the course exists
    const course = await Course.findById(courseId).lean().exec();
    if (!course) {
      throw AppError.notFound(`Course with id '${courseId}' not found`);
    }

    // Find all enrollments for this course
    const enrollments = await Enrollment.find({
      course: new Types.ObjectId(courseId),
      status: { $in: ['active', 'completed'] },
    })
      .select('_id student')
      .lean()
      .exec();

    const enrollmentIds = enrollments.map((e) => e._id);
    const studentCount = new Set(
      enrollments.map((e) => e.student.toString()),
    ).size;

    // Retrieve all marks for those enrollments
    const marks = await Mark.find({
      enrollment: { $in: enrollmentIds },
      maxScore: { $gt: 0 },
    })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    // Compute overall average score percentage
    let totalPct = 0;
    const periodMap = new Map<string, { totalPct: number; count: number }>();

    for (const mark of marks) {
      const pct = (mark.score / mark.maxScore) * 100;
      totalPct += pct;

      const date = mark.createdAt ?? new Date();
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const entry = periodMap.get(period) ?? { totalPct: 0, count: 0 };
      entry.totalPct += pct;
      entry.count += 1;
      periodMap.set(period, entry);
    }

    const averageScore =
      marks.length > 0
        ? Math.round((totalPct / marks.length) * 100) / 100
        : 0;

    const metrics: TrendMetric[] = [];
    for (const [period, { totalPct: pTotal, count }] of periodMap.entries()) {
      metrics.push({
        period,
        average: Math.round((pTotal / count) * 100) / 100,
      });
    }

    metrics.sort((a, b) => a.period.localeCompare(b.period));

    const result: CourseAnalyticsResult = {
      courseId,
      teacherId,
      studentCount,
      averageScore,
      metrics,
      computedAt: new Date(),
    };

    logger.info('Computed course analytics', {
      courseId,
      teacherId,
      studentCount,
      markCount: marks.length,
    });

    return result;
  }

  /**
   * Produce a predictive performance indicator with a confidence value
   * for a student (Requirement 15.3).
   *
   * The indicator is one of:
   * - 'improving': scores are trending upward
   * - 'steady': scores are stable
   * - 'at_risk': scores are trending downward
   *
   * Confidence is a value in [0, 1] reflecting the amount of data available
   * and the strength of the detected trend.
   *
   * Access is restricted to authorized teachers, the student themselves, and
   * linked parents (Requirement 15.4).
   */
  async predictiveInsight(
    studentId: string,
    requestorId: string,
    requestorRole: UserRole,
  ): Promise<PredictiveInsightResult | null> {
    // Enforce access control (Requirement 15.4)
    await this.assertAnalyticsAccess(studentId, requestorId, requestorRole);

    // Find all active/completed enrollments for this student
    const enrollments = await Enrollment.find({
      student: new Types.ObjectId(studentId),
      status: { $in: ['active', 'completed'] },
    })
      .select('_id')
      .lean()
      .exec();

    if (enrollments.length === 0) {
      return null;
    }

    const enrollmentIds = enrollments.map((e) => e._id);

    // Retrieve all marks ordered by creation date
    const marks = await Mark.find({
      enrollment: { $in: enrollmentIds },
      maxScore: { $gt: 0 },
    })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    // Need sufficient data to produce a prediction
    if (marks.length < MIN_GRADED_DATA_POINTS) {
      return null;
    }

    // Compute percentage scores in chronological order
    const percentages = marks.map((m) => (m.score / m.maxScore) * 100);

    // Compute a simple linear trend (slope) using least-squares regression
    const { slope, rSquared } = this.linearRegression(percentages);

    // Determine indicator based on slope threshold
    const IMPROVING_THRESHOLD = 1.0; // > 1% per data point increase
    const DECLINING_THRESHOLD = -1.0; // < -1% per data point decrease

    let indicator: 'improving' | 'steady' | 'at_risk';
    if (slope > IMPROVING_THRESHOLD) {
      indicator = 'improving';
    } else if (slope < DECLINING_THRESHOLD) {
      indicator = 'at_risk';
    } else {
      indicator = 'steady';
    }

    // Confidence is based on:
    // 1. R-squared of the fit (how well the trend explains the data)
    // 2. Amount of data (more data = more confidence, capped at 1.0)
    const dataFactor = Math.min(marks.length / 10, 1.0);
    const confidence = Math.round(Math.min(rSquared * dataFactor, 1.0) * 100) / 100;

    // Clamp confidence to [0, 1]
    const clampedConfidence = Math.max(0, Math.min(1, confidence));

    const result: PredictiveInsightResult = {
      studentId,
      indicator,
      confidence: clampedConfidence,
      computedAt: new Date(),
    };

    logger.info('Computed predictive insight', {
      studentId,
      indicator,
      confidence: clampedConfidence,
      dataPoints: marks.length,
      slope: Math.round(slope * 100) / 100,
    });

    return result;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Assert that the requestor has access to a student's analytics data.
   *
   * Access rules (Requirement 15.4):
   * - Admin: unrestricted
   * - Student: own data only
   * - Teacher: only if the student is enrolled in one of their courses
   * - Parent: only if linked to the student
   */
  private async assertAnalyticsAccess(
    targetStudentId: string,
    requestorId: string,
    requestorRole: UserRole,
  ): Promise<void> {
    if (authorizationService.isAdmin(requestorRole)) {
      return;
    }

    switch (requestorRole) {
      case 'student':
        authorizationService.assertStudentOwnership(
          requestorId,
          targetStudentId,
          requestorRole,
        );
        break;

      case 'teacher':
      case 'faculty':
        await authorizationService.assertTeacherStudentAccess(
          requestorId,
          targetStudentId,
          requestorRole,
        );
        break;

      case 'parent':
        await authorizationService.assertParentAccess(
          requestorId,
          targetStudentId,
          requestorRole,
        );
        break;

      default:
        throw AppError.forbidden(
          'You do not have permission to access this student\'s analytics',
        );
    }
  }

  /**
   * Simple least-squares linear regression over an array of y-values
   * (indexed by position). Returns slope and R-squared.
   */
  private linearRegression(values: number[]): {
    slope: number;
    rSquared: number;
  } {
    const n = values.length;
    if (n === 0) {
      return { slope: 0, rSquared: 0 };
    }
    if (n === 1) {
      return { slope: 0, rSquared: 1 };
    }

    // x values are 0, 1, 2, ... n-1
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const meanY = sumY / n;
    const denominator = n * sumX2 - sumX * sumX;

    if (denominator === 0) {
      return { slope: 0, rSquared: 1 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Compute R-squared
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * i;
      ssRes += (values[i] - predicted) ** 2;
      ssTot += (values[i] - meanY) ** 2;
    }

    const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

    return { slope, rSquared };
  }
}

// Export a singleton instance for convenience
export const analyticsService = new AnalyticsService();
