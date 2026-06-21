/**
 * Property-Based Tests: OTP generation invariants (format, hashing, expiry).
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 12: OTP generation invariants (format, hashing, expiry)
 *
 * Property 12: Whenever a matching OTP request creates a challenge, the
 * generated OTP and its persisted challenge satisfy three invariants:
 *
 *  - **Format (Req 5.1):** the generated code is a cryptographically-random
 *    numeric value of exactly 6 digits, matching `^\d{6}$`.
 *  - **Hash-only storage (Req 5.2):** only a SHA-256 hash of the code is
 *    persisted; the plaintext is never stored on any field of the challenge.
 *    The stored `otpHash` equals `sha256(code)` and differs from the plaintext.
 *  - **Expiry (Req 5.3):** the challenge expires 5 minutes after creation, so
 *    `expiresAt - createdAt` equals the configured TTL (`getExpiryMs()`).
 *
 * The plaintext OTP is recovered from the in-memory SMS transport spy (the only
 * place it ever appears), mirroring the setup in `auditEvents.property.test.ts`.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { OtpService, getExpiryMs } from './otpService.js';
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

// In-memory audit spy: swallows emitted events so this property does not depend
// on a real audit sink (it only cares about the generated OTP and challenge).
const auditSpy = {
  events: [] as any[],
  async logEvent(event: any): Promise<void> {
    this.events.push(event);
  },
};

// In-memory SMS transport spy: the OTP plaintext is sent only in the SMS body,
// so this is how the test recovers the generated code to assert against it.
const smsSpy = {
  sent: [] as { to: string; body: string }[],
  async send(to: string, body: string): Promise<void> {
    this.sent.push({ to, body });
  },
};

let otpService: OtpService;

beforeAll(async () => {
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? 'test-jwt-secret-otp-generation-invariants-property';

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

/** SHA-256 hex digest, matching the hashing the service uses for storage. */
function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ---------------------------------------------------------------------------
// Property 12 — OTP generation invariants
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 12: OTP generation invariants (format, hashing, expiry)
describe('Property 12: OTP generation invariants (format, hashing, expiry)', () => {
  it(
    'generates a 6-digit code, persists only its hash (never plaintext), and sets a 5-minute expiry',
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

            const studentObjectId = new mongoose.Types.ObjectId();
            const parentObjectId = new mongoose.Types.ObjectId();

            // Insert via the native driver to bypass the password-hashing save
            // hook — identity is all this property needs.
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

            // Trigger generation for a matched linkage.
            await otpService.request(studentIdField, rawPhone, { ip, correlationId });

            // Exactly one SMS dispatched; recover the plaintext OTP from it.
            expect(smsSpy.sent).toHaveLength(1);
            const otp = extractOtp(smsSpy.sent[0]!.body);

            // --- Format invariant (Req 5.1): exactly 6 digits ---
            expect(otp).toMatch(/^\d{6}$/);

            // Load the persisted challenge WITH its (select:false) otpHash.
            const challenge = await OtpChallenge.findOne({ relationId: relation._id })
              .select('+otpHash')
              .exec();
            expect(challenge).not.toBeNull();

            // --- Hash-only storage invariant (Req 5.2) ---
            // The stored hash equals sha256(code) and is NOT the plaintext.
            expect(challenge!.otpHash).toBe(sha256Hex(otp));
            expect(challenge!.otpHash).not.toBe(otp);

            // No field on the persisted document equals the plaintext OTP.
            const persisted = challenge!.toObject();
            for (const value of Object.values(persisted)) {
              expect(String(value)).not.toBe(otp);
            }

            // --- Expiry invariant (Req 5.3): expiresAt - createdAt == TTL ---
            // createdAt is DB-stamped while expiresAt is computed from Date.now()
            // a moment earlier, so allow a tiny tolerance for the gap between
            // the two timestamps.
            const ttl = getExpiryMs();
            const delta = challenge!.expiresAt.getTime() - challenge!.createdAt.getTime();
            expect(Math.abs(delta - ttl)).toBeLessThanOrEqual(1500);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
