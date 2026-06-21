/**
 * Integration tests for student self-service routes (GET /me/courses, /me/grades, /me/attendance).
 *
 * Uses supertest with a minimal Express app, mongodb-memory-server for DB,
 * and mocks authTokenService for authentication.
 * Includes property test for response envelope consistency.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { type Express } from 'express';
import request from 'supertest';
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

// Mock authTokenService for authentication control
const mockValidateAccessToken = jest.fn<() => Promise<{ userId: string; role: string; iat: number; exp: number }>>();
jest.unstable_mockModule('../../services/authTokenService.js', () => ({
  authTokenService: {
    validateAccessToken: mockValidateAccessToken,
  },
}));

// Dynamic imports after mocks
const { authMiddleware } = await import('../../middleware/authMiddleware.js');
const { globalErrorHandler } = await import('../../middleware/errorHandler.js');
const { default: studentMeRoutes } = await import('../studentMeRoutes.js');

// Import models to register schemas
import Enrollment from '../../models/Enrollment.js';
import Mark from '../../models/Mark.js';
import Attendance from '../../models/Attendance.js';
import Student from '../../models/Student.js';
import Course from '../../models/Course.js';
import Faculty from '../../models/Faculty.js';

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;
let app: Express;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/students', studentMeRoutes);
  testApp.use(globalErrorHandler);
  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createTestApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  jest.clearAllMocks();
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authenticateAs(userId: string, role: string) {
  mockValidateAccessToken.mockResolvedValue({
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  });
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
    title: `Course ${Date.now()}`,
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
// Tests
// ---------------------------------------------------------------------------

describe('Student Me Routes', () => {
  describe('Auth middleware — unauthenticated requests', () => {
    it('should reject requests without Authorization header with 401', async () => {
      const res = await request(app).get('/api/students/me/courses');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject requests with invalid token with 401', async () => {
      mockValidateAccessToken.mockRejectedValue(new Error('Invalid access token'));

      const res = await request(app)
        .get('/api/students/me/courses')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('RBAC — non-student roles', () => {
    it('should reject parent role with 403', async () => {
      authenticateAs('parent-1', 'parent');

      const res = await request(app)
        .get('/api/students/me/courses')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject teacher role with 403', async () => {
      authenticateAs('teacher-1', 'teacher');

      const res = await request(app)
        .get('/api/students/me/grades')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Successful retrieval', () => {
    it('should return courses with proper envelope shape', async () => {
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      authenticateAs((student._id as mongoose.Types.ObjectId).toString(), 'student');

      const res = await request(app)
        .get('/api/students/me/courses')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].course.name).toBe(course.title);
    });

    it('should return grades with proper envelope shape', async () => {
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      await Mark.create({
        enrollment: enrollment._id,
        title: 'Midterm',
        type: 'exam',
        score: 88,
        maxScore: 100,
      });

      authenticateAs((student._id as mongoose.Types.ObjectId).toString(), 'student');

      const res = await request(app)
        .get('/api/students/me/grades')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].marks).toHaveLength(1);
    });

    it('should return attendance with proper envelope shape', async () => {
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-03-10'),
        status: 'present',
      });

      authenticateAs((student._id as mongoose.Types.ObjectId).toString(), 'student');

      const res = await request(app)
        .get('/api/students/me/attendance')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Property-Based Tests
  // -------------------------------------------------------------------------

  describe('Property: Response envelope consistency', () => {
    it('should always return { success: true, data } shape for successful requests', async () => {
      const student = await createStudent();
      const studentId = (student._id as mongoose.Types.ObjectId).toString();

      const endpoints = [
        '/api/students/me/courses',
        '/api/students/me/grades',
        '/api/students/me/attendance',
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...endpoints),
          async (endpoint) => {
            authenticateAs(studentId, 'student');

            const res = await request(app)
              .get(endpoint)
              .set('Authorization', 'Bearer valid-token');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
