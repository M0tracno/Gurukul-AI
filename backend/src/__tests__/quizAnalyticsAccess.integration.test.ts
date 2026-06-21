/**
 * Quiz Analytics Access & Zeroed-Metrics Integration Tests
 *
 * Feature: communication-feedback-and-admin-apis (Task 10.5)
 *
 * Exercises the real route pipeline for the faculty quiz-analytics endpoint
 *   GET /api/faculty/me/quiz-analytics
 *   authMiddleware → requireRoles('teacher','admin') → facultyMeController.getQuizAnalytics
 * mounted on `facultyMeRoutes` at `/api/faculty`, exactly as in `server.ts`.
 *
 * Access matrix:
 *   - Missing/invalid Bearer token → 401 before any business logic (Req 11.9)
 *   - Non-teacher token (student / parent) → 403 (Req 11.10)
 *   - Teacher token whose assessment has no submissions → 200 with zeroed
 *     metrics (totalAttempts 0, averageScorePercent 0, every score band 0,
 *     every completion status 0), both in the aggregate and the per-assessment
 *     row (Req 11.7)
 *
 * The app under test is assembled in-process by mounting the real router onto a
 * bare Express app (mirroring the repo's existing integration tests) and
 * driving it with supertest against an isolated `mongodb-memory-server`.
 * `server.ts` is never imported because it self-starts (connectDB / listen) on
 * import.
 *
 * RBAC note: per Requirement 11.1/11.10 a faculty member's role for this
 * endpoint is `teacher`, and the route enforces `requireRoles('teacher',
 * 'admin')`. `authTokenService` maps the `Faculty` user-model to the `teacher`
 * role on refresh, so the teacher token is minted with role `teacher`.
 *
 * Validates: Requirements 11.7, 11.9, 11.10
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { type Express } from 'express';
import request from 'supertest';

import { SCORE_BANDS } from '../config/feedbackConfig.js';

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
const { default: Assessment } = await import('../models/Assessment.js');
// Register the collections the quiz-analytics service reads from.
await import('../models/Submission.js');
await import('../models/Enrollment.js');
await import('../models/RefreshToken.js');

const { authTokenService } = await import('../services/authTokenService.js');

const { default: facultyMeRoutes } = await import('../routes/facultyMeRoutes.js');

// ─── Test App Setup ──────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;
let app: Express;

let teacherToken: string;
let studentToken: string;
let parentToken: string;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());

  // Mount the real router at the same path the production server uses.
  testApp.use('/api/faculty', facultyMeRoutes);

  testApp.use(notFoundHandler);
  testApp.use(globalErrorHandler);

  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Required for JWT signing/validation inside authTokenService + authMiddleware.
  process.env.JWT_SECRET = 'test-secret-for-quiz-analytics-access';

  app = createTestApp();

  // A real Faculty record so the teacher token's `userId` resolves a genuine
  // teacher whose assessments are queried by the service.
  const teacher = await Faculty.create({
    firstName: 'Dronacharya',
    lastName: 'Singh',
    email: 'teacher.quizanalytics@gurukul.edu',
    password: 'Teacher@2024',
    employeeId: 'FAC-QA-001',
    department: 'Computer Science',
    title: 'Professor',
    role: 'faculty',
    isAdmin: false,
    active: true,
  });

  const student = await Student.create({
    firstName: 'Arjun',
    lastName: 'Sharma',
    email: 'student.quizanalytics@gurukul.edu',
    password: 'Student@2024',
    studentId: 'STU-QA-001',
    grade: '10',
    active: true,
  });

  const parent = await Parent.create({
    parentId: 'PAR-QA-001',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    phoneNumber: '9876500011',
    email: 'parent.quizanalytics@gurukul.edu',
    password: 'Parent@2024',
    relationToStudent: 'Father',
    isActive: true,
    isVerified: true,
  });

  // Seed exactly one assessment owned by the teacher, with NO associated
  // Submission documents, so the endpoint must return zeroed metrics (Req 11.7).
  await Assessment.create({
    courseId: new mongoose.Types.ObjectId(),
    teacherId: teacher._id,
    title: 'Empty Assessment (no submissions)',
    questions: [
      {
        questionId: 'Q1',
        prompt: 'What is 2 + 2?',
        type: 'objective',
        maxScore: 10,
        options: ['3', '4', '5'],
        answerKey: '4',
      },
    ],
    opensAt: new Date('2026-01-01T00:00:00.000Z'),
    closesAt: new Date('2026-12-31T23:59:59.000Z'),
  });

  // The route authorizes role `teacher` OR `admin`; mint the teacher token with
  // role exactly `teacher` (the role a Faculty user carries for this endpoint).
  teacherToken = (
    await authTokenService.generateTokenPair(teacher._id.toString(), 'teacher', 'Faculty')
  ).accessToken;
  studentToken = (
    await authTokenService.generateTokenPair(student._id.toString(), 'student', 'Student')
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

const ROUTE = '/api/faculty/me/quiz-analytics';

describe('Quiz analytics access & zeroed metrics (Task 10.5)', () => {
  // ─── 401: missing / invalid Bearer token (Req 11.9) ───────────────────────
  describe('Unauthenticated access is rejected with 401 before any handler (Req 11.9)', () => {
    it('rejects a request with no Bearer token with 401', async () => {
      const res = await request(app).get(ROUTE);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('rejects a malformed Bearer token with 401', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', 'Bearer not-a-real-jwt');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── 403: non-teacher role (Req 11.10) ────────────────────────────────────
  describe('Non-teacher access is rejected with 403 before any handler (Req 11.10)', () => {
    it('rejects a student token with 403', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('rejects a parent token with 403', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── 200: teacher with an assessment that has no submissions (Req 11.7) ────
  describe('Teacher with a submission-less assessment → 200 zeroed metrics (Req 11.7)', () => {
    it('returns 200 with a success envelope', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });

    it('returns zeroed aggregate metrics (totalAttempts 0, averageScorePercent 0)', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', `Bearer ${teacherToken}`);

      const { data } = res.body;
      expect(data.totalAttempts).toBe(0);
      expect(data.averageScorePercent).toBe(0);
    });

    it('returns a zeroed aggregate score distribution across every configured band', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', `Bearer ${teacherToken}`);

      const { scoreDistribution } = res.body.data;
      for (const band of SCORE_BANDS) {
        expect(scoreDistribution[band.label]).toBe(0);
      }
    });

    it('returns a zeroed aggregate completion-status map for every grading status', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', `Bearer ${teacherToken}`);

      const { completionStatus } = res.body.data;
      expect(completionStatus).toEqual({
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    });

    it('includes the submission-less assessment with zeroed per-assessment metrics', async () => {
      const res = await request(app)
        .get(ROUTE)
        .set('Authorization', `Bearer ${teacherToken}`);

      const { perAssessment } = res.body.data;
      expect(Array.isArray(perAssessment)).toBe(true);
      expect(perAssessment.length).toBe(1);

      const row = perAssessment[0];
      expect(row.totalAttempts).toBe(0);
      expect(row.averageScorePercent).toBe(0);
      for (const band of SCORE_BANDS) {
        expect(row.scoreDistribution[band.label]).toBe(0);
      }
      expect(row.completionStatus).toEqual({
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    });
  });
});
