/**
 * Messaging Auth, RBAC & Rate-Limiting Integration Tests
 *
 * Feature: communication-feedback-and-admin-apis (Task 4.3)
 *
 * Exercises the real `messageRoutes` pipeline mounted at `/api/messages`,
 * exactly as in `server.ts`:
 *   GET    /conversations                  authMiddleware → requireRoles('teacher','parent') → validate → controller
 *   GET    /conversations/:conversationId  authMiddleware → requireRoles('teacher','parent') → validate → controller
 *   POST   /                               writeRateLimit → authMiddleware → requireRoles → validate → controller
 *   PATCH  /:messageId/read                authMiddleware → requireRoles → validate → controller
 *   DELETE /:messageId                     writeRateLimit → authMiddleware → requireRoles → validate → controller
 *
 * Assertions:
 *   - Every route rejects a request with no Bearer token with HTTP 401 before
 *     any business logic (Req 1.5, 2.5, 3.8, 4.7, 5.8).
 *   - A disallowed role (student) is rejected with HTTP 403 on the read-list
 *     and send routes (Req 1.6, 3.9).
 *   - Exceeding the write rate limit yields HTTP 429 on the write routes
 *     (POST / and DELETE /:messageId), and the under-limit requests fall
 *     through to auth — proving the limiter is the earliest gate, order
 *     Rate_Limiter → auth (Req 3.7, 5.7, 12.8).
 *   - DELETE failure-ordering: with no token the 401 precedes existence /
 *     ownership checks even for a non-existent message id (Req 5.9).
 *   - Pipeline order: a valid token with an invalid body on POST returns 400
 *     from validateRequest (auth + rbac already passed); a missing token with
 *     an invalid body returns 401 before validation runs (Req 12.1).
 *
 * The app under test is assembled in-process by mounting the real router onto a
 * bare Express app (mirroring the repo's existing integration tests) and
 * driving it with supertest against an isolated `mongodb-memory-server`.
 * `server.ts` is never imported because it self-starts (connectDB / listen) on
 * import.
 *
 * NOTE on rate limiting: `writeRateLimit` is a single limiter instance keyed by
 * source IP and shared by BOTH POST / and DELETE /:messageId, so its counter is
 * shared across those routes within a window. The flood test is therefore
 * defined LAST so the saturated counter cannot interfere with the auth/rbac/
 * pipeline assertions above it.
 *
 * Validates: Requirements 1.5, 1.6, 2.5, 3.7, 3.8, 3.9, 4.7, 5.7, 5.8, 5.9, 12.1, 12.8
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

// `authTokenService.generateTokenPair` persists a RefreshToken, so the model
// must be registered. authMiddleware itself does NOT load the user record (it
// only validates the token and attaches `{ userId, role }`), so synthetic ids
// are sufficient for the auth/rbac/rate-limit assertions in this suite.
await import('../models/RefreshToken.js');

const { authTokenService } = await import('../services/authTokenService.js');

const { default: messageRoutes } = await import('../routes/messageRoutes.js');

// ─── Test App Setup ──────────────────────────────────────────────────────────

let mongoServer: MongoMemoryServer;
let app: Express;

let teacherToken: string;
let parentToken: string;
let studentToken: string;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());

  // Mount the real router at the same path the production server uses.
  testApp.use('/api/messages', messageRoutes);

  testApp.use(notFoundHandler);
  testApp.use(globalErrorHandler);

  return testApp;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Required for JWT signing/validation inside authTokenService + authMiddleware.
  process.env.JWT_SECRET = 'test-secret-for-messaging-route-access';

  app = createTestApp();

  // authMiddleware never looks the user up, so synthetic ids carrying the
  // right role claim are all that is needed to drive RBAC outcomes.
  teacherToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'teacher',
      'Faculty',
    )
  ).accessToken;
  parentToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'parent',
      'Parent',
    )
  ).accessToken;
  studentToken = (
    await authTokenService.generateTokenPair(
      new mongoose.Types.ObjectId().toString(),
      'student',
      'Student',
    )
  ).accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

const sampleId = new mongoose.Types.ObjectId().toString();

describe('Messaging route auth, RBAC & rate limiting (Task 4.3)', () => {
  // ─── 401: missing Bearer token on every route ─────────────────────────────
  // (Req 1.5, 2.5, 3.8, 4.7, 5.8)
  describe('Unauthenticated requests are rejected with 401 before any handler', () => {
    it('GET /conversations with no token → 401 (Req 1.5)', async () => {
      const res = await request(app).get('/api/messages/conversations');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    it('GET /conversations/:conversationId with no token → 401 (Req 2.5)', async () => {
      const res = await request(app).get('/api/messages/conversations/conv-abc-123');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST / with no token → 401 (Req 3.8)', async () => {
      const res = await request(app).post('/api/messages').send({
        subject: 'Hi',
        content: 'Hello there',
        recipientId: sampleId,
        recipientModel: 'Faculty',
        studentId: sampleId,
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('PATCH /:messageId/read with no token → 401 (Req 4.7)', async () => {
      const res = await request(app).patch(`/api/messages/${sampleId}/read`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('DELETE /:messageId with no token → 401 (Req 5.8)', async () => {
      const res = await request(app).delete(`/api/messages/${sampleId}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('rejects a malformed Bearer token with 401 on a read route', async () => {
      const res = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', 'Bearer not-a-real-jwt');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── 403: disallowed role (student) ───────────────────────────────────────
  // (Req 1.6, 3.9)
  describe('A disallowed role (student) is rejected with 403 after auth', () => {
    it('GET /conversations with a student token → 403 (Req 1.6)', async () => {
      const res = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST / with a student token → 403 (Req 3.9)', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          subject: 'Hi',
          content: 'Hello there',
          recipientId: sampleId,
          recipientModel: 'Faculty',
          studentId: sampleId,
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('GET /conversations/:conversationId with a student token → 403 (Req 1.6)', async () => {
      const res = await request(app)
        .get('/api/messages/conversations/conv-abc-123')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── DELETE failure-ordering: auth precedes existence/ownership ───────────
  // (Req 5.9)
  describe('DELETE failure-ordering (Req 5.9)', () => {
    it('returns 401 (not 404/403) for a non-existent message id when the token is missing', async () => {
      // A random, non-existent message id with NO token must surface the
      // earliest failing gate — authentication (401) — rather than an
      // existence (404) or ownership (403) outcome from deeper in the pipeline.
      const missingId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/messages/${missingId}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── Pipeline order: auth → rbac → validate → controller ──────────────────
  // (Req 12.1)
  describe('Pipeline order auth → rbac → validate (Req 12.1)', () => {
    it('valid token + invalid body on POST → 400 from validateRequest (auth + rbac already passed)', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({}); // missing required subject/content/recipient/student fields

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      // validateRequest returns field-level details — proof validation ran.
      expect(Array.isArray(res.body.details)).toBe(true);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('missing token + invalid body on POST → 401 before validation runs', async () => {
      const res = await request(app).post('/api/messages').send({}); // invalid body too

      // Auth fails first: a 401 (not a 400 validation error) proves
      // authentication precedes validation in the pipeline.
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ─── Write rate limiting → 429 (defined LAST: it saturates the shared
  //     write limiter counter) ───────────────────────────────────────────────
  // (Req 3.7, 5.7, 12.8)
  describe('Write rate limiting → 429 (Req 3.7, 5.7, 12.8)', () => {
    it('POST / eventually returns 429 once the write limit is exceeded; under-limit requests fall through to auth (Req 3.7, 12.8)', async () => {
      // The write limiter is mounted AHEAD of authMiddleware on POST /, so a
      // burst of unauthenticated requests is gated by the limiter first: while
      // under the limit each request falls through to auth and is rejected with
      // 401; once the per-IP write limit is exceeded the limiter short-circuits
      // with 429 before auth runs — proving the order Rate_Limiter → auth.
      // The cap comfortably exceeds the configured window limit (60) even
      // accounting for the handful of write requests issued by earlier tests.
      const MAX_ATTEMPTS = 120;
      let saw429 = false;
      let limited: request.Response | undefined;

      for (let i = 0; i < MAX_ATTEMPTS && !saw429; i += 1) {
        const res = await request(app).post('/api/messages').send({});
        if (res.status === 429) {
          saw429 = true;
          limited = res;
        } else {
          // Under the limit, the limiter passes the request to auth, which
          // rejects the token-less request with 401 (Rate_Limiter → auth).
          expect(res.status).toBe(401);
        }
      }

      expect(saw429).toBe(true);
      expect(limited?.body).toHaveProperty('success', false);
      expect(String(limited?.body.message)).toMatch(/too many requests/i);
    });

    it('DELETE /:messageId returns 429 once the shared write limit is exceeded (Req 5.7)', async () => {
      // The previous test saturated the shared, IP-keyed write limiter that
      // also guards DELETE /:messageId, so a single delete now short-circuits
      // with 429 before auth — confirming the limiter applies to DELETE too.
      const res = await request(app).delete(`/api/messages/${sampleId}`);

      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('success', false);
      expect(String(res.body.message)).toMatch(/too many requests/i);
    });
  });
});
