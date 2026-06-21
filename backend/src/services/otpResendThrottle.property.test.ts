/**
 * Property-Based Test: Resend throttling enforces the minimum interval.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 17: Resend throttling enforces the minimum interval
 *
 * Property 17: For any two resend requests for the same linkage within the
 * minimum interval (default 60s), the second request does NOT dispatch an
 * additional OTP and does NOT create a new challenge; the service signals the
 * throttle (`throttled === true`) so the controller (task 10.1) can respond
 * HTTP 429. Once the interval has elapsed, a subsequent request is allowed
 * (`throttled === false`) and dispatches a fresh OTP.
 *
 * **Validates: Requirements 6.4, 6.5**
 *
 * NOTE ON TIMERS: the task suggests Jest fake timers. The OtpService throttle
 * compares wall-clock `Date.now()` against the persisted `lastSentAt`, and the
 * surrounding flow performs real I/O against an in-memory MongoDB (which relies
 * on real timers internally). Faking timers globally conflicts with the
 * mongodb-memory-server / mongoose async machinery, so — as permitted by the
 * task — we instead advance "time" deterministically by backdating the stored
 * challenge's `lastSentAt` past the resend interval via `OtpChallenge.updateOne`.
 * This exercises the exact same `now - lastSentAt >= interval` boundary the
 * service evaluates, without the fragility of mocking global clocks.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { OtpService, getResendIntervalMs } from './otpService.js';
import { authTokenService } from './authTokenService.js';
import { auditService, type IAuditService } from './auditService.js';
import type { ISmsTransport } from './smsService.js';
import OtpChallenge from '../models/OtpChallenge.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import { normalizePhone } from '../utils/phone.js';

// ---------------------------------------------------------------------------
// MongoDB memory server + service wiring
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// In-memory SMS transport spy: every dispatched OTP is captured so the test can
// assert exactly how many messages were sent across resend attempts.
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

// In-memory audit sink so the throttle path never touches real audit storage.
const auditSpy = {
  events: [] as unknown[],
  async logEvent(event: unknown): Promise<void> {
    this.events.push(event);
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
// Property 17
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 17: Resend throttling enforces the minimum interval
describe('Property 17: Resend throttling enforces the minimum interval', () => {
  it(
    'throttles a second resend within the interval (no new SMS, no new challenge) and allows it once the interval elapses',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          studentIdArb,
          digitsArb,
          ipArb,
          correlationIdArb,
          async (studentIdField, digits, ip, correlationId) => {
            // Isolate each run so prior records/spies do not bleed across cases.
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

            // Insert identity via the native driver to bypass the bcrypt save
            // hook — identity is all this property needs and it keeps 100 runs
            // within the test budget.
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

            // --- First request: matched linkage → OTP dispatched (Req 6.4) ---
            const first = await otpService.request(studentIdField, rawPhone, ctx);
            expect(first.throttled).toBe(false);
            expect(smsSpy.sent).toHaveLength(1);
            expect(await OtpChallenge.countDocuments({ relationId: relation._id })).toBe(1);

            // --- Second request within the interval: throttled (Req 6.5) ---
            // No additional SMS is dispatched and no new challenge is created;
            // the service reports `throttled: true` so the controller → 429.
            const second = await otpService.request(studentIdField, rawPhone, ctx);
            expect(second.throttled).toBe(true);
            expect(smsSpy.sent).toHaveLength(1); // still exactly one SMS
            expect(await OtpChallenge.countDocuments({ relationId: relation._id })).toBe(1);
            // Throttled requests still return the constant generic acknowledgement.
            expect(second.acknowledgement).toEqual(first.acknowledgement);

            // --- Advance past the interval by backdating lastSentAt ---
            // Push the existing challenge's lastSentAt to just beyond the resend
            // window so the next request is no longer throttled.
            const backdated = new Date(Date.now() - getResendIntervalMs() - 1000);
            await OtpChallenge.updateOne(
              { relationId: relation._id },
              { $set: { lastSentAt: backdated } },
            );

            // --- Third request after the interval: allowed resend (Req 6.4) ---
            const third = await otpService.request(studentIdField, rawPhone, ctx);
            expect(third.throttled).toBe(false);
            expect(smsSpy.sent).toHaveLength(2); // a fresh OTP was dispatched
            // The prior challenge is superseded and exactly one unconsumed
            // (active) challenge remains for the linkage (Req 5.6).
            expect(
              await OtpChallenge.countDocuments({
                relationId: relation._id,
                consumedAt: null,
              }),
            ).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
