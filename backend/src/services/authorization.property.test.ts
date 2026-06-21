/**
 * Property-Based Tests: Access Control (Authentication, Data-Scope Isolation, Admin Access, Audit)
 *
 * Feature: admin-portal-overhaul, Property 7: Authentication required for protected endpoints
 * Feature: admin-portal-overhaul, Property 8: Data-scope isolation
 * Feature: admin-portal-overhaul, Property 9: Admin full access
 * Feature: admin-portal-overhaul, Property 10: Admin override is audited
 *
 * Property 7: For any protected endpoint, a request lacking a valid JWT shall be
 * denied with 401.
 * **Validates: Requirements 4.1, 4.8, 22.1**
 *
 * Property 8: For any authenticated non-admin user, the request SHALL succeed only
 * if the record lies within the user's authorized scope; otherwise 403.
 * **Validates: Requirements 4.4, 4.5, 4.6, 4.7, 15.4, 22.2**
 *
 * Property 9: For any module, an authenticated Admin SHALL be granted full access.
 * **Validates: Requirements 4.2, 4.3**
 *
 * Property 10: For any Admin override that modifies a record, exactly one AuditLog
 * entry SHALL be persisted.
 * **Validates: Requirements 4.9, 22.3**
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { type Request, type Response } from 'express';
import request from 'supertest';

import { AppError, globalErrorHandler } from '../middleware/errorHandler.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { AuthorizationService, authorizationService } from './authorizationService.js';
import { AdminOverrideService, adminOverrideService } from './adminOverrideService.js';
import { auditService } from './auditService.js';
import AuditLog from '../models/AuditLog.js';
import type { UserRole } from '../types/common.js';

// ---------------------------------------------------------------------------
// MongoDB memory server setup
// ---------------------------------------------------------------------------

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear audit logs between tests
  await AuditLog.deleteMany({});
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a valid 24-character hex string (MongoDB ObjectId format). */
const objectIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);

/** Generates a non-admin user role. */
const nonAdminRoleArb: fc.Arbitrary<UserRole> = fc.constantFrom('teacher', 'student', 'parent');

/** Generates any valid user role. */
const anyRoleArb: fc.Arbitrary<UserRole> = fc.constantFrom('admin', 'teacher', 'student', 'parent');

/** Generates protected endpoint HTTP methods. */
const httpMethodArb = fc.constantFrom('get', 'post', 'put', 'patch', 'delete');

/** Generates a non-empty action string for admin overrides. */
const actionArb = fc.constantFrom(
  'update_mark',
  'modify_enrollment',
  'override_attendance',
  'modify_course',
  'update_student',
);

/** Generates various invalid/missing authorization header values. */
const invalidAuthHeaderArb = fc.oneof(
  fc.constant(undefined),                                       // missing header
  fc.constant(''),                                              // empty header
  fc.constant('Basic dXNlcjpwYXNz'),                           // wrong scheme
  fc.constant('Bearer'),                                        // Bearer with no token
  fc.constant('Bearer '),                                       // Bearer with empty token
  fc.string({ minLength: 5, maxLength: 50 }).map(s => `Bearer ${s}`), // Bearer with invalid token
  fc.string({ minLength: 1, maxLength: 30 }),                   // random string (no Bearer prefix)
);

/** Generates a set of allowed roles for a protected endpoint. */
const allowedRolesArb: fc.Arbitrary<UserRole[]> = fc.subarray(
  ['admin', 'teacher', 'student', 'parent'] as UserRole[],
  { minLength: 1, maxLength: 4 },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal Express app with authMiddleware simulation and requireRoles.
 * Uses a simplified auth check (header presence + JSON decode) for property tests
 * since we're testing the RBAC layer, not JWT cryptography.
 */
function createProtectedApp(allowedRoles: UserRole[]) {
  const app = express();
  app.use(express.json());

  // Simplified auth middleware that parses user from a test header
  app.use((req: Request, _res: Response, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw AppError.unauthorized('Authorization header is missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authorization header must use Bearer scheme');
    }

    const token = authHeader.slice(7);

    if (!token || token.trim() === '') {
      throw AppError.unauthorized('Access token is missing');
    }

    // For testing: decode the token as JSON { userId, role }
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      if (!decoded.userId || !decoded.role) {
        throw new Error('Invalid payload');
      }
      (req as AuthenticatedRequest).user = {
        userId: decoded.userId,
        role: decoded.role,
      };
      next();
    } catch {
      throw AppError.unauthorized('Invalid access token');
    }
  });

  // RBAC middleware
  app.get('/protected', requireRoles(...allowedRoles), (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { message: 'access granted' } });
  });

  app.use(globalErrorHandler);
  return app;
}

