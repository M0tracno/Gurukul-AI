/**
 * Property-Based Tests: Privileged-Action Auditing
 *
 * Feature: secure-admin-user-management, Property 22: Successful privileged actions produce complete audit entries
 * Feature: secure-admin-user-management, Property 23: Authorization denials are audited
 *
 * Property 22: For any successful create, update, deactivate, reactivate, or
 * password-reset action, the System SHALL write an Audit_Log entry recording the
 * admin's `userId`, role, source IP, action, target resource, target resource
 * identifier, timestamp, and correlation ID.
 * **Validates: Requirements 11.1, 11.2**
 *
 * Property 23: For any admin-management request denied with HTTP 403, the System
 * SHALL write an Audit_Log entry recording the denied access attempt.
 * **Validates: Requirements 11.3**
 *
 * Property 22 drives the real `studentService` privileged operations against an
 * in-memory MongoDB and asserts the persisted `AuditLog` entry. Property 23
 * drives the real `requireRoles` denial path (which fires the RBAC audit hook
 * fire-and-forget) and polls the collection for the recorded `access_denied`
 * entry.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import { NUM_RUNS } from './_pbtConfig.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Request, Response, NextFunction } from 'express';

import Student from '../../src/models/Student.js';
import AuditLog from '../../src/models/AuditLog.js';
import { studentService } from '../../src/services/studentService.js';
import { requireRoles, type AuthenticatedRequest } from '../../src/middleware/rbacMiddleware.js';
import { AppError } from '../../src/middleware/errorHandler.js';
import type { AuditContext } from '../../src/utils/auditContext.js';
import type { UserRole } from '../../src/types/common.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Student.deleteMany({});
  await AuditLog.deleteMany({});
});

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}`;
}

/** Wait until `predicate()` resolves truthy, polling briefly (for fire-and-forget writes). */
async function poll<T>(
  fn: () => Promise<T | null>,
  { tries = 50, intervalMs = 10 }: { tries?: number; intervalMs?: number } = {},
): Promise<T | null> {
  for (let i = 0; i < tries; i += 1) {
    const result = await fn();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** A valid ObjectId hex string for the acting admin's userId. */
const hexChars = '0123456789abcdef';
const objectIdArb = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 24, maxLength: 24 })
  .map((arr) => arr.map((i) => hexChars[i]).join(''));

/** A valid IPv4 source address. */
const ipv4Arb = fc
  .tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 }),
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/** The five privileged actions and the audit action each must record. */
type Operation = 'create' | 'update' | 'deactivate' | 'reactivate' | 'reset';
const operationArb = fc.constantFrom<Operation>(
  'create',
  'update',
  'deactivate',
  'reactivate',
  'reset',
);

/** An admin-set password that always satisfies the >= 8 char policy. */
const adminPasswordArb = fc.string({ minLength: 8, maxLength: 20 }).map((s) => `Pw9aZ${s}`);

const EXPECTED_ACTION: Record<Operation, string> = {
  create: 'account_created',
  update: 'account_updated',
  deactivate: 'account_deactivated',
  reactivate: 'account_reactivated',
  reset: 'password_change',
};

