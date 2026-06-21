/**
 * Property-Based Test: Expired OTPs never authenticate.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 13: Expired OTPs never authenticate
 *
 * Property 13: For any OTP_Challenge whose expiry has passed, verification
 * responds 401 and issues no tokens, regardless of whether the submitted code
 * is correct (Req 5.4).
 *
 * Strategy:
 *  - Seed a Student + Parent + active ParentStudentRelation, then drive
 *    `OtpService.request` to mint a real challenge and capture the plaintext
 *    OTP from the in-memory SMS spy (the only place the plaintext appears).
 *  - Force expiry, then call `OtpService.verify` with BOTH the correct code and
 *    a distinct wrong code. Each call MUST reject with HTTP 401 and MUST NOT
 *    invoke the injected token service.
 *
 * Clock handling (fake timers): the task calls for jest fake timers. Driving
 * mongodb-memory-server while ALL timers are faked is unreliable — the Mongo
 * driver relies on real `setTimeout`/`setInterval` for connection upkeep, so
 * faking them can stall DB operations. To keep DB I/O healthy while still using
 * jest fake timers to control the wall clock, we fake ONLY the clock (`Date` +
 * `performance`) via `doNotFake`, set an initial system time, run the request,
 * then advance the clock past `getExpiryMs()` with `jest.setSystemTime`. The
 * service compares the persisted `expiresAt` against `Date.now()`, so advancing
 * the faked clock reliably makes the challenge expired.
 *
 * **Validates: Requirements 5.4**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { OtpService, getExpiryMs } from './otpService.js';
import type { AuthTokenService, TokenPair } from './authTokenService.js';
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

// In-memory SMS transport spy: captures the dispatched message so the test can
// recover the generated plaintext OTP from the body.
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

// In-memory token-service spy matching AuthTokenService.generateTokenPair. The
// property asserts this is NEVER called when an expired challenge is verified,
// so "no tokens issued" is observable directly rather than inferred.
const tokensSpy = {
  generateTokenPair: jest.fn(
    async (): Promise<TokenPair> => ({
      accessToken: 'should-never-be-issued',
      refreshToken: 'should-never-be-issued',
    }),
  ),
};

// Audit writes are irrelevant to this property; a no-op sink keeps runs fast.
const auditNoop = {
  async logEvent(): Promise<void> {
    /* no-op */
  },
};

let otpService: OtpService;

/** Fixed base wall-clock for the faked clock (2025-01-01T00:00:00.000Z). */
const BASE_TIME = Date.UTC(2025, 0, 1, 0, 0, 0);

/**
 * Everything EXCEPT the clock APIs is left real so mongodb-memory-server keeps
 * working; only `Date` (and `performance`) are faked.
 */
const DO_NOT_FAKE: NonNullable<
  Extract<
    NonNullable<Parameters<typeof jest.useFakeTimers>[0]>,
    { doNotFake?: unknown }
  >['doNotFake']
> = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'nextTick',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'hrtime',
];

beforeAll(async () => {
  // verify() may reach token issuance on a correct code; AuthTokenService signs
  // a JWT and requires JWT_SECRET. We inject a spy here, but set it anyway so
  // the environment matches the real flow.
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-otp-expiry-property';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  otpService = new OtpService(
    smsSpy as ISmsTransport,
    tokensSpy as unknown as AuthTokenService,
    auditNoop as unknown as IAuditService,
  );
});

afterAll(async () => {
  jest.useRealTimers();
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
  smsSpy.sent.length = 0;
  tokensSpy.generateTokenPair.mockClear();
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

/** A candidate 6-digit wrong code (reconciled at runtime to differ from the OTP). */
const wrongCodeArb = fc.stringMatching(/^[0-9]{6}$/);

/** Extract the 6-digit OTP from the SMS body produced by the OTP service. */
function extractOtp(body: string): string {
  const match = body.match(/verification code is (\d{6})/);
  if (!match) {
    throw new Error(`Could not extract OTP from SMS body: ${body}`);
  }
  return match[1]!;
}

/** Assert a verify() call rejects with an HTTP 401 AppError. */
async function expectUnauthorized(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toMatchObject({ statusCode: 401 });
}

// ---------------------------------------------------------------------------
// Property 13 — expired OTPs never authenticate
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 13: Expired OTPs never authenticate
describe('Property 13: Expired OTPs never authenticate', () => {
  it(
    'rejects verification of an expired challenge with 401 and issues no tokens, for both correct and wrong codes',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          studentIdArb,
          digitsArb,
          ipArb,
          correlationIdArb,
          wrongCodeArb,
          async (studentIdField, digits, ip, correlationId, wrongCandidate) => {
            // Isolate each run so prior records/spies do not interfere.
            await Promise.all([
              Student.deleteMany({}),
              Parent.deleteMany({}),
              ParentStudentRelation.deleteMany({}),
              OtpChallenge.deleteMany({}),
              RefreshToken.deleteMany({}),
            ]);
            smsSpy.sent.length = 0;
            tokensSpy.generateTokenPair.mockClear();

            // Fake ONLY the clock so DB I/O stays healthy (see file header).
            jest.useFakeTimers({ doNotFake: DO_NOT_FAKE, now: BASE_TIME });

            try {
              const rawPhone = `+${digits}`;
              const normalizedPhone = normalizePhone(rawPhone);

              const studentObjectId = new mongoose.Types.ObjectId();
              const parentObjectId = new mongoose.Types.ObjectId();

              // Insert via the native driver to bypass the bcrypt save hook —
              // identity is all this property needs, keeping 100 runs fast.
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

              // Mint a real challenge; the plaintext OTP is only in the SMS body.
              await otpService.request(studentIdField, rawPhone, { ip, correlationId });
              expect(smsSpy.sent).toHaveLength(1);
              const correctOtp = extractOtp(smsSpy.sent[0]!.body);

              const challenge = await OtpChallenge.findOne({ relationId: relation._id }).exec();
              expect(challenge).not.toBeNull();
              const challengeId = String(challenge!._id);

              // Build a wrong code guaranteed to differ from the correct OTP.
              const wrongOtp =
                wrongCandidate === correctOtp
                  ? ((Number(correctOtp) + 1) % 1_000_000).toString().padStart(6, '0')
                  : wrongCandidate;
              expect(wrongOtp).not.toBe(correctOtp);

              // Advance the faked clock past the challenge TTL → now expired.
              jest.setSystemTime(BASE_TIME + getExpiryMs() + 1000);

              // The correct code on an expired challenge must still be rejected
              // with 401 and must issue no tokens (Req 5.4).
              await expectUnauthorized(
                otpService.verify(challengeId, correctOtp, { ip, correlationId }),
              );
              expect(tokensSpy.generateTokenPair).not.toHaveBeenCalled();

              // A wrong code on an expired challenge: same 401, no tokens.
              await expectUnauthorized(
                otpService.verify(challengeId, wrongOtp, { ip, correlationId }),
              );
              expect(tokensSpy.generateTokenPair).not.toHaveBeenCalled();
            } finally {
              jest.useRealTimers();
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
