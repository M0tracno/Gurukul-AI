/**
 * Property-Based Tests: Only the most recently issued OTP is valid per linkage.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 15: Only the most recently issued OTP is valid per linkage
 *
 * Property 15: When a new OTP is issued for a linkage, the service invalidates
 * any prior unconsumed challenge for that linkage before creating the new one
 * (Req 5.6). Therefore, after a re-issue, the previously delivered code can no
 * longer be verified against its (now invalidated) challenge, and only the most
 * recently issued code verifies successfully.
 *
 * Strategy per run:
 *  1. Seed a Student + Parent + active ParentStudentRelation.
 *  2. request() once → capture OTP1 (from the SMS body) and challenge1's id.
 *  3. Push challenge1.lastSentAt into the past so the 60s resend throttle does
 *     not suppress the re-issue.
 *  4. request() again → capture OTP2 and challenge2's id (a distinct challenge).
 *  5. Assert verifying OTP1 against challenge1's id now REJECTS with 401 (it was
 *     invalidated, Req 5.6), and verifying OTP2 against challenge2's id SUCCEEDS
 *     (returns an access/refresh token pair).
 *
 * **Validates: Requirements 5.6**
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

// In-memory audit sink: this property is about challenge validity, not audit
// content, so we simply absorb emitted events without assertion.
const auditSink = {
  events: [] as any[],
  async logEvent(event: any): Promise<void> {
    this.events.push(event);
  },
};

// In-memory SMS transport spy: the generated OTP only ever appears in the SMS
// body, so capturing each dispatched body is the only way to recover it.
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

let otpService: OtpService;

beforeAll(async () => {
  // A successful verify() issues a parent token pair via authTokenService,
  // which signs a JWT and therefore requires JWT_SECRET to be set.
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-otp-latest-only-property';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Real authTokenService (so verify issues a genuine token pair); injected SMS
  // spy and audit sink.
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
// Property 15 — latest-OTP-only validity
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 15: Only the most recently issued OTP is valid per linkage
describe('Property 15: Only the most recently issued OTP is valid per linkage', () => {
  it(
    're-issuing a code invalidates the prior unconsumed challenge so only the latest OTP verifies',
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

            const ctx = { ip, correlationId };

            // --- First issuance: capture OTP1 + challenge1 id ---
            await otpService.request(studentIdField, rawPhone, ctx);
            expect(smsSpy.sent).toHaveLength(1);
            const otp1 = extractOtp(smsSpy.sent[0]!.body);

            const challenge1 = await OtpChallenge.findOne({ relationId: relation._id }).exec();
            expect(challenge1).not.toBeNull();
            const challenge1Id = String(challenge1!._id);

            // Bypass the 60s resend throttle by pushing challenge1's lastSentAt
            // past the resend interval so the next request re-issues.
            await OtpChallenge.updateOne(
              { _id: challenge1!._id },
              { $set: { lastSentAt: new Date(Date.now() - 61_000) } },
            );

            // --- Re-issuance: capture OTP2 + challenge2 id ---
            await otpService.request(studentIdField, rawPhone, ctx);
            expect(smsSpy.sent).toHaveLength(2);
            const otp2 = extractOtp(smsSpy.sent[1]!.body);

            // The latest challenge must be a NEW, distinct document.
            const challenge2 = await OtpChallenge.findOne({ relationId: relation._id })
              .sort({ lastSentAt: -1 })
              .exec();
            expect(challenge2).not.toBeNull();
            const challenge2Id = String(challenge2!._id);
            expect(challenge2Id).not.toBe(challenge1Id);

            // --- Assert: the prior challenge no longer verifies (Req 5.6) ---
            // Verifying OTP1 against challenge1's id must reject with a 401,
            // because re-issuance invalidated (consumed + expired) challenge1.
            // (A random OTP1 === OTP2 collision does not affect this assertion,
            // since it is keyed on challenge1's id, which was invalidated.)
            await expect(otpService.verify(challenge1Id, otp1, ctx)).rejects.toMatchObject({
              statusCode: 401,
            });

            // --- Assert: only the latest OTP succeeds ---
            // Verifying OTP2 against challenge2's id must succeed and return a
            // token pair.
            const tokenPair = await otpService.verify(challenge2Id, otp2, ctx);
            expect(tokenPair).toBeDefined();
            expect(typeof tokenPair.accessToken).toBe('string');
            expect(tokenPair.accessToken.length).toBeGreaterThan(0);
            expect(typeof tokenPair.refreshToken).toBe('string');
            expect(tokenPair.refreshToken.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
