/**
 * Property-Based Tests: OTP request responses are indistinguishable between
 * match and non-match (anti-enumeration).
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 9: OTP request responses are indistinguishable between match and non-match
 *
 * Property 9: For any OTP request, the response body for a non-matching
 * `(studentId, phone)` pair is identical to that for a matching pair, no
 * challenge is created and no SMS is sent on a non-match, and no caller-visible
 * channel reveals whether the student, phone, or linkage exists.
 *
 * **Validates: Requirements 4.3, 4.4**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { OtpService } from './otpService.js';
import { authTokenService } from './authTokenService.js';
import { type IAuditService } from './auditService.js';
import type { ISmsTransport } from './smsService.js';
import OtpChallenge from '../models/OtpChallenge.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import { normalizePhone } from '../utils/phone.js';

// ---------------------------------------------------------------------------
// MongoDB memory server + spies
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// In-memory audit sink: swallow events so audit writes never affect the
// caller-visible acknowledgement under test.
const auditSpy = {
  events: [] as any[],
  async logEvent(event: any): Promise<void> {
    this.events.push(event);
  },
};

// In-memory SMS transport spy: records every dispatched message so the test can
// assert that a non-match sends zero SMS while a match sends exactly one.
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

let otpService: OtpService;

beforeAll(async () => {
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
});

beforeEach(async () => {
  await Promise.all([
    Student.deleteMany({}),
    Parent.deleteMany({}),
    ParentStudentRelation.deleteMany({}),
    OtpChallenge.deleteMany({}),
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

/** Seed a Student/Parent/active linkage for a matching case. */
async function seedMatch(studentIdField: string, normalizedPhone: string): Promise<void> {
  const studentObjectId = new mongoose.Types.ObjectId();
  const parentObjectId = new mongoose.Types.ObjectId();

  // Insert via the native driver to bypass the bcrypt password-hashing save
  // hook — identity is all this property needs and it keeps 100 runs fast.
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

  await ParentStudentRelation.create({
    parentId: parentObjectId,
    studentId: studentObjectId,
    linkagePhone: normalizedPhone,
    isActive: true,
  });
}

// ---------------------------------------------------------------------------
// Property 9
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 9: OTP request responses are indistinguishable between match and non-match
describe('Property 9: OTP request responses are indistinguishable between match and non-match', () => {
  it(
    'returns the identical acknowledgement for match and non-match, with no challenge/SMS on a non-match and exactly one on a match',
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
            ]);
            auditSpy.events.length = 0;
            smsSpy.sent.length = 0;

            const rawPhone = `+${digits}`;
            const normalizedPhone = normalizePhone(rawPhone);
            const ctx = { ip, correlationId };

            // --- NON-match: nothing linked for this (studentId, phone) ---
            const nonMatchResult = await otpService.request(studentIdField, rawPhone, ctx);

            const nonMatchChallenges = await OtpChallenge.countDocuments({}).exec();
            const nonMatchSms = smsSpy.sent.length;

            // A non-match creates no challenge and sends no SMS (Req 4.4).
            expect(nonMatchChallenges).toBe(0);
            expect(nonMatchSms).toBe(0);

            // --- MATCH: seed the linkage, then request again ---
            await seedMatch(studentIdField, normalizedPhone);

            const matchResult = await otpService.request(studentIdField, rawPhone, ctx);

            const matchChallenges = await OtpChallenge.countDocuments({}).exec();
            const matchSms = smsSpy.sent.length;

            // A match creates exactly one challenge and sends exactly one SMS.
            expect(matchChallenges).toBe(1);
            expect(matchSms).toBe(1);

            // The caller-visible acknowledgement is byte-for-byte identical
            // across the two outcomes (Req 4.3): same success flag and message,
            // and structurally deep-equal so no extra field leaks the outcome.
            expect(matchResult.acknowledgement).toEqual(nonMatchResult.acknowledgement);
            expect(matchResult.acknowledgement.success).toBe(true);
            expect(nonMatchResult.acknowledgement.success).toBe(true);
            expect(matchResult.acknowledgement.message).toBe(
              nonMatchResult.acknowledgement.message,
            );
            expect(Object.keys(matchResult.acknowledgement).sort()).toEqual(
              Object.keys(nonMatchResult.acknowledgement).sort(),
            );

            // Neither outcome reflects a throttle for a fresh request.
            expect(nonMatchResult.throttled).toBe(false);
            expect(matchResult.throttled).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
