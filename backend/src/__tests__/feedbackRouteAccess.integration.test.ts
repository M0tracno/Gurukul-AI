/**
 * Feedback Routes — Auth, RBAC, Rate-Limit & Pipeline-Order Integration Tests
 *
 * Feature: communication-feedback-and-admin-apis (Task 7.3)
 *
 * Exercises the real route pipeline for the feedback router
 * (`src/routes/feedbackRoutes.ts`) mounted at `/api/feedback`, exactly as in
 * `server.ts`. Routes under test:
 *
 *   POST   /api/feedback                     (student/parent)  write-limited
 *   GET    /api/feedback/me                  (student/parent)
 *   GET    /api/feedback/received            (teacher)
 *   POST   /api/feedback/:feedbackId/replies (teacher)         write-limited
 *   POST   /api/feedback/requests            (teacher)         write-limited
 *
 * Pipeline order on the write routes is
 *   `writeRateLimit → authMiddleware → requireRoles → validateRequest → controller`,
 * and on the read routes `authMiddleware → requireRoles → controller`.
 *
 * Access matrix asserted here:
 *   - Missing/invalid Bearer token → 401 before any business logic
 *       (Req 6.6 POST /, 7.6 GET /me, 8.6 GET /received, 9.7 POST replies/requests)
 *   - Wrong role per route → 403
 *       (Req 6.7 teacher→POST /, 7.7 teacher→GET /me,
 *        8.7/8.8 student|parent→GET /received,
 *        9.x student|parent→POST replies/requests)
 *   - Exceeding the write rate limit on a POST → 429 with a failure Envelope
 *       (Req 6.5, 9.6)
 *   - Pipeline ordering (Req 12.1): a valid (student) token with an invalid
 *     body on POST / is rejected by `validateRequest` with 400 (auth + rbac ran
 *     first), while a missing token short-circuits with 401 before validation.
 *
 * The app under test is assembled in-process by mounting the real router onto a
 * bare Express app (mirroring the repo's existing integration tests) and
 * driving it with supertest. `server.ts` is never imported because it
 * self-starts (connectDB / listen) on import. A `mongodb-memory-server` backs
 * `authTokenService.generateTokenPair`, which persists a RefreshToken on mint.
 *
 * Validates: Requirements 6.5, 6.6, 6.7, 7.6, 7.7, 8.6, 8.7, 8.8, 9.6, 9.7, 12.1, 12.8
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

// RefreshToken is persisted by generateTokenPair; register it on the connection.
await import('../models/RefreshToken.js');

const { authTokenService } = await import('../services/authTokenService.js');

const { default: feedbackRoutes } = await import('../routes/feedbackRoutes.js');

// ─── Test App Setup ──────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;
let app: Express;

let studentToken: string;
let parentToken: string;
let teacherToken: string;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());

  // Mount the real feedback router at the production path.
  testApp.use('/api/feedback', feedbackRoutes);

  testApp.use(notFoundHandler);
  testApp.use(globalErrorHandler);

  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Required for JWT signing/validation inside authTokenService + authMiddleware.
  process.env.JWT_SECRET = 'test-secret-for-feedback-route-access';

  app = createTestApp();

  // Tokens carry only a synthetic userId + role; authMiddleware validates the
  // JWT without a DB lookup, and the 401/403/400 paths under test never reach
  // the controller/service, so no real Feedback target records are needed.
  studentToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'student',
      'Student',
    )
  ).accessToken;
  parentToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'parent',
      'Parent',
    )
  ).accessToken;
  teacherToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'teacher',
      'Faculty',
    )
  ).accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_SUBMIT_BODY = {
  targetType: 'teacher',
  targetId: 'some-teacher-id',
  rating: 5,
  comment: 'Great teacher',
};

// A body the submit schema must reject: rating far outside [RATING_MIN, RATING_MAX]
// and a missing required targetId.
const INVALID_SUBMIT_BODY = { rating: 99 };

const REPLY_ID = 'feedback-123';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Feedback routes — auth, RBAC, rate limiting & pipeline order (Task 7.3)', () => {
  // ─── 401: missing Bearer token per route (Req 6.6, 7.6, 8.6, 9.7) ──────────
  describe('Unauthenticated requests are rejected with 401 before any handler', () => {
    it('POST /api/feedback with no token → 401 (Req 6.6)', async () => {
      const res = await request(app).post('/api/feedback').send(VALID_SUBMIT_BODY);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    it('GET /api/feedback/me with no token → 401 (Req 7.6)', async () => {
      const res = await request(app).get('/api/feedback/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('GET /api/feedback/received with no token → 401 (Req 8.6)', async () => {
      const res = await request(app).get('/api/feedback/received');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /api/feedback/:feedbackId/replies with no token → 401 (Req 9.7)', async () => {
      const res = await request(app)
        .post(`/api/feedback/${REPLY_ID}/replies`)
        .send({ message: 'thanks' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /api/feedback/requests with no token → 401 (Req 9.7)', async () => {
      const res = await request(app).post('/api/feedback/requests').send({});

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('rejects a malformed Bearer token with 401 on POST /api/feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', 'Bearer not-a-real-jwt')
        .send(VALID_SUBMIT_BODY);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── 403: wrong role per route (Req 6.7, 7.7, 8.7, 8.8, 9.x) ───────────────
  describe('Requests with the wrong role are rejected with 403', () => {
    it('teacher → POST /api/feedback → 403 (Req 6.7: submit is student/parent only)', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(VALID_SUBMIT_BODY);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('teacher → GET /api/feedback/me → 403 (Req 7.7: own-feedback is student/parent only)', async () => {
      const res = await request(app)
        .get('/api/feedback/me')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('student → GET /api/feedback/received → 403 (Req 8.7/8.8: received is teacher only)', async () => {
      const res = await request(app)
        .get('/api/feedback/received')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('parent → GET /api/feedback/received → 403 (Req 8.7/8.8: received is teacher only)', async () => {
      const res = await request(app)
        .get('/api/feedback/received')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('student → POST /api/feedback/:id/replies → 403 (reply is teacher only)', async () => {
      const res = await request(app)
        .post(`/api/feedback/${REPLY_ID}/replies`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ message: 'thanks' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('parent → POST /api/feedback/:id/replies → 403 (reply is teacher only)', async () => {
      const res = await request(app)
        .post(`/api/feedback/${REPLY_ID}/replies`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ message: 'thanks' });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('student → POST /api/feedback/requests → 403 (request is teacher only)', async () => {
      const res = await request(app)
        .post('/api/feedback/requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('parent → POST /api/feedback/requests → 403 (request is teacher only)', async () => {
      const res = await request(app)
        .post('/api/feedback/requests')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── Pipeline order: auth/rbac precede validation (Req 12.1) ───────────────
  describe('Pipeline order — auth → rbac → validate → controller (Req 12.1)', () => {
    it('valid (student) token + invalid body on POST /api/feedback → 400 from validateRequest', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(INVALID_SUBMIT_BODY);

      // Auth (200-eligible) + RBAC (student allowed) both passed, so the
      // request reached validateRequest, which rejects the malformed body.
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('missing token + invalid body on POST /api/feedback → 401 before validation runs', async () => {
      const res = await request(app).post('/api/feedback').send(INVALID_SUBMIT_BODY);

      // Despite the body also being invalid, auth runs before validation, so
      // the response is 401 (not 400) — proving auth precedes validateRequest.
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── 429: exceeding the write rate limit on a POST (Req 6.5, 9.6, 12.8) ────
  //
  // The production `writeRateLimit` (60 req / 15 min, keyed by source IP) runs
  // ahead of auth on every write route, so unauthenticated POSTs still count
  // toward the limit. This block is intentionally LAST so its burst does not
  // exhaust the shared limiter budget for the preceding access-matrix tests
  // (which issue only a handful of POSTs, well under 60). Sending a burst that
  // comfortably exceeds 60 total requests guarantees the limiter trips,
  // regardless of how much budget the earlier tests already consumed.
  describe('Exceeding the write rate limit returns 429 with a failure Envelope', () => {
    it('a burst of POST /api/feedback eventually returns 429 (Req 6.5, 9.6, 12.8)', async () => {
      let rateLimited = false;
      let rateLimitedBody: unknown;

      // Up to 70 attempts; break as soon as the limiter trips. No token is
      // sent because the limiter precedes auth and counts every request.
      for (let i = 0; i < 70; i += 1) {
        const res = await request(app).post('/api/feedback').send(VALID_SUBMIT_BODY);
        if (res.status === 429) {
          rateLimited = true;
          rateLimitedBody = res.body;
          break;
        }
      }

      expect(rateLimited).toBe(true);
      expect(rateLimitedBody).toHaveProperty('success', false);
      expect(typeof (rateLimitedBody as { message?: unknown }).message).toBe('string');
    });
  });
});
