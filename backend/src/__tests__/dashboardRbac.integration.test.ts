/**
 * Dashboard RBAC Matrix & Middleware-Ordering Integration Tests
 *
 * Feature: personalized-role-dashboards-and-verified-access (Task 10.4)
 *
 * Exercises the fixed route pipeline
 *   authMiddleware → requireRoles/adminOnly → validateRequest → controller
 * across every role-scoped dashboard endpoint and the admin parent-linkage
 * surface, plus the OTP rate-limit guard, asserting the full RBAC matrix:
 *
 *   - Unauthenticated calls are rejected with 401 by `authMiddleware` BEFORE
 *     any role check or handler runs (Req 2.7).
 *   - Wrong-role calls are rejected with 403 by the RBAC middleware BEFORE the
 *     handler runs (Req 2.8 for dashboards, Req 7.4 for admin linkage routes).
 *   - Correct-role calls clear both auth gates (status is never 401/403).
 *   - OTP endpoints, mounted behind `adminManagementRateLimit`, return 429 once
 *     the per-source failure threshold is exceeded (Req 6.6).
 *
 * The app under test is assembled in-process: `server.ts` calls
 * `startServer()`/`server.listen()` and `connectDB()` at import time, so it is
 * never imported here. Instead we mount the real routers + real middleware onto
 * a bare Express app (mirroring the repo's existing integration tests) and drive
 * it with supertest against an isolated `mongodb-memory-server`.
 *
 * Validates: Requirements 2.7, 2.8, 6.6, 7.4
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock the Winston logger to avoid import.meta.url resolution under ts-jest ESM.
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  morganStream: { write: jest.fn() },
}));

// Dynamic imports after the mock is registered (ESM hoisting rules).
const { globalErrorHandler, notFoundHandler } = await import('../middleware/errorHandler.js');

const { default: Faculty } = await import('../models/Faculty.js');
const { default: Student } = await import('../models/Student.js');
const { default: Parent } = await import('../models/Parent.js');
await import('../models/Course.js');
await import('../models/Enrollment.js');
await import('../models/RefreshToken.js');
await import('../models/AuditLog.js');
await import('../models/ParentStudentRelation.js');

const { authTokenService } = await import('../services/authTokenService.js');

const { default: authRoutes } = await import('../routes/authRoutes.js');
const { default: facultyMeRoutes } = await import('../routes/facultyMeRoutes.js');
const { default: studentMeRoutes } = await import('../routes/studentMeRoutes.js');
const { default: parentMeRoutes } = await import('../routes/parentMeRoutes.js');
const { default: parentLinkageRoutes } = await import('../routes/parentLinkageRoutes.js');
const { default: adminDashboardRoutes } = await import('../routes/adminDashboardRoutes.js');

// ─── Test App Setup ──────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;
let app: Express;

// Real tokens minted via authTokenService.generateTokenPair(userId, role, model).
let studentToken: string;
let facultyToken: string;
let parentToken: string;
let adminToken: string;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());

  // Mount the real routers at the same paths the production server uses
  // (see server.ts) so the route pipelines under test are byte-for-byte the
  // ones that run in production.
  testApp.use('/api/auth', authRoutes);
  testApp.use('/api/faculty', facultyMeRoutes);
  testApp.use('/api/students', studentMeRoutes);
  testApp.use('/api/parents', parentMeRoutes);
  testApp.use('/api/admin/parent-linkages', parentLinkageRoutes);
  testApp.use('/api/admin', adminDashboardRoutes);

  testApp.use(notFoundHandler);
  testApp.use(globalErrorHandler);

  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Required for JWT signing/validation inside authTokenService + authMiddleware.
  process.env.JWT_SECRET = 'test-secret-for-dashboard-rbac-integration';

  app = createTestApp();

  // Seed one authoritative record per role so correct-role dashboard calls
  // resolve real identities and return 200 rather than a 404. The RBAC
  // assertions themselves only require that the auth gates (401/403) are or
  // are not tripped, so they remain valid regardless.
  const faculty = await Faculty.create({
    firstName: 'Dronacharya',
    lastName: 'Singh',
    email: 'faculty.rbac@gurukul.edu',
    password: 'Teacher@2024',
    employeeId: 'FAC-RBAC-001',
    department: 'Computer Science',
    title: 'Professor',
    role: 'faculty',
    isAdmin: false,
    active: true,
  });

  const student = await Student.create({
    firstName: 'Arjun',
    lastName: 'Sharma',
    email: 'student.rbac@gurukul.edu',
    password: 'Student@2024',
    studentId: 'STU-RBAC-001',
    grade: '10',
    active: true,
  });

  const parent = await Parent.create({
    parentId: 'PAR-RBAC-001',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    phoneNumber: '9876543210',
    email: 'parent.rbac@gurukul.edu',
    password: 'Parent@2024',
    relationToStudent: 'Father',
    isActive: true,
    isVerified: true,
  });

  // The faculty `/me` routes authorize role 'faculty' OR 'admin'; mint a token
  // whose role claim is exactly 'faculty'. Admin uses a synthetic id (the admin
  // dashboard aggregates collections and needs no per-user lookup).
  studentToken = (
    await authTokenService.generateTokenPair(student._id.toString(), 'student', 'Student')
  ).accessToken;
  facultyToken = (
    await authTokenService.generateTokenPair(faculty._id.toString(), 'faculty', 'Faculty')
  ).accessToken;
  parentToken = (
    await authTokenService.generateTokenPair(parent._id.toString(), 'parent', 'Parent')
  ).accessToken;
  adminToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'admin',
      'Admin',
    )
  ).accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

// ─── RBAC Matrix Fixtures ────────────────────────────────────────────────────

// A valid-shaped (24-hex) studentId so the admin linkage list query clears
// `validateRequest`. For unauth/wrong-role cases the query is irrelevant
// because the request is rejected before validation runs.
const SAMPLE_STUDENT_ID = new mongoose.Types.ObjectId().toString();

interface EndpointCase {
  name: string;
  path: string;
  /** Roles permitted by the route's RBAC middleware. */
  allowed: Array<'student' | 'faculty' | 'parent' | 'admin'>;
}

