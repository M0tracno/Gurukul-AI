/**
 * Property-Based Tests: Performance Analytics and Predictive Insights
 *
 * Feature: admin-portal-overhaul, Property 22: Predictive insight bounds
 * Feature: admin-portal-overhaul, Property 23: Analytics aggregation correctness
 *
 * Property 22: For any predictive insight, the confidence value SHALL satisfy
 * 0 <= confidence <= 1 and the indicator SHALL be one of 'improving', 'steady', 'at_risk'.
 * **Validates: Requirements 15.3**
 *
 * Property 23: For any Course dataset, the aggregated performance pattern presented to a
 * Teacher SHALL equal the aggregate computed over that Teacher's enrolled Students, and a
 * per-Student trend SHALL be produced whenever sufficient graded data exists.
 * **Validates: Requirements 15.1, 15.2**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { AnalyticsService } from './analyticsService.js';
import Mark from '../models/Mark.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let analyticsService: AnalyticsService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  analyticsService = new AnalyticsService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Mark.deleteMany({});
  await Enrollment.deleteMany({});
  await Course.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid score in [0, maxScore] given a maxScore. */
const scoreArb = (maxScore: number) =>
  fc.integer({ min: 0, max: maxScore });

/** Generates a valid maxScore > 0 for a mark. */
const maxScoreArb = fc.integer({ min: 1, max: 100 });

/** Generates a Date within a 12-month window for realistic period grouping. */
const dateInYearArb = fc.integer({ min: 0, max: 11 }).map((monthOffset) => {
  const d = new Date(2024, monthOffset, 15);
  return d;
});

/** Generates a list of mark data points (score, maxScore, createdAt). */
const markDataArb = fc.array(
  fc.tuple(maxScoreArb, dateInYearArb).chain(([maxScore, date]) =>
    scoreArb(maxScore).map((score) => ({ score, maxScore, createdAt: date })),
  ),
  { minLength: 3, maxLength: 20 },
);

/** Generates the number of students to enroll in a course. */
const studentCountArb = fc.integer({ min: 1, max: 5 });

/** Generates marks per student (at least 3 for sufficient data). */
const marksPerStudentArb = fc.integer({ min: 3, max: 10 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seeds a student with enrollment and marks in the in-memory DB.
 * Returns the studentId and enrollmentId.
 */
async function seedStudentWithMarks(
  courseId: Types.ObjectId,
  marks: Array<{ score: number; maxScore: number; createdAt: Date }>,
): Promise<{ studentId: Types.ObjectId; enrollmentId: Types.ObjectId }> {
  const studentId = new Types.ObjectId();

  const enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
    status: 'active',
    enrollmentDate: new Date(2024, 0, 1),
  });

  for (const markData of marks) {
    await Mark.create({
      enrollment: enrollment._id,
      title: `Test Assessment`,
      type: 'assignment',
      score: markData.score,
      maxScore: markData.maxScore,
      weight: 1,
      createdAt: markData.createdAt,
      updatedAt: markData.createdAt,
    });
  }

  return { studentId, enrollmentId: enrollment._id as Types.ObjectId };
}

/**
 * Creates a course in the DB assigned to a teacher.
 */
async function seedCourse(teacherId: Types.ObjectId): Promise<Types.ObjectId> {
  const course = await Course.create({
    title: 'Test Course',
    code: `TC-${new Types.ObjectId().toHexString().slice(0, 8)}`,
    description: 'A test course for property testing',
    faculty: teacherId,
    startDate: new Date(2024, 0, 1),
    endDate: new Date(2024, 11, 31),
    credits: 3,
    maxStudents: 30,
    active: true,
  });

  return course._id as Types.ObjectId;
}

/**
 * Manually computes the expected average percentage from raw marks.
 */