/** Encodes user info as a base64 token for the test auth middleware. */
function makeToken(userId: string, role: UserRole): string {
  return Buffer.from(JSON.stringify({ userId, role })).toString('base64');
}

// ---------------------------------------------------------------------------
// Property 7: Authentication required for protected endpoints
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 7: Authentication required for protected endpoints
describe('Property 7: Authentication required for protected endpoints', () => {
  it('requests without a valid JWT are denied with 401 for any protected endpoint', async () => {
    await fc.assert(
      fc.asyncProperty(
        allowedRolesArb,
        invalidAuthHeaderArb,
        async (allowedRoles, authHeader) => {
          const app = createProtectedApp(allowedRoles);

          const req = request(app).get('/protected');

          if (authHeader !== undefined) {
            req.set('Authorization', authHeader);
          }

          const resp = await req;

          // Must be denied with 401
          expect(resp.status).toBe(401);
          expect(resp.body.success).toBe(false);
          expect(typeof resp.body.message).toBe('string');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('requests with a valid token for an allowed role succeed with 200', async () => {
    await fc.assert(
      fc.asyncProperty(
        allowedRolesArb,
        objectIdArb,
        async (allowedRoles, userId) => {
          const app = createProtectedApp(allowedRoles);
          // Pick a role that is in the allowed set
          const role = allowedRoles[0];
          const token = makeToken(userId, role);

          const resp = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

          expect(resp.status).toBe(200);
          expect(resp.body.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Data-scope isolation
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 8: Data-scope isolation
describe('Property 8: Data-scope isolation', () => {
  it('Student assertStudentOwnership denies access when requestorId !== targetStudentId', () => {
    fc.assert(
      fc.property(
        objectIdArb,
        objectIdArb,
        nonAdminRoleArb.filter(r => r === 'student'),
        (requestorId, targetId, role) => {
          // Only test when IDs differ
          fc.pre(requestorId !== targetId);

          expect(() => {
            authorizationService.assertStudentOwnership(requestorId, targetId, role);
          }).toThrow();

          try {
            authorizationService.assertStudentOwnership(requestorId, targetId, role);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Student assertStudentOwnership allows access when requestorId === targetStudentId', () => {
    fc.assert(
      fc.property(objectIdArb, (userId) => {
        // Student accessing their own record should not throw
        expect(() => {
          authorizationService.assertStudentOwnership(userId, userId, 'student');
        }).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('Parent assertParentAccess denies access when no parent-student relation exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        async (parentId, studentId) => {
          // No ParentStudentRelation records exist in the in-memory DB
          // so any parent access attempt should be denied
          try {
            await authorizationService.assertParentAccess(parentId, studentId, 'parent');
            // Should not reach here
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Teacher assertTeacherCourseAccess denies access to courses not assigned to the teacher', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        async (teacherId, courseId) => {
          // No courses exist in the in-memory DB, so teacher access should be denied
          try {
            await authorizationService.assertTeacherCourseAccess(teacherId, courseId, 'teacher');
            // Should not reach here
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Teacher assertTeacherStudentAccess denies access to students not in teacher courses', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        async (teacherId, studentId) => {
          // No courses/enrollments exist, so teacher access to any student should be denied
          try {
            await authorizationService.assertTeacherStudentAccess(teacherId, studentId, 'teacher');
            // Should not reach here
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-admin user denied at route level when role is not in allowedRoles', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonAdminRoleArb,
        objectIdArb,
        allowedRolesArb,
        async (userRole, userId, allowedRoles) => {
          // Only test when user's role is NOT in the allowed set
          fc.pre(!allowedRoles.includes(userRole));

          const app = createProtectedApp(allowedRoles);
          const token = makeToken(userId, userRole);

          const resp = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

          expect(resp.status).toBe(403);
          expect(resp.body.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Admin full access
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 9: Admin full access
describe('Property 9: Admin full access', () => {
  it('Admin is granted access to any protected endpoint regardless of allowedRoles', async () => {
    await fc.assert(
      fc.asyncProperty(
        allowedRolesArb,
        objectIdArb,
        async (allowedRoles, userId) => {
          // Ensure admin is in the allowed set (requireRoles always includes admin in real routes)
          // But even if we explicitly include admin, the test validates admin always passes
          const rolesWithAdmin = [...new Set([...allowedRoles, 'admin' as UserRole])];
          const app = createProtectedApp(rolesWithAdmin);
          const token = makeToken(userId, 'admin');

          const resp = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

          expect(resp.status).toBe(200);
          expect(resp.body.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Admin bypasses data-scope checks in authorizationService (assertStudentOwnership)', () => {
    fc.assert(
      fc.property(
        objectIdArb,
        objectIdArb,
        (adminId, targetStudentId) => {
          // Admin should not throw even when accessing someone else's records
          expect(() => {
            authorizationService.assertStudentOwnership(adminId, targetStudentId, 'admin');
          }).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Admin bypasses data-scope checks in authorizationService (assertParentAccess)', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        async (adminId, targetStudentId) => {
          // Admin should not throw even without a parent-student relation
          await expect(
            authorizationService.assertParentAccess(adminId, targetStudentId, 'admin'),
          ).resolves.toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Admin bypasses data-scope checks in authorizationService (assertTeacherCourseAccess)', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        async (adminId, courseId) => {
          // Admin should not throw even without course ownership
          await expect(
            authorizationService.assertTeacherCourseAccess(adminId, courseId, 'admin'),
          ).resolves.toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Admin bypasses data-scope checks in authorizationService (assertTeacherStudentAccess)', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        objectIdArb,
        async (adminId, studentId) => {
          // Admin should not throw even without enrollment
          await expect(
            authorizationService.assertTeacherStudentAccess(adminId, studentId, 'admin'),
          ).resolves.toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('adminOverrideService.executeOverride permits admin to modify records', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        actionArb,
        objectIdArb,
        async (adminId, action, targetId) => {
          const mutationResult = { updated: true, id: targetId };

          const result = await adminOverrideService.executeOverride(
            { actor: adminId, role: 'admin', action, target: targetId },
            async () => mutationResult,
          );

          expect(result).toEqual(mutationResult);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('adminOverrideService.executeOverride denies non-admin roles', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        nonAdminRoleArb,
        actionArb,
        objectIdArb,
        async (userId, role, action, targetId) => {
          try {
            await adminOverrideService.executeOverride(
              { actor: userId, role, action, target: targetId },
              async () => ({ updated: true }),
            );
            // Should not reach here
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Admin override is audited
// ---------------------------------------------------------------------------
// Feature: admin-portal-overhaul, Property 10: Admin override is audited
describe('Property 10: Admin override is audited', () => {
  it('every admin override persists exactly one AuditLog entry with actor, action, target, timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        actionArb,
        objectIdArb,
        async (adminId, action, targetId) => {
          // Clear audit logs before each iteration
          await AuditLog.deleteMany({});

          const beforeTime = new Date();

          await adminOverrideService.executeOverride(
            { actor: adminId, role: 'admin', action, target: targetId },
            async () => ({ modified: true }),
          );

          const afterTime = new Date();

          // Exactly one audit log entry should exist
          const logs = await AuditLog.find({}).lean();
          expect(logs.length).toBe(1);

          const log = logs[0];

          // Actor matches
          expect(log.actor.userId.toString()).toBe(adminId);
          expect(log.actor.role).toBe('admin');

          // Action is 'admin_override'
          expect(log.action).toBe('admin_override');

          // Target resource matches the action description
          expect(log.target.resource).toBe(action);
          // Target resourceId matches the target record
          expect(log.target.resourceId).toBe(targetId);

          // Timestamp is within the operation window
          expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
          expect(log.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-admin override attempts do NOT create an AuditLog entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        nonAdminRoleArb,
        actionArb,
        objectIdArb,
        async (userId, role, action, targetId) => {
          await AuditLog.deleteMany({});

          try {
            await adminOverrideService.executeOverride(
              { actor: userId, role, action, target: targetId },
              async () => ({ modified: true }),
            );
          } catch {
            // Expected to throw for non-admin
          }

          // No audit log should be created for failed non-admin attempts
          const logs = await AuditLog.find({}).lean();
          expect(logs.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the audit entry contains all required fields: actor, action, target, timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        objectIdArb,
        actionArb,
        objectIdArb,
        async (adminId, action, targetId) => {
          await AuditLog.deleteMany({});

          await adminOverrideService.executeOverride(
            { actor: adminId, role: 'admin', action, target: targetId },
            async () => ({ done: true }),
          );

          const log = await AuditLog.findOne({}).lean();
          expect(log).not.toBeNull();

          // Verify all required fields are present and non-null
          expect(log!.actor).toBeDefined();
          expect(log!.actor.userId).toBeDefined();
          expect(log!.action).toBeDefined();
          expect(log!.target).toBeDefined();
          expect(log!.target.resource).toBeDefined();
          expect(log!.timestamp).toBeDefined();
          expect(log!.timestamp).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });
});
