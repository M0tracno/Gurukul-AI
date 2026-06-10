/**
 * Property-Based Tests: Correct OTP is single-use.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 14: Correct OTP is single-use
 *
 * Property 14: A correct OTP can be redeemed exactly once. The first
 * verification of the correct code consumes the challenge (sets `consumedAt`)
 * and issues a parent token pair (Req 6.1); any subsequent submission of the
 * SAME code against the now-consumed challenge is rejected with a 401 and
 * issues no further tokens (single-use, Req 5.5).
 *
 * **Validates: Requirements 5.5, 6.1**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { OtpService } from './otpService.js';
import { authTokenService } from './authTokenService.js';
import { auditService, type IAuditService } from './auditService.js';
import type { ISmsTransport } from './smsService.js';
import OtpChallenge from '../models/OtpChallenge.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import RefreshToken from '../models/RefreshToken.js';
import { normalizePhone } from '../utils/phone.js';

// ---------------------------------------------------------------------------
// MongoDB memory server + env setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// In-memory audit sink: verification audits the successful login, so swallow
// the emitted events without asserting on them (covered by Property 21).
const auditSink = {
  events: [] as unknown[],
  async logEvent(event: unknown): Promise<void> {
    this.events.push(event);
  },
};

// In-memory SMS transport spy: captures the dispatched message so the test can
// recover the correct OTP from the body (the only place the plaintext appears).
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

let otpService: OtpService;

beforeAll(async () => {
  // OTP verification issues a parent token pair via authTokenService, which
  // signs a JWT and therefore requires JWT_SECRET to be set.
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-otp-single-use-property';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Use the real authTokenService so token issuance is genuine (persists a
  // refresh-token hash and signs a real JWT).
  otpService = new OtpService(
    smsSpy as ISmsTransport,
    authTokenService,
    auditSink as unknown as IAuditService,
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
  auditSink.events.length = 0;
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

// ---------------------------------------------------------------------------
// Property 14 — Correct OTP is single-use
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 14: Correct OTP is single-use
describe('Property 14: Correct OTP is single-use', () => {
  it(
    'consumes the challenge and issues a token pair on the first correct verify, then rejects any replay of the same code with 401',
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
            auditSink.events.length = 0;
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

            // A real Parent doc is required so generateTokenPair can load it.
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

            // Request the OTP for a matched linkage and recover the correct code.
            await otpService.request(studentIdField, rawPhone, { ip, correlationId });
            expect(smsSpy.sent).toHaveLength(1);
            const code = extractOtp(smsSpy.sent[0]!.body);

            const challenge = await OtpChallenge.findOne({ relationId: relation._id }).exec();
            expect(challenge).not.toBeNull();
            const challengeId = String(challenge!._id);
            // Precondition: the challenge starts unconsumed.
            expect(challenge!.consumedAt).toBeFalsy();

            // --- First verify: correct code consumes the challenge and issues
            // a parent token pair (Req 6.1). ---
            const tokenPair = await otpService.verify(challengeId, code, { ip, correlationId });
            expect(tokenPair).toBeDefined();
            expect(typeof tokenPair.accessToken).toBe('string');
            expect(tokenPair.accessToken.length).toBeGreaterThan(0);
            expect(typeof tokenPair.refreshToken).toBe('string');
            expect(tokenPair.refreshToken.length).toBeGreaterThan(0);

            // The persisted challenge is now single-use consumed (Req 5.5).
            const consumed = await OtpChallenge.findById(challengeId).exec();
            expect(consumed).not.toBeNull();
            expect(consumed!.consumedAt).toBeTruthy();

            // --- Replay: the SAME code against the now-consumed challenge is
            // rejected with a 401 and issues no further tokens (Req 5.5). ---
            const tokensBeforeReplay = await RefreshToken.countDocuments({}).exec();

            await expect(
              otpService.verify(challengeId, code, { ip, correlationId }),
            ).rejects.toMatchObject({ statusCode: 401 });

            // No additional refresh token was issued by the rejected replay.
            const tokensAfterReplay = await RefreshToken.countDocuments({}).exec();
            expect(tokensAfterReplay).toBe(tokensBeforeReplay);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
