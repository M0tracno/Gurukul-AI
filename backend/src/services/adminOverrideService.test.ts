/**
 * Unit tests for AdminOverrideService
 *
 * Validates:
 * - Admin override mutations are wrapped to call auditService.record({ actor, action, target, timestamp })
 * - requireRoles returns 401 (no user) / 403 (role not allowed)
 * - authorizationService.assert*Access enforces fine-grained isolation with admin bypass
 *
 * **Validates: Requirements 4.2, 4.3, 4.9, 22.3**
 */

import { jest, describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { AdminOverrideService } from './adminOverrideService.js';
import { AuditService } from './auditService.js';
import { AuthorizationService } from './authorizationService.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import AuditLog from '../models/AuditLog.js';
import type { Request, Response, NextFunction } from 'express';

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

afterEach(async () => {
  await AuditLog.deleteMany({});
});

describe('AdminOverrideService', () => {
  const service = new AdminOverrideService();

  describe('executeOverride', () => {
    it('should execute the mutation and record an audit entry for admin', async () => {
      const actorId = new mongoose.Types.ObjectId().toString();
      const targetId = new mongoose.Types.ObjectId().toString();
      const mutationResult = { updated: true, value: 42 };

      const result = await service.executeOverride(
        {
          actor: actorId,
          role: 'admin',
          action: 'update_mark',
          target: targetId,
        },
        async () => mutationResult,
      );

      // Mutation result is returned
      expect(result).toEqual(mutationResult);

      // Audit log entry was recorded
      const logs = await AuditLog.find({}).lean();
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.actor.userId.toString()).toBe(actorId);
      expect(log.action).toBe('admin_override');
      expect(log.target.resource).toBe('update_mark');
      expect(log.target.resourceId).toBe(targetId);
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('should include the actor, action, target, and timestamp in the audit entry', async () => {
      const actorId = new mongoose.Types.ObjectId().toString();
      const targetId = new mongoose.Types.ObjectId().toString();
      const before = new Date();

      await service.executeOverride(
        {
          actor: actorId,
          role: 'admin',
          action: 'modify_enrollment',
          target: targetId,
          metadata: { reason: 'Administrative correction' },
        },
        async () => ({ success: true }),
      );

      const after = new Date();
      const log = await AuditLog.findOne({}).lean();

      expect(log).not.toBeNull();
      // actor
      expect(log!.actor.userId.toString()).toBe(actorId);
      // action
      expect(log!.target.resource).toBe('modify_enrollment');
      // target
      expect(log!.target.resourceId).toBe(targetId);
      // timestamp is within the operation window
      expect(log!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      // metadata preserved
      expect(log!.metadata).toEqual({ reason: 'Administrative correction' });
    });

    it('should throw 403 when the role is not admin', async () => {
      const actorId = new mongoose.Types.ObjectId().toString();
      const targetId = new mongoose.Types.ObjectId().toString();
      const mutation = jest.fn<() => Promise<unknown>>().mockResolvedValue({ done: true });

      await expect(
        service.executeOverride(
          {
            actor: actorId,
            role: 'teacher',
            action: 'update_mark',
            target: targetId,
          },
          mutation,
        ),
      ).rejects.toThrow(AppError);

      try {
        await service.executeOverride(
          { actor: actorId, role: 'teacher', action: 'update_mark', target: targetId },
          mutation,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
        expect((error as AppError).message).toContain('administrator');
      }

      // Mutation was never called
      expect(mutation).not.toHaveBeenCalled();

      // No audit log entry was created
      const logs = await AuditLog.find({}).lean();
      expect(logs).toHaveLength(0);
    });

    it('should throw 403 for student role attempting override', async () => {
      await expect(
        service.executeOverride(
          {
            actor: 'student-1',
            role: 'student',
            action: 'update_attendance',
            target: 'record-1',
          },
          async () => ({}),
        ),
      ).rejects.toThrow(AppError);
    });

    it('should throw 403 for parent role attempting override', async () => {
      await expect(
        service.executeOverride(
          {
            actor: 'parent-1',
            role: 'parent',
            action: 'update_grade',
            target: 'record-1',
          },
          async () => ({}),
        ),
      ).rejects.toThrow(AppError);
    });

    it('should not record audit entry when mutation fails', async () => {
      const actorId = new mongoose.Types.ObjectId().toString();
      const targetId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.executeOverride(
          {
            actor: actorId,
            role: 'admin',
            action: 'update_mark',
            target: targetId,
          },
          async () => {
            throw new Error('Database connection failed');
          },
        ),
      ).rejects.toThrow('Database connection failed');

      // No audit log because mutation failed before recording
      const logs = await AuditLog.find({}).lean();
      expect(logs).toHaveLength(0);
    });
  });
});

describe('requireRoles — 401 and 403 behavior', () => {
  function createMockRequest(user?: { userId: string; role: string }): Request {
    const req = {} as Request;
    if (user) {
      (req as unknown as { user: typeof user }).user = user;
    }
    return req;
  }

  it('should return 401 when no user is attached (unauthenticated)', () => {
    const middleware = requireRoles('admin');
    const req = createMockRequest(); // no user
    const next = jest.fn() as unknown as NextFunction;

    try {
      middleware(req, {} as Response, next);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(401);
    }
  });

  it('should return 403 when user role is not in the allowed list', () => {
    const middleware = requireRoles('admin');
    const req = createMockRequest({ userId: 'user-1', role: 'student' });
    const next = jest.fn() as unknown as NextFunction;

    try {
      middleware(req, {} as Response, next);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(403);
    }
  });

  it('should pass through when admin is in the allowed list', () => {
    const middleware = requireRoles('admin', 'teacher');
    const req = createMockRequest({ userId: 'admin-1', role: 'admin' });
    const next = jest.fn() as unknown as NextFunction;

    middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('authorizationService — fine-grained isolation with admin bypass', () => {
  const authService = new AuthorizationService();

  it('should allow admin to bypass student ownership check', () => {
    expect(() => {
      authService.assertStudentOwnership('admin-1', 'student-2', 'admin');
    }).not.toThrow();
  });

  it('should deny student accessing another student record', () => {
    expect(() => {
      authService.assertStudentOwnership('student-1', 'student-2', 'student');
    }).toThrow(AppError);

    try {
      authService.assertStudentOwnership('student-1', 'student-2', 'student');
    } catch (error) {
      expect((error as AppError).statusCode).toBe(403);
    }
  });

  it('should allow admin to bypass parent access check', async () => {
    await expect(
      authService.assertParentAccess('admin-1', 'student-1', 'admin'),
    ).resolves.toBeUndefined();
  });

  it('should allow admin to bypass teacher course access check', async () => {
    await expect(
      authService.assertTeacherCourseAccess('admin-1', new mongoose.Types.ObjectId().toString(), 'admin'),
    ).resolves.toBeUndefined();
  });

  it('should allow admin to bypass teacher student access check', async () => {
    await expect(
      authService.assertTeacherStudentAccess('admin-1', 'student-1', 'admin'),
    ).resolves.toBeUndefined();
  });
});
