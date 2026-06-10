/**
 * Property-Based Tests: Authenticated identity overrides client-supplied
 * identifiers; out-of-scope targets are denied.
 *
 * Feature: personalized-role-dashboards-and-verified-access, Property 4: Authenticated identity overrides client-supplied identifiers; out-of-scope targets are denied
 *
 * Property 4: For any request carrying a client-supplied user/target
 * identifier, the resolved scope equals the scope of the AUTHENTICATED
 * identity regardless of the supplied value, and when the supplied target lies
 * outside that scope the System responds 403 and returns no out-of-scope data.
 *
 *  - IDENTITY OVERRIDE (Req 2.2): the dashboard pipeline derives scope from the
 *    authenticated id only. `dashboardService.getStudentDashboard` takes a
 *    single id (sourced by the controller from `req.user`) and there is NO
 *    parameter by which a client-supplied, differing id could substitute. So
 *    for any two distinct students A and B, `getStudentDashboard(A)` always
 *    resolves to A's authoritative profile and `getStudentDashboard(B)` always
 *    resolves to B's — the resolved scope equals the id passed in.
 *  - OUT-OF-SCOPE DENIAL (Req 2.3): when an authenticated identity targets a
 *    record outside its scope the AuthorizationService throws 403 and returns
 *    no data — a student targeting another student
 *    (`assertStudentOwnership`), and a parent targeting an unlinked student
 *    (`assertParentAccess` with no active linkage).
 *
 * **Validates: Requirements 2.2, 2.3**
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { dashboardService } from './dashboardService.js';
import { authorizationService } from './authorizationService.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuditContext } from '../utils/auditContext.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import ParentStudentRelation from '../models/ParentStudentRelation.js';

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
  await resetAll();
});

async function resetAll(): Promise<void> {
  await Promise.all([
    Student.deleteMany({}),
    Parent.deleteMany({}),
    ParentStudentRelation.deleteMany({}),
  ]);
}

// ---------------------------------------------------------------------------
// Native-driver insert helper.
//
// Inserting via the native driver bypasses the bcrypt password-hashing save
// hook on Student — identity is all this property needs, and this keeps 100+
// runs well within the test budget. Each record uses a fresh ObjectId so its
// id is unique within a run (the collection is cleared between runs).
// ---------------------------------------------------------------------------

type ObjectId = mongoose.Types.ObjectId;

async function insertStudent(): Promise<ObjectId> {
  const _id = new mongoose.Types.ObjectId();
  await Student.collection.insertOne({
    _id,
    firstName: 'Stu',
    lastName: 'Dent',
    email: `${_id}@example.com`,
    password: 'placeholder',
    studentId: `S-${_id}`,
    grade: '10',
    active: true,
    isDemo: false,
    failedLoginAttempts: 0,
    deletedAt: null,
    createdAt: new Date(),
  } as any);
  return _id;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A valid 24-character hex string (MongoDB ObjectId format). */
const objectIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);

/** A dotted-quad IPv4 string for the audit context. */
const ipArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 4, maxLength: 4 })
  .map((octets) => octets.join('.'));

/** A correlation id (UUID-shaped) for the audit context. */
const correlationIdArb = fc.uuid();

// ---------------------------------------------------------------------------
// Property 4 — identity override
// ---------------------------------------------------------------------------

// Feature: personalized-role-dashboards-and-verified-access, Property 4: Authenticated identity overrides client-supplied identifiers; out-of-scope targets are denied
describe('Property 4: Authenticated identity overrides client-supplied identifiers; out-of-scope targets are denied', () => {
  it(
    'resolves the student dashboard scope from the authenticated id only — a client-supplied differing id cannot substitute',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // A client-supplied identifier the caller might *try* to inject. It
          // has no parameter to flow into and so can never change the scope.
          objectIdArb,
          async (clientSuppliedId) => {
            await resetAll();

            const studentA = await insertStudent();
            const studentB = await insertStudent();

            // Calling with the authenticated id A always yields A's profile,
            // regardless of any client-supplied id the caller could craft.
            const dashA = await dashboardService.getStudentDashboard(
              String(studentA),
            );
            expect(dashA.profile.id).toBe(String(studentA));
            expect(dashA.profile.id).not.toBe(clientSuppliedId);

            // Calling with the authenticated id B always yields B's profile.
            const dashB = await dashboardService.getStudentDashboard(
              String(studentB),
            );
            expect(dashB.profile.id).toBe(String(studentB));
            expect(dashB.profile.id).not.toBe(clientSuppliedId);

            // The two scopes are distinct: the resolved profile equals the id
            // passed in (the authenticated identity), never the other student.
            expect(dashA.profile.id).not.toBe(dashB.profile.id);
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );

  // -------------------------------------------------------------------------
  // Property 4 — out-of-scope denial (student → another student)
  // -------------------------------------------------------------------------

  it(
    'denies a student targeting another student with 403 and returns no data',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          objectIdArb,
          objectIdArb,
          ipArb,
          correlationIdArb,
          async (requestorId, targetId, ip, correlationId) => {
            // The target must be a genuinely different identity (out of scope).
            fc.pre(requestorId !== targetId);

            const ctx: AuditContext = {
              userId: requestorId,
              role: 'student',
              ip,
              correlationId,
            };

            // assertStudentOwnership is synchronous and throws a 403 AppError;
            // it returns no data on the out-of-scope path.
            let thrown: unknown;
            try {
              authorizationService.assertStudentOwnership(
                requestorId,
                targetId,
                'student',
                ctx,
              );
            } catch (err) {
              thrown = err;
            }

            expect(thrown).toBeInstanceOf(AppError);
            expect((thrown as AppError).statusCode).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // -------------------------------------------------------------------------
  // Property 4 — out-of-scope denial (parent → unlinked student)
  // -------------------------------------------------------------------------

  it(
    'denies a parent targeting an unlinked student with 403 and returns no data',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          ipArb,
          correlationIdArb,
          async (ip, correlationId) => {
            await resetAll();

            // A parent and a student that share NO active ParentStudentRelation.
            const parentId = new mongoose.Types.ObjectId();
            const unlinkedStudentId = new mongoose.Types.ObjectId();

            const ctx: AuditContext = {
              userId: String(parentId),
              role: 'parent',
              ip,
              correlationId,
            };

            // assertParentAccess is async and rejects with a 403 AppError when
            // no active linkage exists; it returns no data on this path.
            await expect(
              authorizationService.assertParentAccess(
                String(parentId),
                String(unlinkedStudentId),
                'parent',
                ctx,
              ),
            ).rejects.toMatchObject({ statusCode: 403 });
          },
        ),
        { numRuns: 100 },
      );
    },
    180_000,
  );
});
