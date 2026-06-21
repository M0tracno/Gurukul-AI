/**
 * Property-Based Test: A matching OTP request creates exactly one challenge and
 * dispatches exactly one message.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 10: A matching OTP request creates exactly one challenge and dispatches one message
 *
 * Property 10: When an OTP request's `(studentId, phone)` pair matches an active
 * linkage (and the request falls outside the resend interval), the service:
 *   - persists EXACTLY ONE `OtpChallenge` for that linkage (Req 4.1), and
 *   - dispatches EXACTLY ONE SMS message via the transport (Req 4.2).
 *
 * **Validates: Requirements 4.1, 4.2**
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
import { normalizePhone } from '../utils/phone.js';

// ---------------------------------------------------------------------------
// MongoDB memory server + env setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// In-memory SMS transport spy: records every dispatched message so the test can
// assert exactly one `send` call occurred per matching request.
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

// In-memory audit sink: this property is only concerned with challenge/dispatch
// counts, so audit writes are captured but not asserted on.
const auditSpy = {
  events: [] as unknown[],
  async logEvent(event: unknown): Promise<void> {
    this.events.push(event);
  },
};

let otpService: OtpService;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-otp-single-dispatch-property';

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
  ]);
  smsSpy.sent.length = 0;
  auditSpy.events.length = 0;
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

// ---------------------------------------------------------------------------
// Property 10 — single challenge + single dispatch on a matching request
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 10: A matching OTP request creates exactly one challenge and dispatches one message
describe('Property 10: A matching OTP request creates exactly one challenge and dispatches one message', () => {
  it(
    'persists exactly one OtpChallenge for the linkage and calls sms.send exactly once on a match',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          studentIdArb,
          digitsArb,
          ipArb,
          correlationIdArb,
          async (studentIdField, digits, ip, correlationId) => {
            // Isolate each run so prior records/spy entries cannot interfere.
            await Promise.all([
              Student.deleteMany({}),
              Parent.deleteMany({}),
              ParentStudentRelation.deleteMany({}),
              OtpChallenge.deleteMany({}),
            ]);
            smsSpy.sent.length = 0;
            auditSpy.events.length = 0;

            const rawPhone = `+${digits}`;
            const normalizedPhone = normalizePhone(rawPhone);

            const studentObjectId = new mongoose.Types.ObjectId();
            const parentObjectId = new mongoose.Types.ObjectId();

            // Insert identity records via the native driver to bypass the
            // password-hashing (bcrypt) save hooks — identity is all this
            // property needs and this keeps 100+ runs within budget.
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

            // Single matching request, outside any resend interval (fresh state).
            await otpService.request(studentIdField, rawPhone, { ip, correlationId });

            // Req 4.1: exactly one challenge persisted for this linkage.
            const challengeCount = await OtpChallenge.countDocuments({
              relationId: relation._id,
            }).exec();
            expect(challengeCount).toBe(1);

            // No stray challenges for any other linkage either.
            const totalChallenges = await OtpChallenge.countDocuments({}).exec();
            expect(totalChallenges).toBe(1);

            // Req 4.2: exactly one SMS dispatched.
            expect(smsSpy.sent).toHaveLength(1);
            expect(smsSpy.sent[0]!.to).toBe(normalizedPhone);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
