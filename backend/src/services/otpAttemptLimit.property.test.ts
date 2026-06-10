/**
 * Property-Based Tests: OTP attempt limiting and invalidation.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 16: Incorrect submissions increment attempts, leak no count, and invalidate at the limit
 *
 * Property 16: Every incorrect OTP submission increments the challenge's
 * persisted `attempts` counter and rejects with a CONSTANT generic 401 body
 * that reveals no remaining-attempts count; once `attempts` reaches
 * `getMaxAttempts()` the challenge is invalidated (consumed) so that even the
 * correct code is subsequently rejected until a new code is requested.
 *
 *  - Each wrong submission rejects with the SAME constant message
 *    'Invalid or expired verification code.' (statusCode 401) — no attempt
 *    count is leaked across submissions (Req 6.2).
 *  - Each wrong submission increments the persisted `attempts` by exactly 1
 *    (Req 6.2).
 *  - At the limit the challenge is invalidated such that even the correct code
 *    is rejected with the same 401 and NO token pair is issued, until a new
 *    code is requested (Req 6.3).
 *
 * **Validates: Requirements 6.2, 6.3**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { OtpService, getMaxAttempts } from './otpService.js';
import { authTokenService } from './authTokenService.js';
import { auditService, type IAuditService } from './auditService.js';
import type { ISmsTransport } from './smsService.js';
import OtpChallenge from '../models/OtpChallenge.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import RefreshToken from '../models/RefreshToken.js';
import { AppError } from '../middleware/errorHandler.js';
import { normalizePhone } from '../utils/phone.js';

// ---------------------------------------------------------------------------
// MongoDB memory server + env setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// In-memory audit spy: swallows events so a successful verification path (none
// is expected here) cannot throw on a missing audit sink.
const auditSpy = {
  events: [] as any[],
  async logEvent(event: any): Promise<void> {
    this.events.push(event);
  },
};

// In-memory SMS transport spy: captures the dispatched message so the test can
// recover the correct OTP from the body.
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

let otpService: OtpService;

beforeAll(async () => {
  // verify() issues a parent token pair via authTokenService (only on the
  // success path), which signs a JWT and therefore requires JWT_SECRET.
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-otp-attempt-limit-property';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  otpService = new OtpService(
    smsSpy as ISmsTransport,
    authTokenService,
    auditSpy as unknown as IAuditService,
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.JWT_SECRET;
});

beforeEach(async () => {
  await Promise.all([
    Student.deleteMany({}),
    Parent.deleteMany({}),
    ParentStudentRelation.deleteMany({}),
    OtpChallenge.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);
  auditSpy.events.length = 0;
  smsSpy.sent.length = 0;
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Human-readable student identifier (e.g. "ABC1234"). */
const studentIdArb = fc.stringMatching(/^[A-Z]{3}[0-9]{4}$/);

/** Significant phone digits: 8–13 digits with a non-zero leading digit. */
const digitsArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 1, max: 9 }),
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 7, maxLength: 12 }),
  )
  .map(([head, rest]) => `${head}${rest.join('')}`);

/** A dotted-quad IPv4 string. */
const ipArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 4, maxLength: 4 })
  .map((octets) => octets.join('.'));

/** A correlation id (UUID-shaped). */
const correlationIdArb = fc.uuid();

/** Extract the 6-digit OTP from the SMS body produced by the OTP service. */
function extractOtp(body: string): string {
  const match = body.match(/verification code is (\d{6})/);
  if (!match) {
    throw new Error(`Could not extract OTP from SMS body: ${body}`);
  }
  return match[1]!;
}

/**
 * Produce a 6-digit string guaranteed to differ from `correct`. We add one
 * (mod 1_000_000) and re-pad so the candidate is always a valid 6-digit code
 * yet never equal to the correct OTP.
 */
function guaranteedWrongCode(correct: string): string {
  const next = (Number(correct) + 1) % 1_000_000;
  const candidate = next.toString().padStart(6, '0');
  return candidate;
}

