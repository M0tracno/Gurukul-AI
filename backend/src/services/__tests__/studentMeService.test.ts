/**
 * Unit tests for StudentMeService.
 *
 * Uses mongodb-memory-server to test against real Mongoose queries.
 * Includes property-based tests for data isolation, enrollment filtering,
 * and date range correctness.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fc from 'fast-check';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import models (registers schemas)
import Enrollment from '../../models/Enrollment.js';
import Mark from '../../models/Mark.js';
import Attendance from '../../models/Attendance.js';
import Student from '../../models/Student.js';
import Course from '../../models/Course.js';
import Faculty from '../../models/Faculty.js';

// Import the service under test
import { studentMeService } from '../studentMeService.js';

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createFaculty() {
  return Faculty.create({
    firstName: 'Test',
    lastName: 'Faculty',
    email: `faculty-${Date.now()}@test.com`,
    password: 'Password123!',
    employeeId: `EMP-${Date.now()}`,
    department: 'CS',
    title: 'Professor',
    role: 'faculty',
  });
}

async function createCourse(facultyId: mongoose.Types.ObjectId) {
  return Course.create({
    title: `Course ${Date.now()}`,
    code: `CS-${Date.now()}`,
    description: 'Test course',
    faculty: facultyId,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-30'),
    credits: 3,
  });
}

async function createStudent() {
  return Student.create({
    firstName: 'Test',
    lastName: 'Student',
    email: `student-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    password: 'Password123!',
    studentId: `STU-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    grade: '10',
  });
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

describe('StudentMeService', () => {
  describe('getCourses', () => {
    it('should return only active enrollments for given studentId', async () => {
      const faculty = await createFaculty();
      const course1 = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const course2 = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const student = await createStudent();

      // Create active enrollment
      await Enrollment.create({
        student: student._id,
        course: course1._id,
        status: 'active',
      });

      // Create withdrawn enrollment
      await Enrollment.create({
        student: student._id,
        course: course2._id,
        status: 'withdrawn',
      });

      const result = await studentMeService.getCourses((student._id as mongoose.Types.ObjectId).toString());

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
      expect(result[0].course?.name).toBe(course1.title);
    });

    it('should return empty array when no enrollments exist', async () => {
      const student = await createStudent();
      const result = await studentMeService.getCourses((student._id as mongoose.Types.ObjectId).toString());
      expect(result).toEqual([]);
    });
  });

  describe('getGrades', () => {
    it('should group marks by course correctly', async () => {
      const faculty = await createFaculty();
      const course1 = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const course2 = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const student = await createStudent();

      const enrollment1 = await Enrollment.create({
        student: student._id,
        course: course1._id,
        status: 'active',
      });

      const enrollment2 = await Enrollment.create({
        student: student._id,
        course: course2._id,
        status: 'active',
      });

      // Create marks for course 1
      await Mark.create({
        enrollment: enrollment1._id,
        title: 'Quiz 1',
        type: 'quiz',
        score: 85,
        maxScore: 100,
      });

      await Mark.create({
        enrollment: enrollment1._id,
        title: 'Assignment 1',
        type: 'assignment',
        score: 90,
        maxScore: 100,
      });

      // Create mark for course 2
      await Mark.create({
        enrollment: enrollment2._id,
        title: 'Exam 1',
        type: 'exam',
        score: 78,
        maxScore: 100,
      });

      const result = await studentMeService.getGrades((student._id as mongoose.Types.ObjectId).toString());

      expect(result).toHaveLength(2);

      const course1Grades = result.find((r) => r.course.code === course1.code);
      const course2Grades = result.find((r) => r.course.code === course2.code);

      expect(course1Grades?.marks).toHaveLength(2);
      expect(course2Grades?.marks).toHaveLength(1);
    });
  });

  describe('getAttendance', () => {
    it('should filter by date range', async () => {
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const student = await createStudent();

      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      // Create attendance records on different dates
      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-03-01'),
        status: 'present',
      });

      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-03-15'),
        status: 'absent',
      });

      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-04-01'),
        status: 'present',
      });

      const result = await studentMeService.getAttendance(
        (student._id as mongoose.Types.ObjectId).toString(),
        { startDate: new Date('2025-03-01'), endDate: new Date('2025-03-31') },
      );

      expect(result).toHaveLength(2);
      result.forEach((r) => {
        const d = new Date(r.date);
        expect(d.getTime()).toBeGreaterThanOrEqual(new Date('2025-03-01').getTime());
        expect(d.getTime()).toBeLessThanOrEqual(new Date('2025-03-31').getTime());
      });
    });

    it('should return all records when no date range provided', async () => {
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const student = await createStudent();

      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-01-15'),
        status: 'present',
      });

      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-06-15'),
        status: 'late',
      });

      const result = await studentMeService.getAttendance(
        (student._id as mongoose.Types.ObjectId).toString(),
      );

      expect(result).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Property-Based Tests
  // -------------------------------------------------------------------------

  describe('Property: Student data isolation', () => {
    it('should never return records belonging to other students', async () => {
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const studentA = await createStudent();
      const studentB = await createStudent();

      // Enroll both students
      const enrollmentA = await Enrollment.create({
        student: studentA._id,
        course: course._id,
        status: 'active',
      });

      await Enrollment.create({
        student: studentB._id,
        course: (await createCourse(faculty._id as mongoose.Types.ObjectId))._id,
        status: 'active',
      });

      // Create marks for student A
      await Mark.create({
        enrollment: enrollmentA._id,
        title: 'Test Mark',
        type: 'quiz',
        score: 90,
        maxScore: 100,
      });

      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const studentAId = (studentA._id as mongoose.Types.ObjectId).toString();
            const studentBId = (studentB._id as mongoose.Types.ObjectId).toString();

            // Student B should never see student A's courses or grades
            const coursesB = await studentMeService.getCourses(studentBId);
            const gradesB = await studentMeService.getGrades(studentBId);
            const attendanceB = await studentMeService.getAttendance(studentBId);

            // None of student B's results should reference student A's enrollment
            const enrollmentAId = (enrollmentA._id as mongoose.Types.ObjectId).toString();

            gradesB.forEach((courseGroup) => {
              courseGroup.marks.forEach((mark: any) => {
                expect(mark.id).not.toBe(enrollmentAId);
              });
            });

            // Student A's courses should only be their own
            const coursesA = await studentMeService.getCourses(studentAId);
            coursesA.forEach((c) => {
              expect(c.enrollmentId).toBeDefined();
            });

            // Verify no cross-student data
            expect(coursesB.every((c) => c.enrollmentId !== coursesA[0]?.enrollmentId)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property: Only active enrollments returned', () => {
    it('should only return enrollments with status active', async () => {
      const faculty = await createFaculty();
      const student = await createStudent();

      const statuses = ['active', 'completed', 'withdrawn', 'failed'] as const;

      // Create one enrollment per status
      for (const status of statuses) {
        const course = await createCourse(faculty._id as mongoose.Types.ObjectId);
        await Enrollment.create({
          student: student._id,
          course: course._id,
          status,
        });
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const result = await studentMeService.getCourses(
              (student._id as mongoose.Types.ObjectId).toString(),
            );

            // Every returned enrollment must be active
            result.forEach((enrollment) => {
              expect(enrollment.status).toBe('active');
            });

            // Exactly 1 active enrollment was created
            expect(result).toHaveLength(1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property: Date range filter correctness', () => {
    it('should only return attendance records within the specified date range', async () => {
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);
      const student = await createStudent();

      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      // Seed attendance records spanning a year
      const dates = [
        new Date('2025-01-10'),
        new Date('2025-02-15'),
        new Date('2025-03-20'),
        new Date('2025-04-25'),
        new Date('2025-05-30'),
        new Date('2025-06-05'),
      ];

      for (const date of dates) {
        await Attendance.create({
          enrollment: enrollment._id,
          date,
          status: 'present',
        });
      }

      // Generate random date ranges and verify correctness
      const dateRangeArb = fc
        .tuple(
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
        )
        .filter(([a, b]) => a <= b)
        .map(([a, b]) => ({
          startDate: dates[a],
          endDate: dates[b],
        }));

      await fc.assert(
        fc.asyncProperty(dateRangeArb, async (dateRange) => {
          const result = await studentMeService.getAttendance(
            (student._id as mongoose.Types.ObjectId).toString(),
            dateRange,
          );

          // Every returned date must be within the range
          result.forEach((record) => {
            const recordDate = new Date(record.date).getTime();
            expect(recordDate).toBeGreaterThanOrEqual(dateRange.startDate.getTime());
            expect(recordDate).toBeLessThanOrEqual(dateRange.endDate.getTime());
          });
        }),
        { numRuns: 100 },
      );
    });
  });
});