const dashboardEndpoints: EndpointCase[] = [
  { name: 'faculty dashboard', path: '/api/faculty/me/dashboard', allowed: ['faculty', 'admin'] },
  { name: 'student dashboard', path: '/api/students/me/dashboard', allowed: ['student'] },
  { name: 'parent dashboard', path: '/api/parents/me/dashboard', allowed: ['parent'] },
  { name: 'admin dashboard', path: '/api/admin/dashboard', allowed: ['admin'] },
  {
    name: 'admin parent-linkage list',
    path: `/api/admin/parent-linkages?studentId=${SAMPLE_STUDENT_ID}`,
    allowed: ['admin'],
  },
];

function tokenForRole(role: 'student' | 'faculty' | 'parent' | 'admin'): string {
  switch (role) {
    case 'student':
      return studentToken;
    case 'faculty':
      return facultyToken;
    case 'parent':
      return parentToken;
    case 'admin':
      return adminToken;
  }
}

const ALL_ROLES: Array<'student' | 'faculty' | 'parent' | 'admin'> = [
  'student',
  'faculty',
  'parent',
  'admin',
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Dashboard RBAC matrix & middleware ordering (Task 10.4)', () => {
  describe('Unauthenticated access is rejected with 401 before any handler (Req 2.7)', () => {
    for (const ep of dashboardEndpoints) {
      it(`GET ${ep.name} without a token → 401`, async () => {
        const res = await request(app).get(ep.path);

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('success', false);
      });
    }

    it('rejects a malformed Bearer token with 401 (auth gate, not handler)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer not-a-real-jwt');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Wrong-role access is rejected with 403 before any handler (Req 2.8, 7.4)', () => {
    for (const ep of dashboardEndpoints) {
      const disallowed = ALL_ROLES.filter((r) => !ep.allowed.includes(r));
      for (const role of disallowed) {
        it(`GET ${ep.name} with a ${role} token → 403`, async () => {
          const res = await request(app)
            .get(ep.path)
            .set('Authorization', `Bearer ${tokenForRole(role)}`);

          expect(res.status).toBe(403);
          expect(res.body).toHaveProperty('success', false);
        });
      }
    }
  });

  describe('Correct-role access clears both auth gates (never 401/403)', () => {
    for (const ep of dashboardEndpoints) {
      for (const role of ep.allowed) {
        it(`GET ${ep.name} with a ${role} token → not 401/403`, async () => {
          const res = await request(app)
            .get(ep.path)
            .set('Authorization', `Bearer ${tokenForRole(role)}`);

          expect(res.status).not.toBe(401);
          expect(res.status).not.toBe(403);
        });
      }
    }
  });

  // The OTP endpoints mount the shared `adminManagementRateLimit`
  // (failedAuthAuditLogger → adminRateLimiter). That limiter is keyed by source
  // IP and, via `skipSuccessfulRequests`, only counts responses with status
  // >= 400, with a threshold of 10 failures per window. supertest issues every
  // request from the same loopback source, so repeated failing OTP requests
  // accumulate against one key. We send malformed OTP requests (empty body →
  // 400 from validateRequest, which runs *after* the limiter so the failures
  // are counted); once the threshold is exceeded the limiter short-circuits
  // with 429 before the handler runs (Req 6.6).
  describe('OTP endpoints return 429 over the rate limit (Req 6.6)', () => {
    it('POST /api/auth/parent/otp/request repeatedly from one source → 429 after the threshold', async () => {
      const statuses: number[] = [];

      // 10 failures are allowed per window; the 11th trips the limiter. Loop a
      // few past that to confirm the limiter stays engaged.
      for (let i = 0; i < 14; i += 1) {
        const res = await request(app)
          .post('/api/auth/parent/otp/request')
          .send({}); // malformed: missing studentId + phoneNumber → 400 (counted)
        statuses.push(res.status);
      }

      const first429 = statuses.indexOf(429);

      // The limiter must engage, and only after the failure threshold is
      // exceeded — never on the first request.
      expect(first429).toBeGreaterThanOrEqual(10);
      // Every response before the limiter engages is the validation failure,
      // and every response after it is the rate-limit rejection.
      expect(statuses.slice(0, first429).every((s) => s === 400)).toBe(true);
      expect(statuses.slice(first429).every((s) => s === 429)).toBe(true);
    });
  });
});
