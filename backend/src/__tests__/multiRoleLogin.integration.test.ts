/**
 * Multi-Role Login Journey Integration Tests
 *
 * Seeds a fresh in-memory DB with relational data (mirroring seedAllUsers.js)
 * and asserts Admin/Teacher/Student/Parent each authenticate successfully and
 * see non-empty authorized data from their respective endpoints.
 *
 * Validates: Requirements 6.4
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Dynamic imports after mocks
const { globalErrorHandler, notFoundHandler } = await import('../middleware/errorHandler.js');
const { default: Faculty } = await import('../models/Faculty.js');
const { default: Student } = await import('../models/Student.js');
const { default: Parent } = await import('../models/Parent.js');
const { default: Course } = await import('../models/Course.js');
await import('../models/Enrollment.js');
await import('../models/RefreshToken.js');

const { default: authRoutes } = await import('../routes/authRoutes.js');
const { default: courseRoutes } = await import('../routes/courseRoutes.js');
const { default: facultyRoutes } = await import('../routes/facultyRoutes.js');
const { default: markRoutes } = await import('../routes/markRoutes.js');
const { default: studentMeRoutes } = await import('../routes/studentMeRoutes.js');
const { default: parentMeRoutes } = await import('../routes/parentMeRoutes.js');

// ─── Test Setup ──────────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;
let app: Express;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());

  // Mount routes at the same paths the real server uses
  testApp.use('/api/auth', authRoutes);
  testApp.use('/api/courses', courseRoutes);
  testApp.use('/api/faculty', facultyRoutes);
  testApp.use('/api/marks', markRoutes);
  testApp.use('/api/students', studentMeRoutes);
  testApp.use('/api/parents', parentMeRoutes);

  // 404 + error handlers
  testApp.use(notFoundHandler);
  testApp.use(globalErrorHandler);

  return testApp;
}

// ─── Seed Logic (mirrors backend/scripts/seedAllUsers.js) ────────────────────

const DEMO_PASSWORDS = {
  admin: 'Admin@2024',
  teacher: 'Teacher@2024',
  student: 'Student@2024',
  parent: 'Parent@2024',
};

async function seedTestDatabase() {
  // Create Admin (Faculty with role admin, isAdmin: true)
  await Faculty.create({
    firstName: 'Krishna',
    lastName: 'Admin',
    email: 'admin@gurukul.edu',
    password: DEMO_PASSWORDS.admin,
    employeeId: 'ADM001',
    department: 'Administration',
    title: 'Administrator',
    role: 'admin',
    isAdmin: true,
    active: true,
  });

  // Create Teacher
  const teacher = await Faculty.create({
    firstName: 'Dronacharya',
    lastName: 'Singh',
    email: 'teacher@gurukul.edu',
    password: DEMO_PASSWORDS.teacher,
    employeeId: 'FAC001',
    department: 'Computer Science',
    title: 'Professor',
    role: 'faculty',
    isAdmin: false,
    active: true,
  });

  // Create Student
  const student = await Student.create({
    firstName: 'Arjun',
    lastName: 'Sharma',
    email: 'student@gurukul.edu',
    password: DEMO_PASSWORDS.student,
    studentId: 'STU001',
    grade: '10',
    active: true,
  });

  // Create Parent
  const parent = await Parent.create({
    parentId: 'PAR001',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    phoneNumber: '9876543210',
    email: 'parent@gurukul.edu',
    password: DEMO_PASSWORDS.parent,
    relationToStudent: 'Father',
    isActive: true,
    isVerified: true,
  });

  // Create parent-student relation
  const ParentStudentRelation =
    mongoose.models.ParentStudentRelation ||
    mongoose.model(
      'ParentStudentRelation',
      new mongoose.Schema(
        {
          parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent' },
          studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
          isActive: { type: Boolean, default: true },
        },
        { collection: 'parent_student_relations' }
      )
    );

  await ParentStudentRelation.create({
    parentId: parent._id,
    studentId: student._id,
    isActive: true,
  });

  // Create Course (owned by teacher)
  const course = await Course.create({
    title: 'Introduction to Programming',
    code: 'CS101',
    description: 'Foundations of programming using modern languages.',
    faculty: teacher._id,
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(new Date().getFullYear(), 11, 31),
    credits: 4,
    maxStudents: 30,
    active: true,
  });

  // Create Enrollment (student enrolled in course)
  const Enrollment = mongoose.model('Enrollment');
  const enrollment = await Enrollment.create({
    student: student._id,
    course: course._id,
    enrollmentDate: new Date(),
    status: 'active',
    grade: 'A',
    finalScore: 88,
  });

  // Create Mark (referencing enrollment)
  const Mark =
    mongoose.models.Mark ||
    mongoose.model(
      'Mark',
      new mongoose.Schema(
        {
          enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
          title: String,
          type: { type: String, default: 'assignment' },
          maxScore: Number,
          score: Number,
          weight: { type: Number, default: 1 },
          feedback: String,
          aiGenerated: { type: Boolean, default: false },
        },
        { timestamps: true, collection: 'marks' }
      )
    );

  await Mark.create({
    enrollment: enrollment._id,
    title: 'Quiz 1',
    type: 'quiz',
    maxScore: 20,
    score: 17,
    weight: 0.2,
    feedback: 'Good effort.',
    aiGenerated: false,
  });

  // Create Attendance (referencing enrollment)
  const Attendance =
    mongoose.models.Attendance ||
    mongoose.model(
      'Attendance',
      new mongoose.Schema(
        {
          enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
          date: Date,
          status: { type: String, default: 'present' },
          recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
          recordedAt: { type: Date, default: Date.now },
        },
        { collection: 'attendances' }
      )
    );

  await Attendance.create({
    enrollment: enrollment._id,
    date: new Date(),
    status: 'present',
    recordedBy: teacher._id,
  });
}

// ─── Helper Functions ────────────────────────────────────────────────────────

async function loginAs(
  email: string,
  password: string,
  userType: string
): Promise<{ accessToken: string; user: Record<string, unknown> }> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password, userType });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('success', true);
  expect(res.body.data).toHaveProperty('accessToken');
  return res.body.data;
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  process.env.JWT_SECRET = 'test-secret-for-multi-role-integration';

  app = createTestApp();

  // Seed the DB with relational data
  await seedTestDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

// ─── Integration Tests ───────────────────────────────────────────────────────

describe('Multi-Role Login Journey Integration Tests', () => {
  describe('Admin login and data access', () => {
    let adminToken: string;
    let adminLoginData: { accessToken: string; user: Record<string, unknown> };

    beforeAll(async () => {
      adminLoginData = await loginAs(
        'admin@gurukul.edu',
        DEMO_PASSWORDS.admin,
        'admin'
      );
      adminToken = adminLoginData.accessToken;
    });

    it('should authenticate successfully as Admin', () => {
      expect(adminToken).toBeDefined();
      expect(adminToken.length).toBeGreaterThan(0);
    });

    it('should return user profile with admin role on login', () => {
      expect(adminLoginData.user).toBeDefined();
      expect(adminLoginData.user.role).toBe('admin');
      expect(adminLoginData.user.email).toBe('admin@gurukul.edu');
    });

    it('should see non-empty profile data via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('firstName');
      expect(res.body.data).toHaveProperty('lastName');
      expect(res.body.data).toHaveProperty('role', 'admin');
      expect(res.body.data.firstName.length).toBeGreaterThan(0);
    });

    it('should receive standardized envelope format', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Teacher login and data access', () => {
    let teacherToken: string;
    let teacherLoginData: { accessToken: string; user: Record<string, unknown> };

    beforeAll(async () => {
      teacherLoginData = await loginAs(
        'teacher@gurukul.edu',
        DEMO_PASSWORDS.teacher,
        'teacher'
      );
      teacherToken = teacherLoginData.accessToken;
    });

    it('should authenticate successfully as Teacher', () => {
      expect(teacherToken).toBeDefined();
      expect(teacherToken.length).toBeGreaterThan(0);
    });

    it('should return user profile with teacher role on login', () => {
      expect(teacherLoginData.user).toBeDefined();
      expect(teacherLoginData.user.role).toBe('teacher');
      expect(teacherLoginData.user.email).toBe('teacher@gurukul.edu');
    });

    it('should see non-empty profile data via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('firstName');
      expect(res.body.data).toHaveProperty('lastName');
      expect(res.body.data).toHaveProperty('role', 'teacher');
      expect(res.body.data.firstName.length).toBeGreaterThan(0);
    });

    it('should receive standardized envelope format', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Student login and data access', () => {
    let studentToken: string;

    beforeAll(async () => {
      const loginData = await loginAs(
        'student@gurukul.edu',
        DEMO_PASSWORDS.student,
        'student'
      );
      studentToken = loginData.accessToken;
    });

    it('should authenticate successfully as Student', () => {
      expect(studentToken).toBeDefined();
      expect(studentToken.length).toBeGreaterThan(0);
    });

    it('should see non-empty courses for the student', async () => {
      const res = await request(app)
        .get('/api/students/me/courses')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should see non-empty grades for the student', async () => {
      const res = await request(app)
        .get('/api/students/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should receive standardized envelope format', async () => {
      const res = await request(app)
        .get('/api/students/me/courses')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Parent login and data access', () => {
    let parentToken: string;

    beforeAll(async () => {
      const loginData = await loginAs(
        'parent@gurukul.edu',
        DEMO_PASSWORDS.parent,
        'parent'
      );
      parentToken = loginData.accessToken;
    });

    it('should authenticate successfully as Parent', () => {
      expect(parentToken).toBeDefined();
      expect(parentToken.length).toBeGreaterThan(0);
    });

    it('should see non-empty children data', async () => {
      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should see non-empty courses for linked child', async () => {
      // First get the childId
      const childRes = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', `Bearer ${parentToken}`);

      const children = childRes.body.data;
      const childId = children[0]._id || children[0].id;

      const res = await request(app)
        .get(`/api/parents/me/children/${childId}/courses`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should receive standardized envelope format', async () => {
      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });
  });
});
