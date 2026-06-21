/**
 * Parents Route Placement & Access Integration Tests
 *
 * Feature: communication-feedback-and-admin-apis (Task 9.6)
 *
 * Asserts the admin parents list (`parentRoutes`, GET /api/parents) and the
 * parent self-service router (`parentMeRoutes`, /api/parents/me/*) coexist
 * without collision when both are mounted at `/api/parents` — with
 * `parentRoutes` mounted FIRST, exactly as in `server.ts` (Requirement 10.8).
 *
 * Access matrix for GET /api/parents (the admin list):
 *   - Missing/invalid Bearer token  → 401 before any business logic (Req 10.6)
 *   - Non-admin (e.g. faculty) token → 403 (Req 10.7)
 *   - Admin token                    → 200 admin list (Req 10.7)
 *   - No matching Parent records     → 200 with an empty collection (Req 10.5)
 *
 * Route placement:
 *   - GET /api/parents/me/children with a parent token still resolves to the
 *     self-service router (200, not swallowed by the admin list / never 403).
 *
 * The app under test is assembled in-process by mounting the real routers onto
 * a bare Express app (mirroring the repo's existing integration tests) and
 * driving it with supertest against an isolated `mongodb-memory-server`.
 * `server.ts` is never imported because it self-starts on import.
 *
 * Validates: Requirements 10.5, 10.6, 10.7, 10.8
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
const { default: Parent } = await import('../models/Parent.js');
await import('../models/Student.js');
await import('../models/RefreshToken.js');
await import('../models/ParentStudentRelation.js');

const { authTokenService } = await import('../services/authTokenService.js');

const { default: parentRoutes } = await import('../routes/parentRoutes.js');
const { default: parentMeRoutes } = await import('../routes/parentMeRoutes.js');

// ─── Test App Setup ──────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;
let app: Express;

let adminToken: string;
let facultyToken: string;
let parentToken: string;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());

  // Mount in the SAME order as server.ts: the admin-management parents list
  // FIRST, then the self-service router, both at `/api/parents`. This is the
  // ordering under test (Requirement 10.8).
  testApp.use('/api/parents', parentRoutes);
  testApp.use('/api/parents', parentMeRoutes);

  testApp.use(notFoundHandler);
  testApp.use(globalErrorHandler);

  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Required for JWT signing/validation inside authTokenService + authMiddleware.
  process.env.JWT_SECRET = 'test-secret-for-parent-route-placement';

  app = createTestApp();

  // Admin uses a synthetic id (the admin list aggregates the Parent collection
  // and needs no per-user lookup). Faculty is a real record so its token's role
  // claim is a genuine non-admin role for the 403 case.
  const faculty = await Faculty.create({
    firstName: 'Dronacharya',
    lastName: 'Singh',
    email: 'faculty.parents@gurukul.edu',
    password: 'Teacher@2024',
    employeeId: 'FAC-PAR-001',
    department: 'Computer Science',
    title: 'Professor',
    role: 'faculty',
    isAdmin: false,
    active: true,
  });

  const parent = await Parent.create({
    parentId: 'PAR-PLACEMENT-001',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    phoneNumber: '9876500001',
    email: 'parent.placement@gurukul.edu',
    password: 'Parent@2024',
    relationToStudent: 'Father',
    isActive: true,
    isVerified: true,
  });

  adminToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'admin',
      'Admin',
    )
  ).accessToken;
  facultyToken = (
    await authTokenService.generateTokenPair(faculty._id.toString(), 'faculty', 'Faculty')
  ).accessToken;
  parentToken = (
    await authTokenService.generateTokenPair(parent._id.toString(), 'parent', 'Parent')
  ).accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Parents route placement & access (Task 9.6)', () => {
  // ─── Access matrix for GET /api/parents (admin list) ──────────────────────
  describe('GET /api/parents — admin list access (Req 10.6, 10.7)', () => {
    it('rejects a request with no Bearer token with 401 before any business logic (Req 10.6)', async () => {
      const res = await request(app).get('/api/parents');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('rejects a malformed Bearer token with 401 (Req 10.6)', async () => {
      const res = await request(app)
        .get('/api/parents')
        .set('Authorization', 'Bearer not-a-real-jwt');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('rejects a non-admin (faculty) token with 403 (Req 10.7)', async () => {
      const res = await request(app)
        .get('/api/parents')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('grants an admin token access with 200 and a paginated Envelope (Req 10.7, 10.1)', async () => {
      const res = await request(app)
        .get('/api/parents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // The seeded parent is returned to the admin list.
      expect(res.body.data.length).toBeGreaterThan(0);
      // Pagination metadata is present (page/limit/total).
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('total');
    });

    it('excludes the password field from every returned Parent record (Req 10.4)', async () => {
      const res = await request(app)
        .get('/api/parents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      for (const entry of res.body.data) {
        expect(entry).not.toHaveProperty('password');
      }
    });
  });

  // ─── Empty corpus → 200 with an empty collection (Req 10.5) ────────────────
  describe('GET /api/parents — empty corpus (Req 10.5)', () => {
    it('returns 200 with an empty collection when no Parent records match', async () => {
      // A search term that matches no seeded parent → empty result set, while
      // still exercising the real admin list pipeline end-to-end.
      const res = await request(app)
        .get('/api/parents')
        .query({ search: 'zzz-no-such-parent-zzz' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.meta).toHaveProperty('total', 0);
    });
  });

  // ─── Route placement: /api/parents/me/* resolves to self-service ───────────
  describe('GET /api/parents/me/* resolves to the self-service router (Req 10.8)', () => {
    it('routes /api/parents/me/children to the parent self-service handler (200, not the admin list / not 403)', async () => {
      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', `Bearer ${parentToken}`);

      // If `parentRoutes` (admin-only GET /) had swallowed this path, a parent
      // token would be rejected with 403 by `adminOnly`. A 200 proves the
      // request reached the self-service router instead (no collision).
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('does not expose the admin list at /api/parents/me/children (parent token is never 403 there)', async () => {
      const res = await request(app)
        .get('/api/parents/me/children')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).not.toBe(403);
    });
  });
});
