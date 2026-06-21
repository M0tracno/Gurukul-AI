/**
 * Integration tests for parent self-service routes (GET /me/children, /me/children/:childId/*).
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
const { default: parentMeRoutes } = await import('../parentMeRoutes.js');

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
  testApp.use('/api/parents', parentMeRoutes);
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

describe('Parent Me Routes', () => {
  describe('Auth middleware — unauthenticated requests', () => {
    it('should reject requests without Authorization header with 401', async () => {
      const res = await request(app).get('/api/parents/me/children');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject requests with invalid token with 401', async () => {
      mockValidateAccessToken.mockRejectedValue(new Error('Invalid access token'));

      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('RBAC — non-parent roles', () => {
    it('should reject student role with 403', async () => {
      authenticateAs('student-1', 'student');

      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject teacher role with 403', async () => {
      authenticateAs('teacher-1', 'teacher');

      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Parent access gate — unlinked children', () => {
    it('should reject access to unlinked child with 403', async () => {
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();
      const childId = (student._id as mongoose.Types.ObjectId).toString();

      authenticateAs(parentId.toString(), 'parent');

      const res = await request(app)
        .get(`/api/parents/me/children/${childId}/courses`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('404 — non-existent child', () => {
    it('should return 404 when child does not exist', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const nonExistentChildId = new mongoose.Types.ObjectId();

      // Create relation to non-existent student
      await ParentStudentRelation.create({
        parentId,
        studentId: nonExistentChildId,
        isActive: true,
      });

      authenticateAs(parentId.toString(), 'parent');

      const res = await request(app)
        .get(`/api/parents/me/children/${nonExistentChildId.toString()}/courses`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Successful retrieval', () => {
    it('should return children list with proper envelope shape', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();

      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      authenticateAs(parentId.toString(), 'parent');

      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: expect.any(Array),
      });
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].firstName).toBe('Test');
    });

    it('should return child courses with proper envelope shape', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      authenticateAs(parentId.toString(), 'parent');
      const childId = (student._id as mongoose.Types.ObjectId).toString();

      const res = await request(app)
        .get(`/api/parents/me/children/${childId}/courses`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return child grades with proper envelope shape', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      await Mark.create({
        enrollment: enrollment._id,
        title: 'Final Exam',
        type: 'exam',
        score: 95,
        maxScore: 100,
      });

      authenticateAs(parentId.toString(), 'parent');
      const childId = (student._id as mongoose.Types.ObjectId).toString();

      const res = await request(app)
        .get(`/api/parents/me/children/${childId}/grades`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].marks).toHaveLength(1);
    });

    it('should return child attendance with proper envelope shape', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();
      const faculty = await createFaculty();
      const course = await createCourse(faculty._id as mongoose.Types.ObjectId);

      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      const enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        status: 'active',
      });

      await Attendance.create({
        enrollment: enrollment._id,
        date: new Date('2025-04-01'),
        status: 'present',
      });

      authenticateAs(parentId.toString(), 'parent');
      const childId = (student._id as mongoose.Types.ObjectId).toString();

      const res = await request(app)
        .get(`/api/parents/me/children/${childId}/attendance`)
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
    it('should always return { success: true, data } shape for successful parent requests', async () => {
      const ParentStudentRelation = getParentStudentRelationModel();
      const parentId = new mongoose.Types.ObjectId();
      const student = await createStudent();
      const childId = (student._id as mongoose.Types.ObjectId).toString();

      await ParentStudentRelation.create({
        parentId,
        studentId: student._id,
        isActive: true,
      });

      const endpoints = [
        '/api/parents/me/children',
        `/api/parents/me/children/${childId}/courses`,
        `/api/parents/me/children/${childId}/grades`,
        `/api/parents/me/children/${childId}/attendance`,
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...endpoints),
          async (endpoint) => {
            authenticateAs(parentId.toString(), 'parent');

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
