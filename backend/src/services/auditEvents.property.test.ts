/**
 * Property-Based Tests: Sensitive events are audited with required fields.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 21: Sensitive events are audited with required fields
 *
 * Property 21: For each sensitive action the system performs, it writes an
 * audit entry carrying the required identity/context fields and NEVER the OTP
 * value or the full phone number:
 *
 *  - `otp_delivered` (Req 8.2): emitted on a confirmed delivery for a matched
 *    linkage, recording the parent (actor) id, the linked student id, source
 *    IP, and correlation id — and only the match-outcome category, never the
 *    OTP or full phone.
 *  - `parent_otp_login` (Req 8.1): emitted on a successful OTP verification,
 *    recording the same identity/context fields, never the OTP.
 *  - `access_denied` (Req 8.3): emitted for an out-of-scope data-isolation
 *    denial, recording the requestor (actor) id/role, source IP, and
 *    correlation id.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { OtpService } from './otpService.js';
import { authTokenService } from './authTokenService.js';
import { authorizationService } from './authorizationService.js';
import { auditService, type IAuditService } from './auditService.js';
import type { ISmsTransport } from './smsService.js';
import OtpChallenge from '../models/OtpChallenge.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import RefreshToken from '../models/RefreshToken.js';
import { normalizePhone } from '../utils/phone.js';
import type { AuditContext } from '../utils/auditContext.js';

// ---------------------------------------------------------------------------
// MongoDB memory server + env setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

// In-memory audit spy: captures every event the services emit so the test can
// assert the required fields are present and no secret value leaked.
const auditSpy = {
  events: [] as any[],
  async logEvent(event: any): Promise<void> {
    this.events.push(event);
  },
};

// In-memory SMS transport spy: captures the dispatched message so the test can
// recover the generated OTP from the body and confirm it is never audited.
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
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-audit-events-property';

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

/** A valid 24-character hex string (MongoDB ObjectId format). */
const objectIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);

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
// Property 21 — otp_delivered + parent_otp_login
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 21: Sensitive events are audited with required fields
describe('Property 21: Sensitive events are audited with required fields', () => {
  it(
    'audits otp_delivered on delivery and parent_otp_login on verification with required fields and never the OTP or full phone',
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

            // --- otp_delivered (Req 8.2) ---
            await otpService.request(studentIdField, rawPhone, { ip, correlationId });

            // Exactly one SMS dispatched on a matched linkage.
            expect(smsSpy.sent).toHaveLength(1);
            const otp = extractOtp(smsSpy.sent[0]!.body);

            const deliveredEvent = auditSpy.events.find((e) => e.action === 'otp_delivered');
            expect(deliveredEvent).toBeDefined();
            expect(deliveredEvent.userId).toBe(String(parentObjectId));
            expect(deliveredEvent.resourceId).toBe(String(studentObjectId));
            expect(deliveredEvent.ip).toBe(ip);
            expect(deliveredEvent.correlationId).toBe(correlationId);
            // Timestamp is stamped by auditService.logEvent on persistence; the
            // event carries the identity/context required to reconstruct it.
            expect(deliveredEvent.action).toBe('otp_delivered');

            // No audited event reveals the OTP value or the full phone number.
            const afterDelivery = JSON.stringify(auditSpy.events);
            expect(afterDelivery).not.toContain(otp);
            expect(afterDelivery).not.toContain(normalizedPhone);
            expect(afterDelivery).not.toContain(digits);

            // --- parent_otp_login (Req 8.1) ---
            const challenge = await OtpChallenge.findOne({ relationId: relation._id }).exec();
            expect(challenge).not.toBeNull();

            await otpService.verify(String(challenge!._id), otp, { ip, correlationId });

            const loginEvent = auditSpy.events.find((e) => e.action === 'parent_otp_login');
            expect(loginEvent).toBeDefined();
            expect(loginEvent.userId).toBe(String(parentObjectId));
            expect(loginEvent.resourceId).toBe(String(studentObjectId));
            expect(loginEvent.ip).toBe(ip);
            expect(loginEvent.correlationId).toBe(correlationId);

            // Still no OTP or full phone anywhere in the audit trail.
            const afterLogin = JSON.stringify(auditSpy.events);
            expect(afterLogin).not.toContain(otp);
            expect(afterLogin).not.toContain(normalizedPhone);
            expect(afterLogin).not.toContain(digits);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );

  // -------------------------------------------------------------------------
  // Property 21 — access_denied (Req 8.3)
  // -------------------------------------------------------------------------

  it('audits access_denied with the requestor identity/context for out-of-scope denials', async () => {
    const spy = jest
      .spyOn(auditService, 'logEvent')
      .mockResolvedValue(undefined as never);

    try {
      await fc.assert(
        fc.asyncProperty(
          objectIdArb,
          objectIdArb,
          ipArb,
          correlationIdArb,
          async (requestorId, targetId, ip, correlationId) => {
            // Ensure the target is genuinely out of scope (different identity).
            fc.pre(requestorId !== targetId);
            spy.mockClear();

            const ctx: AuditContext = {
              userId: requestorId,
              role: 'student',
              ip,
              correlationId,
            };

            // A student accessing another student's records must be denied.
            expect(() =>
              authorizationService.assertStudentOwnership(requestorId, targetId, 'student', ctx),
            ).toThrow();

            // The denial audit write is fire-and-forget; let the microtask run.
            await Promise.resolve();

            expect(spy).toHaveBeenCalledTimes(1);
            const entry = spy.mock.calls[0]![0] as any;
            expect(entry.action).toBe('access_denied');
            expect(entry.userId).toBe(requestorId);
            expect(entry.role).toBe('student');
            expect(entry.ip).toBe(ip);
            expect(entry.correlationId).toBe(correlationId);
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      spy.mockRestore();
    }
  });
});