function computeExpectedAverage(
  marks: Array<{ score: number; maxScore: number }>,
): number {
  if (marks.length === 0) return 0;
  const totalPct = marks.reduce(
    (sum, m) => sum + (m.score / m.maxScore) * 100,
    0,
  );
  return Math.round((totalPct / marks.length) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Property 22: Predictive insight bounds
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 22: Predictive insight bounds
describe('Property 22: Predictive insight bounds', () => {
  it('confidence SHALL satisfy 0 <= confidence <= 1 and indicator SHALL be one of improving, steady, at_risk', async () => {
    await fc.assert(
      fc.asyncProperty(markDataArb, async (marksData) => {
        // Clean state
        await Mark.deleteMany({});
        await Enrollment.deleteMany({});
        await Course.deleteMany({});

        const teacherId = new Types.ObjectId();
        const courseId = await seedCourse(teacherId);
        const { studentId } = await seedStudentWithMarks(courseId, marksData);

        // Call as admin to bypass access checks
        const result = await analyticsService.predictiveInsight(
          studentId.toHexString(),
          teacherId.toHexString(),
          'admin',
        );

        // With >= 3 marks, we should get a result
        expect(result).not.toBeNull();

        if (result) {
          // Confidence must be in [0, 1]
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);

          // Indicator must be one of the allowed values
          expect(['improving', 'steady', 'at_risk']).toContain(result.indicator);

          // StudentId must match
          expect(result.studentId).toBe(studentId.toHexString());

          // ComputedAt must be a Date
          expect(result.computedAt).toBeInstanceOf(Date);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('returns null when insufficient data exists (fewer than 3 marks)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2 }),
        maxScoreArb,
        async (markCount, maxScore) => {
          await Mark.deleteMany({});
          await Enrollment.deleteMany({});
          await Course.deleteMany({});

          const teacherId = new Types.ObjectId();
          const courseId = await seedCourse(teacherId);
          const studentId = new Types.ObjectId();

          await Enrollment.create({
            student: studentId,
            course: courseId,
            status: 'active',
            enrollmentDate: new Date(2024, 0, 1),
          });

          const enrollment = await Enrollment.findOne({ student: studentId });

          // Create fewer than 3 marks
          for (let i = 0; i < markCount; i++) {
            await Mark.create({
              enrollment: enrollment!._id,
              title: `Mark ${i}`,
              type: 'assignment',
              score: Math.floor(Math.random() * maxScore),
              maxScore,
              weight: 1,
              createdAt: new Date(2024, i, 15),
              updatedAt: new Date(2024, i, 15),
            });
          }

          const result = await analyticsService.predictiveInsight(
            studentId.toHexString(),
            teacherId.toHexString(),
            'admin',
          );

          // With insufficient data, result should be null
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: Analytics aggregation correctness
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 23: Analytics aggregation correctness
describe('Property 23: Analytics aggregation correctness', () => {
  it('aggregated course performance SHALL equal the aggregate computed over enrolled students', async () => {
    await fc.assert(
      fc.asyncProperty(
        studentCountArb,
        marksPerStudentArb,
        maxScoreArb,
        async (numStudents, marksPerStudent, baseMaxScore) => {
          // Clean state
          await Mark.deleteMany({});
          await Enrollment.deleteMany({});
          await Course.deleteMany({});

          const teacherId = new Types.ObjectId();
          const courseId = await seedCourse(teacherId);

          // Seed multiple students with marks
          const allMarks: Array<{ score: number; maxScore: number }> = [];

          for (let s = 0; s < numStudents; s++) {
            const marks: Array<{ score: number; maxScore: number; createdAt: Date }> = [];
            for (let m = 0; m < marksPerStudent; m++) {
              const maxScore = baseMaxScore;
              const score = Math.floor(Math.random() * (maxScore + 1));
              marks.push({
                score,
                maxScore,
                createdAt: new Date(2024, m % 12, 15),
              });
              allMarks.push({ score, maxScore });
            }
            await seedStudentWithMarks(courseId, marks);
          }

          // Call course analytics as admin
          const result = await analyticsService.courseAnalytics(
            courseId.toHexString(),
            teacherId.toHexString(),
            teacherId.toHexString(),
            'admin',
          );

          // The average score should match our manual computation
          const expectedAverage = computeExpectedAverage(allMarks);
          expect(result.averageScore).toBeCloseTo(expectedAverage, 1);

          // Student count should match
          expect(result.studentCount).toBe(numStudents);

          // CourseId and teacherId should match
          expect(result.courseId).toBe(courseId.toHexString());
          expect(result.teacherId).toBe(teacherId.toHexString());

          // computedAt should be a Date
          expect(result.computedAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('per-Student trend SHALL be produced when sufficient graded data exists', async () => {
    await fc.assert(
      fc.asyncProperty(markDataArb, async (marksData) => {
        // Clean state
        await Mark.deleteMany({});
        await Enrollment.deleteMany({});
        await Course.deleteMany({});

        const teacherId = new Types.ObjectId();
        const courseId = await seedCourse(teacherId);
        const { studentId } = await seedStudentWithMarks(courseId, marksData);

        // Call computeStudentTrend as admin
        const result = await analyticsService.computeStudentTrend(
          studentId.toHexString(),
          teacherId.toHexString(),
          'admin',
        );

        // With >= 3 marks, a trend should be produced
        expect(result).not.toBeNull();

        if (result) {
          // StudentId must match
          expect(result.studentId).toBe(studentId.toHexString());

          // Metrics should have at least one period
          expect(result.metrics.length).toBeGreaterThan(0);

          // Each metric should have a valid period format (YYYY-MM) and numeric average
          for (const metric of result.metrics) {
            expect(metric.period).toMatch(/^\d{4}-\d{2}$/);
            expect(typeof metric.average).toBe('number');
            expect(metric.average).toBeGreaterThanOrEqual(0);
            expect(metric.average).toBeLessThanOrEqual(100);
          }

          // Verify trend is computed from the actual marks
          // Group marks by period and verify averages match
          const periodMap = new Map<string, { totalPct: number; count: number }>();
          for (const mark of marksData) {
            const date = mark.createdAt;
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const pct = (mark.score / mark.maxScore) * 100;
            const entry = periodMap.get(period) ?? { totalPct: 0, count: 0 };
            entry.totalPct += pct;
            entry.count += 1;
            periodMap.set(period, entry);
          }

          // Verify each period's average matches the expected value
          for (const metric of result.metrics) {
            const expected = periodMap.get(metric.period);
            expect(expected).toBeDefined();
            if (expected) {
              const expectedAvg = Math.round((expected.totalPct / expected.count) * 100) / 100;
              expect(metric.average).toBeCloseTo(expectedAvg, 1);
            }
          }

          // computedAt must be a Date
          expect(result.computedAt).toBeInstanceOf(Date);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('returns null when student has no enrollments (insufficient data)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          await Mark.deleteMany({});
          await Enrollment.deleteMany({});
          await Course.deleteMany({});

          const studentId = new Types.ObjectId();

          const result = await analyticsService.computeStudentTrend(
            studentId.toHexString(),
            new Types.ObjectId().toHexString(),
            'admin',
          );

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