// ===========================================================================
// Property 22: Successful privileged actions produce complete audit entries
// ===========================================================================
// Feature: secure-admin-user-management, Property 22: Successful privileged actions produce complete audit entries
describe('Property 22: Successful privileged actions produce complete audit entries', () => {
  it('every successful create/update/deactivate/reactivate/reset writes a complete, secret-free audit entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        operationArb,
        objectIdArb,
        ipv4Arb,
        fc.uuid(),
        adminPasswordArb,
        async (operation, adminId, ip, correlationId, password) => {
          await Student.deleteMany({});
          await AuditLog.deleteMany({});

          const ctx: AuditContext = {
            userId: adminId,
            role: 'admin',
            ip,
            correlationId,
          };

          const suffix = uniqueSuffix();

          // Always start from a created account so update/deactivate/etc. have
          // a target. The create itself produces an audit entry, so clear the
          // collection after setup for the non-create operations.
          const createResult = await studentService.createWithCredentials(
            {
              firstName: 'Audit',
              lastName: 'Target',
              email: `student_${suffix}@school.edu`,
              studentId: `STU-${suffix}`,
              grade: '10th',
              credentialDeliveryMethod: 'admin_set',
              password,
            },
            ctx,
          );

          const accountId = createResult.account._id;

          const before = new Date();
          if (operation !== 'create') {
            await AuditLog.deleteMany({});

            switch (operation) {
              case 'update':
                await studentService.updateAccount(accountId, { firstName: 'Renamed' }, ctx);
                break;
              case 'deactivate':
                await studentService.deactivate(accountId, ctx);
                break;
              case 'reactivate':
                await studentService.reactivate(accountId, ctx);
                break;
              case 'reset':
                await studentService.resetPassword(accountId, 'admin_set', ctx, password);
                break;
            }
          }
          const after = new Date();

          // Exactly one audit entry for the operation under test.
          const log = await AuditLog.findOne({}).lean();
          expect(log).not.toBeNull();

          // Actor identity: userId, role, source IP.
          expect(log!.actor.userId.toString()).toBe(adminId);
          expect(log!.actor.role).toBe('admin');
          expect(log!.actor.ip).toBe(ip);

          // Action recorded matches the operation performed.
          expect(log!.action).toBe(EXPECTED_ACTION[operation]);

          // Target resource + identifier.
          expect(log!.target.resource).toBe('Student');
          expect(log!.target.resourceId).toBe(accountId);

          // Timestamp present and within the operation window.
          expect(log!.timestamp).toBeInstanceOf(Date);
          if (operation !== 'create') {
            expect(log!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
            expect(log!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
          }

          // Correlation ID for traceability.
          expect(log!.correlationId).toBe(correlationId);

          // No plaintext secret survives into the audit metadata.
          const serialised = JSON.stringify(log!.metadata ?? {});
          expect(serialised).not.toContain(password);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});

// ===========================================================================
// Property 23: Authorization denials are audited
// ===========================================================================
// Feature: secure-admin-user-management, Property 23: Authorization denials are audited
describe('Property 23: Authorization denials are audited', () => {
  const nonAdminRoleArb = fc.constantFrom<UserRole>('teacher', 'faculty', 'student', 'parent');
  const writeMethodArb = fc.constantFrom('POST', 'PUT', 'DELETE');

  it('every 403 RBAC denial writes an access_denied audit entry recording the attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        nonAdminRoleArb,
        ipv4Arb,
        fc.uuid(),
        writeMethodArb,
        objectIdArb,
        async (userId, role, ip, correlationId, method, targetId) => {
          await AuditLog.deleteMany({});

          const req = {
            headers: {},
            method,
            params: { id: targetId },
            baseUrl: '/api/students',
            path: `/${targetId}`,
            ip,
            correlationId,
            user: { userId, role },
          } as unknown as AuthenticatedRequest;

          const next: NextFunction = () => {
            /* handler must never run */
          };

          // The denial throws 403 synchronously and fires the audit hook
          // fire-and-forget.
          let thrown: unknown;
          try {
            requireRoles('admin')(req, {} as Response, next);
          } catch (err) {
            thrown = err;
          }
          expect(thrown).toBeInstanceOf(AppError);
          expect((thrown as AppError).statusCode).toBe(403);

          // The audit write is asynchronous; poll until it lands.
          const log = await poll(() =>
            AuditLog.findOne({
              action: 'access_denied',
              'actor.userId': userId,
            }).lean(),
          );

          expect(log).not.toBeNull();
          expect(log!.actor.userId.toString()).toBe(userId);
          expect(log!.actor.role).toBe(role);
          expect(log!.actor.ip).toBe(ip);
          expect(log!.action).toBe('access_denied');
          expect(log!.target.resourceId).toBe(targetId);
          expect(log!.correlationId).toBe(correlationId);
          expect(log!.timestamp).toBeInstanceOf(Date);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  }, 600000);
});
