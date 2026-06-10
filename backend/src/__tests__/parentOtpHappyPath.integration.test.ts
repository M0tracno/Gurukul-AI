/**
 * Parent OTP Login — Happy-Path Integration Test
 *
 * Feature: personalized-role-dashboards-and-verified-access (Task 10.5)
 *
 * Exercises the verified parent OTP flow end-to-end against a real Express app
 * wired with the actual auth routes, controller, middleware, services, and a
 * real in-memory MongoDB:
 *
 *   POST /api/auth/parent/otp/request  → 200 generic acknowledgement (Req 4.2)
 *   (recover challengeId from the persisted OtpChallenge; recover the OTP code
 *    from an in-memory SMS transport spy, since neither is returned to caller)
 *   POST /api/auth/parent/otp/verify   → 200 { accessToken, refreshToken, role } (Req 6.1)
 *   POST /api/auth/parent/otp/verify (replay same code) → 401 (single-use, Req 5.5)
 *
 * The OTP code is intentionally never returned to the caller, so this test
 * recovers it by mocking the SMS transport module with a capturing spy before
 * the application graph is imported.
 *
 * Validates: Requirements 4.2, 5.5, 6.1
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { type Express } from 'express';
import request from 'supertest';

// ─── Capturing SMS spy ───────────────────────────────────────────────────────
// The OTP code is delivered only via the SMS transport and never returned to
// the caller. Capture every outbound message body so the test can recover the
// 6-digit code for the verify step.
const capturedSms: Array<{ to: string; body: string }> = [];

// Mock the logger to avoid import.meta.url issues under ts-jest ESM and to keep
// test output quiet (mirrors the sibling integration suite).
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Replace the SMS transport with an in-memory spy. otpService binds to the
// singleton `smsService` at import time, so this mock must be registered before
// the application graph is dynamically imported below.
jest.unstable_mockModule('../services/smsService.js', () => {
  class CapturingSmsTransport {
    async send(toPhone: string, body: string): Promise<void> {
      capturedSms.push({ to: toPhone, body });
    }
  }
  const smsService = new CapturingSmsTransport();
  return {
    smsService,
    selectSmsTransport: () => smsService,
    ConsoleSmsTransport: CapturingSmsTransport,
    TwilioSmsTransport: CapturingSmsTransport,
  };
});

// ─── Dynamic imports (after mocks are registered) ────────────────────────────
const { globalErrorHandler, notFoundHandler } = await import('../middleware/errorHandler.js');
const { correlationIdMiddleware } = await import('../middleware/correlationId.js');
const { default: Student } = await import('../models/Student.js');
const { default: Parent } = await import('../models/Parent.js');
const { default: ParentStudentRelation } = await import('../models/ParentStudentRelation.js');
const { default: OtpChallenge } = await import('../models/OtpChallenge.js');
await import('../models/RefreshToken.js');
const { normalizePhone } = await import('../utils/phone.js');
const { default: authRoutes } = await import('../routes/authRoutes.js');

// ─── Fixtures ────────────────────────────────────────────────────────────────
const STUDENT_ID = 'STU-OTP-777';
// Submitted in a "messy" format on purpose to exercise normalization (Req 4.6).
const SUBMITTED_PHONE = '+1 (555) 987-6543';
const LINKAGE_PHONE = normalizePhone(SUBMITTED_PHONE);

let mongoServer: MongoMemoryServer;
let app: Express;

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());
  testApp.use(correlationIdMiddleware);
  testApp.use('/api/auth', authRoutes);
  testApp.use(notFoundHandler);
  testApp.use(globalErrorHandler);
  return testApp;
}

async function seedLinkage(): Promise<void> {
  const student = await Student.create({
    firstName: 'Meera',
    lastName: 'Verma',
    email: 'meera.otp@gurukul.edu',
    password: 'Student@2024',
    studentId: STUDENT_ID,
    grade: '9',
    active: true,
  });

  const parent = await Parent.create({
    parentId: 'PAR-OTP-777',
    firstName: 'Sunita',
    lastName: 'Verma',
    phoneNumber: '5559876543',
    email: 'sunita.otp@gurukul.edu',
    password: 'Parent@2024',
    relationToStudent: 'Mother',
    isActive: true,
    isVerified: true,
  });

  await ParentStudentRelation.create({
    parentId: parent._id,
    studentId: student._id,
    linkagePhone: LINKAGE_PHONE,
    isActive: true,
  });
}

/** Pull the 6-digit OTP out of the most recently captured SMS body. */
function extractOtpFromLatestSms(): string {
  expect(capturedSms.length).toBeGreaterThan(0);
  const latest = capturedSms[capturedSms.length - 1]!;
  const match = latest.body.match(/\b(\d{6})\b/);
  expect(match).not.toBeNull();
  return match![1]!;
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-for-parent-otp-happy-path';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = createTestApp();
  await seedLinkage();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

describe('Parent OTP login happy path (integration)', () => {
  it('completes request → verify → parent token pair using the console transport', async () => {
    // ── Step 1: request an OTP for a matching (studentId, phone) linkage ──────
    // Req 4.2: a matching pair creates an OTP_Challenge and dispatches an OTP.
    const requestRes = await request(app)
      .post('/api/auth/parent/otp/request')
      .send({ studentId: STUDENT_ID, phoneNumber: SUBMITTED_PHONE });

    expect(requestRes.status).toBe(200);
    expect(requestRes.body).toHaveProperty('success', true);
    // Anti-enumeration: only the generic acknowledgement is returned; no code,
    // no challengeId.
    expect(requestRes.body).not.toHaveProperty('data');
    expect(JSON.stringify(requestRes.body)).not.toMatch(/\d{6}/);

    // A challenge was persisted for the seeded linkage (Req 4.2). The caller
    // never receives the challengeId, so recover it from the database.
    const challenge = await OtpChallenge.findOne({ studentId: { $exists: true } })
      .sort({ createdAt: -1 })
      .exec();
    expect(challenge).not.toBeNull();
    const challengeId = String(challenge!._id);

    // An OTP was dispatched to the canonical linkage phone (Req 4.2).
    expect(capturedSms.length).toBe(1);
    expect(capturedSms[0]!.to).toBe(LINKAGE_PHONE);
    const otp = extractOtpFromLatestSms();

    // ── Step 2: verify the OTP → parent access/refresh token pair ─────────────
    // Req 6.1: a correct OTP issues a parent token pair.
    const verifyRes = await request(app)
      .post('/api/auth/parent/otp/verify')
      .send({ challengeId, otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body).toHaveProperty('success', true);
    expect(verifyRes.body.data).toHaveProperty('accessToken');
    expect(verifyRes.body.data).toHaveProperty('refreshToken');
    expect(verifyRes.body.data).toHaveProperty('role', 'parent');
    expect(typeof verifyRes.body.data.accessToken).toBe('string');
    expect(verifyRes.body.data.accessToken.length).toBeGreaterThan(0);
    expect(typeof verifyRes.body.data.refreshToken).toBe('string');
    expect(verifyRes.body.data.refreshToken.length).toBeGreaterThan(0);

    // ── Step 3: replay the same code → rejected (single-use, Req 5.5) ─────────
    const replayRes = await request(app)
      .post('/api/auth/parent/otp/verify')
      .send({ challengeId, otp });

    expect(replayRes.status).toBe(401);
    expect(replayRes.body).toHaveProperty('success', false);
    expect(JSON.stringify(replayRes.body)).not.toMatch(/accessToken/);

    // The challenge is marked consumed in the database (single-use, Req 5.5).
    const consumed = await OtpChallenge.findById(challengeId).exec();
    expect(consumed).not.toBeNull();
    expect(consumed!.consumedAt).toBeTruthy();
  });
});
