/**
 * Property-Based Test: Security Audit Trail (Property 32)
 *
 * Feature: gurukul-ai-modernization, Property 32: Security Audit Trail
 *
 * For any security-relevant event (login, password change, role modification,
 * failed authentication), the system SHALL create an audit log entry containing:
 * timestamp, actor identity, action performed, target resource, and source IP address.
 *
 * **Validates: Requirements 12.6**
 */

import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditService } from '../../src/services/auditService.js';
import AuditLog from '../../src/models/AuditLog.js';
import type { AuditAction } from '../../src/models/AuditLog.js';

let mongoServer: MongoMemoryServer;
let service: AuditService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  service = new AuditService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await AuditLog.deleteMany({});
});

// --- Generators ---

// Security-relevant actions as specified in Requirement 12.6
const securityActionArb: fc.Arbitrary<AuditAction> = fc.constantFrom(
  'login' as AuditAction,
  'password_change' as AuditAction,
  'role_modification' as AuditAction,
  'failed_auth' as AuditAction
);

// Generator for valid MongoDB ObjectId hex strings (24 hex characters)
const hexChars = '0123456789abcdef';
const objectIdArb = fc.array(
  fc.integer({ min: 0, max: 15 }),
  { minLength: 24, maxLength: 24 }
).map(arr => arr.map(i => hexChars[i]).join(''));

// Generator for roles in the system
const roleArb = fc.constantFrom('Student', 'Faculty', 'Admin', 'Parent');

// Generator for valid IPv4 addresses
const ipv4Arb = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 1, max: 254 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// Generator for correlation IDs (non-empty strings)
const correlationIdArb = fc.uuid();

// Generator for target resource names
const resourceArb = fc.constantFrom('auth', 'user', 'course', 'enrollment');

// Generator for optional resource IDs
const resourceIdArb = fc.option(objectIdArb, { nil: undefined });

// Combined generator for a full audit event
const auditEventArb = fc.record({
  userId: objectIdArb,
  role: roleArb,
  ip: ipv4Arb,
  action: securityActionArb,
  resource: resourceArb,
  resourceId: resourceIdArb,
  correlationId: correlationIdArb,
});