// ---------------------------------------------------------------------------
// Property 16 — attempt limiting + invalidation
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 16: Incorrect submissions increment attempts, leak no count, and invalidate at the limit
describe('Property 16: Incorrect submissions increment attempts, leak no count, and invalidate at the limit', () => {
  it(
    'increments attempts and returns a constant 401 on each wrong submission, then invalidates so the correct code is rejected at the limit',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          studentIdArb,
          digitsArb,
          ipArb,
          correlationIdArb,
          async (studentIdField, digits, ip, correlationId) => {
            // Isolate each run so prior records/spies do not interfere.
            await Promise.all([
              Student.deleteMany({}),
              Parent.deleteMany({}),
              ParentStudentRelation.deleteMany({}),
              OtpChallenge.deleteMany({}),
              RefreshToken.deleteMany({}),
            ]);
            auditSpy.events.length = 0;
            smsSpy.sent.length = 0;

            const rawPhone = `+${digits}`;
            const normalizedPhone = normalizePhone(rawPhone);

            const studentObjectId = new mongoose.Types.ObjectId();
            const parentObjectId = new mongoose.Types.ObjectId();

            // Insert via the native driver to bypass the password-hashing save
            // hook (bcrypt) — identity is all this property needs, and this
            // keeps 100 runs well within the test budget.
            await Student.collection.insertOne({
              _id: studentObjectId,
              firstName: 'Test',
              lastName: 'Student',
              email: `${studentIdField.toLowerCase()}@example.com`,
              password: 'placeholder',
              studentId: studentIdField,
              grade: '10',
              active: true,
              isDemo: false,
              failedLoginAttempts: 0,
              createdAt: new Date(),
            });

            await Parent.collection.insertOne({
              _id: parentObjectId,
              parentId: `P-${studentIdField}`,
              firstName: 'Test',
              lastName: 'Parent',
              relationToStudent: 'Other',
              isActive: true,
              isVerified: false,
              isDemo: false,
              failedLoginAttempts: 0,
            });

            const relation = await ParentStudentRelation.create({
              parentId: parentObjectId,
              studentId: studentObjectId,
              linkagePhone: normalizedPhone,
              isActive: true,
            });

            // Request a challenge and capture the correct OTP + challenge id.
            await otpService.request(studentIdField, rawPhone, { ip, correlationId });
            expect(smsSpy.sent).toHaveLength(1);
            const correctOtp = extractOtp(smsSpy.sent[0]!.body);

            const challenge = await OtpChallenge.findOne({ relationId: relation._id }).exec();
            expect(challenge).not.toBeNull();
            const challengeId = String(challenge!._id);

            const wrongCode = guaranteedWrongCode(correctOtp);
            expect(wrongCode).not.toBe(correctOtp);

            const maxAttempts = getMaxAttempts();

            // The constant rejection message that must be identical across every
            // failure path — captured once, asserted equal on every submission.
            const CONSTANT_MESSAGE = 'Invalid or expired verification code.';
            const messages: string[] = [];

            // Submit `maxAttempts` WRONG codes. Each must reject with the same
            // constant 401 body and increment the persisted attempts by 1.
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              let thrown: unknown;
              try {
                await otpService.verify(challengeId, wrongCode, { ip, correlationId });
              } catch (err) {
                thrown = err;
              }

              // Rejected with an AppError carrying a 401 status.
              expect(thrown).toBeInstanceOf(AppError);
              const appErr = thrown as AppError;
              expect(appErr.statusCode).toBe(401);

              // The message is the SAME constant string every time — no attempt
              // count or remaining-attempts hint is leaked (Req 6.2).
              expect(appErr.message).toBe(CONSTANT_MESSAGE);
              messages.push(appErr.message);

              // The persisted attempts counter incremented by exactly 1.
              const persisted = await OtpChallenge.findById(challengeId).exec();
              expect(persisted).not.toBeNull();
              expect(persisted!.attempts).toBe(attempt);
            }

            // Every captured failure message is byte-for-byte identical: the
            // body never varies with the attempt number (Req 6.2).
            expect(new Set(messages).size).toBe(1);
            expect(messages.every((m) => m === CONSTANT_MESSAGE)).toBe(true);

            // After reaching the limit the challenge is invalidated (consumed),
            // so even the CORRECT code is rejected with the same 401 and no
            // token pair is issued (Req 6.3).
            const invalidated = await OtpChallenge.findById(challengeId).exec();
            expect(invalidated!.consumedAt).toBeTruthy();

            const sessionsBefore = await RefreshToken.countDocuments({}).exec();

            let correctThrown: unknown;
            let correctResult: unknown;
            try {
              correctResult = await otpService.verify(challengeId, correctOtp, { ip, correlationId });
            } catch (err) {
              correctThrown = err;
            }

            // The correct code STILL rejects with the constant 401 body.
            expect(correctResult).toBeUndefined();
            expect(correctThrown).toBeInstanceOf(AppError);
            const correctErr = correctThrown as AppError;
            expect(correctErr.statusCode).toBe(401);
            expect(correctErr.message).toBe(CONSTANT_MESSAGE);

            // No token pair was issued: no new refresh-token session persisted.
            const sessionsAfter = await RefreshToken.countDocuments({}).exec();
            expect(sessionsAfter).toBe(sessionsBefore);

            // No successful login was audited.
            expect(auditSpy.events.find((e) => e.action === 'parent_otp_login')).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    },
    240_000,
  );
});
