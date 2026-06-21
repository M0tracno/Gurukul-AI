/**
 * Property-Based Tests: Parent access requires an active linkage.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 5: Parent access requires an active linkage
 *
 * Property 5: For any parent and child, the System returns the child's data if
 * and only if an active `ParentStudentRelation` links them, and responds 403
 * otherwise; deactivating the linkage flips access to denied.
 *
 *  - WITH an active relation linking (parent, child): `assertParentAccess`
 *    resolves without throwing — access granted (Req 2.6).
 *  - AFTER deactivating that relation (`isActive=false`): `assertParentAccess`
 *    rejects with a 403 `AppError` — deactivation flips access to denied
 *    (Req 7.2).
 *  - FOR an unrelated / never-linked (parent, otherStudent) pair:
 *    `assertParentAccess` rejects with a 403 `AppError` (Req 2.6).
 *
 * **Validates: Requirements 2.6, 7.2**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { authorizationService } from './authorizationService.js';
import { AppError } from '../middleware/errorHandler.js';
import type { UserRole } from '../types/common.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import { normalizePhone } from '../utils/phone.js';
import type { AuditContext } from '../utils/auditContext.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
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
  ]);
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Insert a Student via the native driver to bypass the password-hashing save
 * hook (bcrypt) — identity is all this property needs, and this keeps 100 runs
 * well within the test budget.
 */
async function insertStudent(studentIdField: string): Promise<mongoose.Types.ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Student.collection.insertOne({
    _id,
    firstName: 'Test',
    lastName: 'Student',
    email: `${_id.toString()}@example.com`,
    password: 'placeholder',
    studentId: studentIdField,
    grade: '10',
    active: true,
    isDemo: false,
    failedLoginAttempts: 0,
    createdAt: new Date(),
  });
  return _id;
}

/** Insert a Parent via the native driver (bypasses hashing hooks). */
async function insertParent(label: string): Promise<mongoose.Types.ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Parent.collection.insertOne({
    _id,
    parentId: `P-${label}`,
    firstName: 'Test',
    lastName: 'Parent',
    relationToStudent: 'Other',
    isActive: true,
    isVerified: false,
    isDemo: false,
    failedLoginAttempts: 0,
  });
  return _id;
}

/**
 * Assert `assertParentAccess` rejects with a 403 `AppError` for the given
 * (parent, student) pair.
 */
async function expectForbidden(
  parentId: string,
  studentId: string,
  ctx: AuditContext,
): Promise<void> {
  let thrown: unknown;
  try {
    await authorizationService.assertParentAccess(
      parentId,
      studentId,
      'parent' as UserRole,
      ctx,
    );
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(AppError);
  expect((thrown as AppError).statusCode).toBe(403);
}

// ---------------------------------------------------------------------------
// Property 5
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 5: Parent access requires an active linkage
describe('Property 5: Parent access requires an active linkage', () => {
  it(
    'grants access iff an active relation links the pair, denies (403) on deactivation and for unrelated pairs',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          studentIdArb,
          studentIdArb,
          digitsArb,
          ipArb,
          correlationIdArb,
          async (childStudentId, otherStudentId, digits, ip, correlationId) => {
            // Distinct human-readable ids so the two students never collide on
            // the unique studentId field.
            fc.pre(childStudentId !== otherStudentId);

            // Isolate each run so prior records do not interfere.
            await Promise.all([
              Student.deleteMany({}),
              Parent.deleteMany({}),
              ParentStudentRelation.deleteMany({}),
            ]);

            const ctx: AuditContext = {
              userId: '', // filled in below once the parent id is known
              role: 'parent',
              ip,
              correlationId,
            };

            const parentObjectId = await insertParent(childStudentId);
            const childObjectId = await insertStudent(childStudentId);
            const otherObjectId = await insertStudent(otherStudentId);

            const parentId = String(parentObjectId);
            const childId = String(childObjectId);
            const otherId = String(otherObjectId);
            ctx.userId = parentId;

            // --- Active linkage → access granted (Req 2.6) ---
            const relation = await ParentStudentRelation.create({
              parentId: parentObjectId,
              studentId: childObjectId,
              linkagePhone: normalizePhone(`+${digits}`),
              isActive: true,
            });

            // Resolves without throwing while the linkage is active.
            await expect(
              authorizationService.assertParentAccess(
                parentId,
                childId,
                'parent' as UserRole,
                ctx,
              ),
            ).resolves.toBeUndefined();

            // --- Unrelated / never-linked pair → 403 (Req 2.6) ---
            await expectForbidden(parentId, otherId, ctx);

            // --- Deactivate the linkage → access flips to denied (Req 7.2) ---
            await ParentStudentRelation.updateOne(
              { _id: relation._id },
              { $set: { isActive: false } },
            );

            await expectForbidden(parentId, childId, ctx);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