describe('Property 32: Security Audit Trail', () => {
  /**
   * Property: For any security-relevant event, the audit service creates a log entry
   * that contains ALL required fields: timestamp, actor identity (userId, role, IP),
   * action performed, and target resource.
   */
  it('security events produce audit entries with all required fields (timestamp, actor identity, action, target resource, source IP)', async () => {
    await fc.assert(
      fc.asyncProperty(auditEventArb, async (event) => {
        // Clear previous entries
        await AuditLog.deleteMany({});

        const before = new Date();

        await service.logEvent({
          userId: event.userId,
          role: event.role,
          ip: event.ip,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId,
          correlationId: event.correlationId,
        });

        const after = new Date();

        // Retrieve the stored audit log entry
        const log = await AuditLog.findOne({}).lean();

        // Entry must exist
        expect(log).not.toBeNull();

        // 1. Timestamp: must be present and within the expected time window
        expect(log!.timestamp).toBeInstanceOf(Date);
        expect(log!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(log!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());

        // 2. Actor identity: userId, role, and IP must be present and correct
        expect(log!.actor).toBeDefined();
        expect(log!.actor.userId).toBeDefined();
        expect(log!.actor.userId.toString()).toBe(event.userId);
        expect(log!.actor.role).toBe(event.role);
        expect(log!.actor.ip).toBe(event.ip);

        // 3. Action performed: must match the event action
        expect(log!.action).toBe(event.action);

        // 4. Target resource: must be present
        expect(log!.target).toBeDefined();
        expect(log!.target.resource).toBe(event.resource);

        // 5. Correlation ID: must be present for traceability
        expect(log!.correlationId).toBe(event.correlationId);
      }),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: For any login event, the convenience method logLogin produces
   * an audit entry with all required fields matching the input.
   */
  it('logLogin creates complete audit entry for any actor/IP combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        roleArb,
        ipv4Arb,
        correlationIdArb,
        async (userId, role, ip, correlationId) => {
          await AuditLog.deleteMany({});

          await service.logLogin(userId, role, ip, correlationId);

          const log = await AuditLog.findOne({}).lean();

          expect(log).not.toBeNull();
          expect(log!.timestamp).toBeInstanceOf(Date);
          expect(log!.actor.userId.toString()).toBe(userId);
          expect(log!.actor.role).toBe(role);
          expect(log!.actor.ip).toBe(ip);
          expect(log!.action).toBe('login');
          expect(log!.target.resource).toBe('auth');
          expect(log!.correlationId).toBe(correlationId);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: For any failed authentication event, the convenience method logFailedAuth
   * produces an audit entry with all required fields and the failure reason in metadata.
   */
  it('logFailedAuth creates complete audit entry with failure reason for any input', async () => {
    const failureReasonArb = fc.constantFrom(
      'invalid_password',
      'account_not_found',
      'expired_token',
      'invalid_otp',
      'account_disabled'
    );

    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        roleArb,
        ipv4Arb,
        correlationIdArb,
        failureReasonArb,
        async (userId, role, ip, correlationId, reason) => {
          await AuditLog.deleteMany({});

          await service.logFailedAuth(userId, role, ip, correlationId, reason);

          const log = await AuditLog.findOne({}).lean();

          expect(log).not.toBeNull();
          expect(log!.timestamp).toBeInstanceOf(Date);
          expect(log!.actor.userId.toString()).toBe(userId);
          expect(log!.actor.role).toBe(role);
          expect(log!.actor.ip).toBe(ip);
          expect(log!.action).toBe('failed_auth');
          expect(log!.target.resource).toBe('auth');
          expect(log!.correlationId).toBe(correlationId);
          expect(log!.metadata).toEqual({ reason });
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: For any password change event, the convenience method logPasswordChange
   * produces an audit entry with all required fields.
   */
  it('logPasswordChange creates complete audit entry for any actor/IP combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        roleArb,
        ipv4Arb,
        correlationIdArb,
        async (userId, role, ip, correlationId) => {
          await AuditLog.deleteMany({});

          await service.logPasswordChange(userId, role, ip, correlationId);

          const log = await AuditLog.findOne({}).lean();

          expect(log).not.toBeNull();
          expect(log!.timestamp).toBeInstanceOf(Date);
          expect(log!.actor.userId.toString()).toBe(userId);
          expect(log!.actor.role).toBe(role);
          expect(log!.actor.ip).toBe(ip);
          expect(log!.action).toBe('password_change');
          expect(log!.target.resource).toBe('auth');
          expect(log!.correlationId).toBe(correlationId);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: For any role modification event, the convenience method logRoleModification
   * produces an audit entry with all required fields including target user and new role.
   */
  it('logRoleModification creates complete audit entry with target user and new role for any input', async () => {
    const newRoleArb = fc.constantFrom('Student', 'Faculty', 'Admin', 'Parent');

    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        roleArb,
        ipv4Arb,
        correlationIdArb,
        objectIdArb,
        newRoleArb,
        async (actorId, role, ip, correlationId, targetUserId, newRole) => {
          await AuditLog.deleteMany({});

          await service.logRoleModification(actorId, role, ip, correlationId, targetUserId, newRole);

          const log = await AuditLog.findOne({}).lean();

          expect(log).not.toBeNull();
          expect(log!.timestamp).toBeInstanceOf(Date);
          expect(log!.actor.userId.toString()).toBe(actorId);
          expect(log!.actor.role).toBe(role);
          expect(log!.actor.ip).toBe(ip);
          expect(log!.action).toBe('role_modification');
          expect(log!.target.resource).toBe('user');
          expect(log!.target.resourceId).toBe(targetUserId);
          expect(log!.correlationId).toBe(correlationId);
          expect(log!.metadata).toEqual({ newRole });
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);
});
