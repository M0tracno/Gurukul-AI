/**
 * Unit tests for ParentMeService.
 *
 * Uses mongodb-memory-server to test against real Mongoose queries.
 * Includes property-based tests for parent access gate and empty result consistency.
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
import { parentMeService } from '../parentMeService.js';
import { AppError } from '../../middleware/errorHandler.js';

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

function getParentStudentRelationModel() {
  const schema = new mongoose.Schema(
    {
      parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
      isActive: { type: Boolean, default: true },
    },
    { collection: 'parent_student_relations' },
  );

  return (
    mongoose.models['ParentStudentRelation'] ??
    mongoose.model('ParentStudentRelation', schema)
  );
}

async function createFaculty() {
  return Faculty.create({
    firstName: 'Test',
    lastName: 'Faculty',
    email: `faculty-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    password: 'Password123!',
    employeeId: `EMP-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    department: 'CS',
    title: 'Professor',
    role: 'faculty',
  });
}

async function createCourse(facultyId: mongoose.Types.ObjectId) {
  return Course.create({
    title: `Course ${Date.now()}-${Math.random().toString(36).slice(2)}`,
    code: `CS-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe('ParentMeService', () => {
  describe('getChildren', () => {
    it('should return only students with active relations', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student1 = await createStudent();
      const student2 = await createStudent();

      // Active relation
      await ParentStudentRelation.create({
        parentId,
        studentId: student1._id,
        isActive: true,
      });

      // Inactive relation
      await ParentStudentRelation.create({
        parentId,
        studentId: student2._id,
        isActive: false,
      });

      const result = await parentMeService.getChildren(parentId.toString());

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe((student1._id as mongoose.Types.ObjectId).toString());
    });

    it('should return empty array when no active relations exist', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const result = await parentMeService.getChildren(parentId.toString());
      expect(result).toEqual([]);
    });
  });

  describe('getChildCourses', () => {
    it('should throw 403 when no active relation exists', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();

      // No relation created => 403
      await expect(
        parentMeService.getChildCourses(
          parentId.toString(),
          (student._id as mongoose.Types.ObjectId).toString(),
          'parent',
        ),
      ).rejects.toThrow(AppError);

      try {
        await parentMeService.getChildCourses(
          parentId.toString(),
          (student._id as mongoose.Types.ObjectId).toString(),
          'parent',
        );
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
      }
    });

    it('should throw 404 when child does not exist', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const nonExistentChildId = new mongoose.Types.ObjectId();

      // Create relation to non-existent student
      await ParentStudentRelation.create({
        parentId,
        studentId: nonExistentChildId,
        isActive: true,
      });

      await expect(
        parentMeService.getChildCourses(
          parentId.toString(),
          nonExistentChildId.toString(),
          'parent',
        ),
      ).rejects.toThrow(AppError);

      try {
        await parentMeService.getChildCourses(
          parentId.toString(),
          nonExistentChildId.toString(),
          'parent',
        );
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(404);
      }
    });
  });

  describe('getChildGrades', () => {
    it('should return marks grouped by course for linked child', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      // Link parent to student
      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      // Enroll student
      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      // Create marks
      await Mark.create({
        enrollment: enrollment._id,
        title: 'Quiz 1',
        type: 'quiz',
        score: 85,
        maxScore: 100,
      });

      await Mark.create({
        enrollment: enrollment._id,
        title: 'Assignment 1',
        type: 'assignment',
        score: 92,
        maxScore: 100,
      });

      const result = await parentMeService.getChildGrades(
        parentId.toString(),
        (student._id as mongoose.Types.ObjectId).toString(),
        'parent',
      );

      expect(result).toHaveLength(1);
      expect(result[0].course.code).toBe(course.code);
      expect(result[0].marks).toHaveLength(2);
    });
  });

  describe('getChildAttendance', () => {
    it('should apply date range filter correctly', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      // Link parent to student
      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      // Enroll student
      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      // Create attendance records
      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-03-01'),
        status: 'present',
      });

      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-04-15'),
        status: 'absent',
      });

      const result = await parentMeService.getChildAttendance(
        parentId.toString(),
        (student._id as mongoose.Types.ObjectId).toString(),
        'parent',
        { startDate: new Date('2025-03-01'), endDate: new Date('2025-03-31') },
      );

      expect(result).toHaveLength(1);
      expect(new Date(result[0].date).getTime()).toBe(new Date('2025-03-01').getTime());
    });
  });

  // -------------------------------------------------------------------------
  // Property-Based Tests
  // -------------------------------------------------------------------------

  describe('Property: Parent access gate — 403 for unlinked parent-child pairs', () => {
    it('should always throw 403 when parent has no active relation to child', async () => {
      const student = await createStudent();
      const studentId = (student._id as mongoose.Types.ObjectId).toString();

      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Generate a new parent ID each run — never linked
            const randomParentId = new mongoose.Types.ObjectId().toString();

            try {
              await parentMeService.getChildCourses(randomParentId, studentId, 'parent');
              // Should never reach here
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(AppError);
              expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
            }

            try {
              await parentMeService.getChildGrades(randomParentId, studentId, 'parent');
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(AppError);
              expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
            }

            try {
              await parentMeService.getChildAttendance(randomParentId, studentId, 'parent');
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeInstanceOf(AppError);
              expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property: Empty result consistency — empty array with no error for no data', () => {
    it('should return empty arrays without throwing when linked child has no data', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();

      // Link parent to student
      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const childId = (student._id as mongoose.Types.ObjectId).toString();

            // No enrollments → empty arrays, no errors
            const courses = await parentMeService.getChildCourses(
              parentId.toString(),
              childId,
              'parent',
            );
            expect(Array.isArray(courses)).toBe(true);
            expect(courses).toHaveLength(0);

            const grades = await parentMeService.getChildGrades(
              parentId.toString(),
              childId,
              'parent',
            );
            expect(Array.isArray(grades)).toBe(true);
            expect(grades).toHaveLength(0);

            const attendance = await parentMeService.getChildAttendance(
              parentId.toString(),
              childId,
              'parent',
            );
            expect(Array.isArray(attendance)).toBe(true);
            expect(attendance).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
