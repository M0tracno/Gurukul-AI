/**
 * Backend Integration Tests
 *
 * Tests the full request lifecycle using mongodb-memory-server for isolated DB testing.
 * Covers:
 * - Auth flow: login, refresh, logout
 * - CRUD operations on Student, Course, Enrollment resources
 * - Admin-management security: authentication + RBAC enforcement
 * - Error handling paths (validation, 404, unauthorized)
 *
 * The Student/Course/Enrollment admin-management endpoints are now secured by
 * `authMiddleware` + RBAC (reads: admin|teacher, writes: admin), so every CRUD
 * request below carries a Bearer token obtained via the real login flow.
 *
 * Validates: Requirements 9.1
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Models (imported to register Mongoose schemas)
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';
import '../models/Enrollment.js';
import '../models/RefreshToken.js';
import '../models/AuditLog.js';

// Middleware
import { globalErrorHandler, notFoundHandler } from '../middleware/errorHandler.js';

// Routes
import authRoutes from '../routes/authRoutes.js';
import studentRoutes from '../routes/studentRoutes.js';
import courseRoutes from '../routes/courseRoutes.js';
import enrollmentRoutes from '../routes/enrollmentRoutes.js';

// ----- Test App Setup -----

let mongoServer: MongoMemoryServer;
let app: Express;

// Monotonic counter used to hand every request a unique synthetic source IP so
// the strict per-IP admin-management rate limiter never throttles the suite.
let requestIpCounter = 0;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());

  // The secured admin-management routers apply a strict per-source-IP rate
  // limiter that only counts failed responses (rateLimiter.ts). This suite
  // intentionally exercises many 4xx paths, so to avoid a single loopback
  // address tripping the limiter we trust the proxy header and assign each
  // request a unique synthetic source IP. The limiter therefore sees every
  // request as coming from a distinct client and never throttles the suite.
  testApp.set('trust proxy', true);
  testApp.use((req: Request, _res: Response, next: NextFunction) => {
    requestIpCounter += 1;
    const octet3 = Math.floor(requestIpCounter / 256) % 256;
    const octet4 = requestIpCounter % 256;
    req.headers['x-forwarded-for'] = `10.20.${octet3}.${octet4}`;
    next();
  });

  // Attach a correlation id so the audit-logging performed by the secured
  // admin-management controllers (which read `req.correlationId`) always has a
  // non-empty value to persist. The real server supplies this via dedicated
  // correlationId middleware.
  testApp.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { correlationId?: string }).correlationId = 'test-correlation-id';
    next();
  });

  // Mount routes at the same paths the real server uses
  testApp.use('/api/v1/auth', authRoutes);
  testApp.use('/api/v1/students', studentRoutes);
  testApp.use('/api/v1/courses', courseRoutes);
  testApp.use('/api/v1/enrollments', enrollmentRoutes);

  // 404 handler — uses the canonical notFoundHandler
  testApp.use(notFoundHandler);

  // Error handler
  testApp.use(globalErrorHandler);

  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Set JWT_SECRET for auth operations
  process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';

  app = createTestApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

afterEach(async () => {
  // Clean all collections between tests
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// ----- Helper Functions -----

async function createTestStudent(overrides = {}) {
  const defaults = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@school.edu',
    password: 'SecurePass123',
    studentId: 'STU-2024-001',
    grade: '10',
  };
  return Student.create({ ...defaults, ...overrides });
}

async function createTestFaculty(overrides = {}) {
  const defaults = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@school.edu',
    password: 'SecurePass123',
    employeeId: 'FAC-2024-001',
    department: 'Mathematics',
    title: 'Professor',
  };
  return Faculty.create({ ...defaults, ...overrides });
}

const ADMIN_EMAIL = 'admin@school.edu';
const ADMIN_PASSWORD = 'SecurePass123';

/**
 * Seed an admin Faculty record (isAdmin + role:'admin'). The login endpoint
 * derives the token role from the supplied `userType`, so logging in as this
 * account with `userType:'admin'` yields an admin-scoped access token.
 */
async function createAdminFaculty(overrides = {}) {
  const defaults = {
    firstName: 'Admin',
    lastName: 'User',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    employeeId: 'FAC-ADMIN-001',
    department: 'Administration',
    title: 'Administrator',
    isAdmin: true,
    role: 'admin',
  };
  return Faculty.create({ ...defaults, ...overrides });
}

