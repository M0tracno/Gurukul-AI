import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

import { requireRoles, adminOnly, teacherOrAdmin } from './rbacMiddleware.js';
import { AppError } from './errorHandler.js';

function createMockRequest(user?: { userId: string; role: string }): Request {
  const req = {} as Request;
  if (user) {
    (req as unknown as { user: typeof user }).user = user;
  }
  return req;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('rbacMiddleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn() as unknown as NextFunction;
  });

  describe('requireRoles', () => {
    it('should call next() when user has an allowed role', () => {
      const middleware = requireRoles('admin', 'teacher');
      const req = createMockRequest({ userId: 'user-1', role: 'admin' });

      middleware(req, createMockResponse(), mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should throw 401 UNAUTHORIZED when user is not attached to request', () => {
      const middleware = requireRoles('admin');
      const req = createMockRequest(); // no user

      expect(() => {
        middleware(req, createMockResponse(), mockNext);
      }).toThrow(AppError);

      try {
        middleware(req, createMockResponse(), mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(401);
        expect((error as AppError).errorCode).toBe('UNAUTHORIZED');
      }
    });

    it('should throw 403 FORBIDDEN when user role is not in allowed list', () => {
      const middleware = requireRoles('admin');
      const req = createMockRequest({ userId: 'user-1', role: 'student' });

      expect(() => {
        middleware(req, createMockResponse(), mockNext);
      }).toThrow(AppError);

      try {
        middleware(req, createMockResponse(), mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
        expect((error as AppError).errorCode).toBe('FORBIDDEN');
        expect((error as AppError).message).toContain("student");
      }
    });

    it('should allow student role when it is in the allowed list', () => {
      const middleware = requireRoles('student', 'parent');
      const req = createMockRequest({ userId: 'user-1', role: 'student' });

      middleware(req, createMockResponse(), mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should allow parent role when it is in the allowed list', () => {
      const middleware = requireRoles('parent');
      const req = createMockRequest({ userId: 'parent-1', role: 'parent' });

      middleware(req, createMockResponse(), mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should deny teacher when only student and parent are allowed', () => {
      const middleware = requireRoles('student', 'parent');
      const req = createMockRequest({ userId: 'teacher-1', role: 'teacher' });

      expect(() => {
        middleware(req, createMockResponse(), mockNext);
      }).toThrow(AppError);
    });
  });

  describe('convenience middlewares', () => {
    it('adminOnly should only allow admin role', () => {
      const req = createMockRequest({ userId: 'a-1', role: 'admin' });
      adminOnly(req, createMockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('adminOnly should reject non-admin roles', () => {
      const req = createMockRequest({ userId: 't-1', role: 'teacher' });
      expect(() => {
        adminOnly(req, createMockResponse(), mockNext);
      }).toThrow(AppError);
    });

    it('teacherOrAdmin should allow teacher', () => {
      const req = createMockRequest({ userId: 't-1', role: 'teacher' });
      teacherOrAdmin(req, createMockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('teacherOrAdmin should allow admin', () => {
      const req = createMockRequest({ userId: 'a-1', role: 'admin' });
      teacherOrAdmin(req, createMockResponse(), mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('teacherOrAdmin should reject student', () => {
      const req = createMockRequest({ userId: 's-1', role: 'student' });
      expect(() => {
        teacherOrAdmin(req, createMockResponse(), mockNext);
      }).toThrow(AppError);
    });
  });
});
