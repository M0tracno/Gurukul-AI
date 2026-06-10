/**
 * Property-Based Test: SMS delivery failure is hidden from the caller.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 11: SMS delivery failure is hidden from the caller
 *
 * Property 11: When the SMS_Service fails to accept the OTP for delivery on a
 * MATCHED linkage, the System records the delivery failure server-side and
 * returns the SAME generic acknowledgement to the caller, without exposing the
 * delivery failure through the response, an exception, or an `otp_delivered`
 * audit event — and never leaks the OTP value into the server-side record.
 *
 * **Validates: Requirements 4.5**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ---------------------------------------------------------------------------
// Logger mock — registered BEFORE importing any app module so the OTP service
// binds to this spy. The server-side delivery-failure record is written via
// `logger.error`, so we capture those calls to assert the record exists and
// that it never carries the OTP value.
// ---------------------------------------------------------------------------

const mockError = jest.fn();
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockDebug = jest.fn();

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
    debug: mockDebug,
  },
}));

// Dynamically import everything that (transitively) depends on the mocked
// logger only AFTER the mock is registered.
const { OtpService } = await import('./otpService.js');
const { authTokenService } = await import('./authTokenService.js');
const { normalizePhone } = await import('../utils/phone.js');
const OtpChallenge = (await import('../models/OtpChallenge.js')).default;
const ParentStudentRelation = (await import('../models/ParentStudentRelation.js')).default;
const Student = (await import('../models/Student.js')).default;
const Parent = (await import('../models/Parent.js')).default;

type ISmsTransport = import('./smsService.js').ISmsTransport;
type IAuditService = import('./auditService.js').IAuditService;

// ---------------------------------------------------------------------------
// The single, constant acknowledgement the service must return on every OTP
// request — match, non-match, or hidden delivery failure (Req 4.3, 4.4, 4.5).
// Mirrors the frozen `GENERIC_ACK` value inside otpService.ts.
// ---------------------------------------------------------------------------

const GENERIC_ACK = {
  success: true,
  message:
    'If the details match our records, a verification code has been sent to the registered phone number.',
} as const;

// ---------------------------------------------------------------------------
// Spies
// ---------------------------------------------------------------------------

// A transport that ALWAYS fails to accept the message for delivery (Req 4.5).
const failingSms: ISmsTransport = {
  async send(): Promise<void> {
    throw new Error('delivery failed');
  },
};

// In-memory audit spy: captures every emitted event so the test can assert
// that NO `otp_delivered` event is written when delivery fails.
const auditSpy = {
  events: [] as Array<{ action: string; [k: string]: unknown }>,
  async logEvent(event: { action: string; [k: string]: unknown }): Promise<void> {
    this.events.push(event);
  },
};

let mongoServer: MongoMemoryServer;
let otpService: InstanceType<typeof OtpService>;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-otp-delivery-failure-property';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  otpService = new OtpService(
    failingSms,
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
  auditSpy.events.length = 0;
  mockError.mockClear();
  mockInfo.mockClear();
  mockWarn.mockClear();
  mockDebug.mockClear();
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

/** Matches a standalone 6-digit run — the OTP code format (Req 5.1). */
const SIX_DIGIT_OTP = /(?<!\d)\d{6}(?!\d)/;

// ---------------------------------------------------------------------------
// Property 11
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 11: SMS delivery failure is hidden from the caller
describe('Property 11: SMS delivery failure is hidden from the caller', () => {
  it(
    'returns the generic acknowledgement, does not reject, writes a server-side failure record without the OTP, and emits no otp_delivered audit on delivery failure',
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
            mockError.mockClear();

            const rawPhone = `+${digits}`;
            const normalizedPhone = normalizePhone(rawPhone);

            const studentObjectId = new mongoose.Types.ObjectId();
            const parentObjectId = new mongoose.Types.ObjectId();

            // Insert via the native driver to bypass the password-hashing save
            // hook (bcrypt); identity is all this property needs and this keeps
            // 100 runs well within the test budget.
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

            // An ACTIVE linkage: this is a genuine MATCH, so the service WILL
            // attempt SMS delivery — which our transport forces to fail.
            await ParentStudentRelation.create({
              parentId: parentObjectId,
              studentId: studentObjectId,
              linkagePhone: normalizedPhone,
              isActive: true,
            });

            // --- Act: the call must NOT reject even though `send` throws. ---
            const result = await otpService.request(studentIdField, rawPhone, {
              ip,
              correlationId,
            });

            // 1) The caller receives the SAME generic acknowledgement, with no
            //    field signalling the delivery failure (Req 4.5).
            expect(result.acknowledgement).toEqual(GENERIC_ACK);
            expect(result.acknowledgement.success).toBe(true);
            expect(result.acknowledgement.message).toBe(GENERIC_ACK.message);
            expect(result.throttled).toBe(false);

            // 2) A server-side delivery-failure record is written via logger.error.
            expect(mockError).toHaveBeenCalled();
            const failureCall = mockError.mock.calls.find((call) => {
              const meta = call[1] as Record<string, unknown> | undefined;
              return meta?.correlationId === correlationId;
            });
            expect(failureCall).toBeDefined();

            const message = failureCall![0] as string;
            const meta = (failureCall![1] ?? {}) as Record<string, unknown>;

            // The record identifies a delivery failure and carries the request
            // context for server-side triage.
            expect(typeof message).toBe('string');
            expect(message.toLowerCase()).toContain('delivery');
            expect(meta.correlationId).toBe(correlationId);
            expect(meta.ip).toBe(ip);

            // 3) The server-side record NEVER carries the OTP. It must contain
            //    no OTP-bearing keys, and no standalone 6-digit OTP value in the
            //    failure-specific fields (message + reason).
            expect(meta).not.toHaveProperty('code');
            expect(meta).not.toHaveProperty('otp');
            expect(meta).not.toHaveProperty('body');
            expect(meta).not.toHaveProperty('phone');
            const failureText = `${message} ${String(meta.reason ?? '')}`;
            expect(failureText).not.toMatch(SIX_DIGIT_OTP);

            // 4) Delivery never confirmed → NO otp_delivered audit event is
            //    emitted (the failure stays hidden from every channel).
            expect(auditSpy.events.some((e) => e.action === 'otp_delivered')).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