/** Log in the seeded admin Faculty and return an admin-scoped access token. */
async function getAdminToken(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, userType: 'admin' });
  return res.body.data.accessToken as string;
}

async function loginAsStudent(studentEmail = 'john.doe@school.edu', password = 'SecurePass123') {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: studentEmail, password, userType: 'student' });
  return res.body.data;
}

async function loginAsTeacher(teacherEmail = 'jane.smith@school.edu', password = 'SecurePass123') {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: teacherEmail, password, userType: 'teacher' });
  return res.body.data;
}

// ===========================
// AUTH FLOW TESTS
// ===========================

describe('Auth Flow Integration Tests', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login a student with valid credentials', async () => {
      await createTestStudent();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john.doe@school.edu',
          password: 'SecurePass123',
          userType: 'student',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toMatchObject({
        email: 'john.doe@school.edu',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
      });
    });

    it('should login a teacher with valid credentials', async () => {
      await createTestFaculty();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane.smith@school.edu',
          password: 'SecurePass123',
          userType: 'teacher',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.role).toBe('teacher');
    });

    it('should return 401 for invalid password', async () => {
      await createTestStudent();

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john.doe@school.edu',
          password: 'WrongPassword',
          userType: 'student',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody@school.edu',
          password: 'SomePassword',
          userType: 'student',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john@test.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('details');
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: 'SomePass',
          userType: 'student',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid userType', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@school.edu',
          password: 'SomePass',
          userType: 'hacker',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue new token pair with valid refresh token', async () => {
      await createTestStudent();
      const loginData = await loginAsStudent();

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginData.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      // New refresh token should differ from the old one (rotation)
      expect(res.body.data.refreshToken).not.toBe(loginData.refreshToken);
    });

    it('should invalidate old refresh token after rotation', async () => {
      await createTestStudent();
      const loginData = await loginAsStudent();

      // First refresh succeeds
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginData.refreshToken });

      // Second use of the same refresh token should fail (it was consumed)
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginData.refreshToken });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'totally-invalid-token-value' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid access token', async () => {
      await createTestStudent();
      const loginData = await loginAsStudent();

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginData.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('message', 'Successfully logged out');
    });

    it('should revoke all refresh tokens after logout', async () => {
      await createTestStudent();
      const loginData = await loginAsStudent();

      // Logout
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginData.accessToken}`);

      // Try to use refresh token — should be revoked
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginData.refreshToken });

      expect(res.status).toBe(401);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 401 with expired/invalid access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});

// ===========================
// STUDENT CRUD TESTS
// ===========================

describe('Student CRUD Integration Tests', () => {
  let adminToken: string;

  beforeEach(async () => {
    await createAdminFaculty();
    adminToken = await getAdminToken();
  });

  describe('GET /api/v1/students', () => {
    it('should return an empty list when no students exist', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toHaveProperty('total', 0);
    });

    it('should return paginated students with real data and no password', async () => {
      // Create multiple students
      await createTestStudent({ email: 'a@school.edu', studentId: 'STU-001' });
      await createTestStudent({ email: 'b@school.edu', studentId: 'STU-002' });
      await createTestStudent({ email: 'c@school.edu', studentId: 'STU-003' });

      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      // List now returns real persisted data via studentService.list.
      expect(Array.isArray(res.body.data)).toBe(true);
      // Page size of 2 over 3 total students.
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toHaveProperty('total', 3);
      // The password must never be present on any returned entry.
      for (const student of res.body.data) {
        expect(student).not.toHaveProperty('password');
      }
    });

    it('should return 400 for invalid query parameters', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: -1 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for unknown query parameters', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ unknownField: 'value' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/students/:id', () => {
    it('should return 404 for non-existent student', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/students/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for whitespace-only ID param', async () => {
      // URL-encoded space " " matches the route /:id pattern but fails min(1) after trim
      // Express 5 with path-to-regexp may not match, returning 404 instead.
      // Either 400 (validation) or 404 (route not matched/found) is acceptable for invalid IDs.
      const res = await request(app)
        .get('/api/v1/students/%20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(res.status);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/students', () => {
    it('should create a student with valid data (admin_set credential)', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@school.edu',
          studentId: 'STU-2024-010',
          grade: '11',
          credentialDeliveryMethod: 'admin_set',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      // create returns a CreateAccountResult: { account, ... }
      expect(res.body.data).toHaveProperty('account');
      expect(res.body.data.account).toMatchObject({
        email: 'alice.johnson@school.edu',
        studentId: 'STU-2024-010',
        grade: '11',
      });
      // Password is never echoed back.
      expect(res.body.data.account).not.toHaveProperty('password');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Alice',
          // Missing: lastName, email, studentId, grade, credentialDeliveryMethod
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'not-an-email',
          studentId: 'STU-2024-010',
          grade: '11',
          credentialDeliveryMethod: 'admin_set',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for admin_set password too short', async () => {
      // Under the credential-delivery union, `admin_set` requires password.min(8).
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@school.edu',
          studentId: 'STU-2024-010',
          grade: '11',
          credentialDeliveryMethod: 'admin_set',
          password: '12345', // Less than 8 chars
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should ignore unknown profile fields and still create (201)', async () => {
      // The student creation schema (profile ∧ credential union) is non-strict,
      // so unknown profile fields are stripped rather than rejected.
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@school.edu',
          studentId: 'STU-2024-011',
          grade: '11',
          credentialDeliveryMethod: 'admin_set',
          password: 'SecurePass123',
          unknownField: 'should be stripped',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('account');
      expect(res.body.data.account).not.toHaveProperty('unknownField');
    });
  });

  describe('PUT /api/v1/students/:id', () => {
    it('should return 404 when updating non-existent student', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/students/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should update an existing student and exclude the password', async () => {
      const student = await createTestStudent({ email: 'update.me@school.edu', studentId: 'STU-UPD-1' });
      const res = await request(app)
        .put(`/api/v1/students/${student._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated', grade: '12' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ firstName: 'Updated', grade: '12' });
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 400 for invalid update body', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/students/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-valid-email' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for unknown fields in update body', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/students/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hackField: 'injected' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/students/:id', () => {
    it('should return 200 for successful soft-delete', async () => {
      // Soft-delete (deactivate) requires an existing record and returns 200.
      const student = await createTestStudent({ email: 'delete.me@school.edu', studentId: 'STU-DEL-1' });
      const res = await request(app)
        .delete(`/api/v1/students/${student._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ active: false });
    });

    it('should return 404 when soft-deleting a non-existent student', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/students/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});

// ===========================
// COURSE CRUD TESTS
// ===========================

describe('Course CRUD Integration Tests', () => {
  let facultyId: string;
  let adminToken: string;

  beforeEach(async () => {
    const faculty = await createTestFaculty();
    facultyId = faculty._id.toString();

    await createAdminFaculty();
    adminToken = await getAdminToken();
  });

  describe('GET /api/v1/courses', () => {
    it('should return an empty list when no courses exist', async () => {
      const res = await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 400 for invalid pagination params', async () => {
      const res = await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 200 }); // max is 100

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for unknown query fields', async () => {
      const res = await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ badField: 'value' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/courses/:id', () => {
    it('should return 404 for non-existent course', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/courses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/courses', () => {
    it('should create a course with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Physics 201',
          code: 'PHY-201',
          description: 'Advanced mechanics and thermodynamics',
          faculty: facultyId,
          startDate: '2024-09-01T00:00:00.000Z',
          endDate: '2025-01-15T00:00:00.000Z',
          credits: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Physics 201',
          // Missing: code, description, faculty, startDate, endDate, credits
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('should return 400 for negative credits', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Physics 201',
          code: 'PHY-201',
          description: 'Some description',
          faculty: facultyId,
          startDate: '2024-09-01T00:00:00.000Z',
          endDate: '2025-01-15T00:00:00.000Z',
          credits: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for unknown fields', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Physics 201',
          code: 'PHY-201',
          description: 'Some description',
          faculty: facultyId,
          startDate: '2024-09-01T00:00:00.000Z',
          endDate: '2025-01-15T00:00:00.000Z',
          credits: 4,
          hackField: 'injected',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid date format', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Physics 201',
          code: 'PHY-201',
          description: 'Some description',
          faculty: facultyId,
          startDate: 'not-a-date',
          endDate: '2025-01-15T00:00:00.000Z',
          credits: 4,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/courses/:id', () => {
    it('should return 404 for non-existent course', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/courses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Course' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid credits in update', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/courses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ credits: -5 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/courses/:id', () => {
    it('should return 204 for soft-delete (placeholder)', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/courses/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Course controller placeholder currently returns 204 for all IDs
      expect(res.status).toBe(204);
    });
  });
});

// ===========================
// ENROLLMENT CRUD TESTS
// ===========================

describe('Enrollment CRUD Integration Tests', () => {
  let studentId: string;
  let courseId: string;
  let facultyId: string;
  let adminToken: string;

  beforeEach(async () => {
    const faculty = await createTestFaculty();
    facultyId = faculty._id.toString();

    const student = await createTestStudent();
    studentId = student._id.toString();

    const course = await Course.create({
      title: 'Mathematics 101',
      code: 'MATH-101',
      description: 'Introduction to algebra and calculus',
      faculty: facultyId,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-15'),
      credits: 3,
    });
    courseId = course._id.toString();

    await createAdminFaculty();
    adminToken = await getAdminToken();
  });

  describe('GET /api/v1/enrollments', () => {
    it('should return an empty list when no enrollments exist', async () => {
      const res = await request(app)
        .get('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 400 for invalid status filter', async () => {
      const res = await request(app)
        .get('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for unknown query fields', async () => {
      const res = await request(app)
        .get('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ unknownField: 'value' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/enrollments/:id', () => {
    it('should return 404 for non-existent enrollment', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/enrollments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/enrollments', () => {
    it('should create an enrollment with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student: studentId,
          course: courseId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
    });

    it('should return 400 when student ID is missing', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          course: courseId,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 when course ID is missing', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student: studentId,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid status value', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student: studentId,
          course: courseId,
          status: 'invalid_status',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for unknown fields', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student: studentId,
          course: courseId,
          hackField: 'injected',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/enrollments/:id', () => {
    it('should return 404 for non-existent enrollment', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/enrollments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid status in update', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/enrollments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'not_a_valid_status' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid grade in update', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/enrollments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ grade: 'Z' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for finalScore out of range', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/v1/enrollments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ finalScore: 150 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/enrollments/:id', () => {
    it('should return 204 for delete (placeholder)', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/enrollments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Enrollment controller placeholder currently returns 204 for all IDs
      expect(res.status).toBe(204);
    });
  });
});

// ===========================
// ADMIN ENDPOINT SECURITY TESTS
// ===========================

describe('Admin Endpoint Security Integration Tests', () => {
  it('should return 401 for an unauthenticated CRUD request', async () => {
    const res = await request(app).get('/api/v1/students');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should return 401 for an unauthenticated write request', async () => {
    const res = await request(app)
      .post('/api/v1/students')
      .send({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@school.edu',
        studentId: 'STU-2024-050',
        grade: '11',
        credentialDeliveryMethod: 'admin_set',
        password: 'SecurePass123',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should return 403 when a student token attempts a write', async () => {
    await createTestStudent();
    const login = await loginAsStudent();

    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${login.accessToken}`)
      .send({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@school.edu',
        studentId: 'STU-2024-051',
        grade: '11',
        credentialDeliveryMethod: 'admin_set',
        password: 'SecurePass123',
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should allow a teacher token to read but forbid a write (403)', async () => {
    await createTestFaculty();
    const login = await loginAsTeacher();

    // Reads are permitted for teacher role.
    const readRes = await request(app)
      .get('/api/v1/students')
      .set('Authorization', `Bearer ${login.accessToken}`);
    expect(readRes.status).toBe(200);

    // Writes require admin role.
    const writeRes = await request(app)
      .delete(`/api/v1/students/${new mongoose.Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${login.accessToken}`);
    expect(writeRes.status).toBe(403);
  });
});

// ===========================
// ERROR HANDLING TESTS
// ===========================

describe('Error Handling Integration Tests', () => {
  it('should return 404 for unregistered routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
  });

  it('should return consistent error envelope for validation errors', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({}); // Empty body — validation will fail

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('details');
    expect(Array.isArray(res.body.details)).toBe(true);

    // Each detail entry should have field, value, reason
    for (const detail of res.body.details) {
      expect(detail).toHaveProperty('field');
      expect(detail).toHaveProperty('reason');
    }
  });

  it('should never leak stack traces in error responses', async () => {
    // Trigger a potential error with malformed JSON. The body parser rejects it
    // before routing/auth, so this still yields a 4xx without a token.
    const res = await request(app)
      .post('/api/v1/students')
      .set('Content-Type', 'application/json')
      .send('{"invalid json'); // Malformed JSON

    // Express handles malformed JSON with a 400
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Verify no stack trace in response
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('node_modules');
    expect(body).not.toContain('.ts:');
    expect(body).not.toContain('.js:');
    expect(body).not.toContain('at ');
  });
});
