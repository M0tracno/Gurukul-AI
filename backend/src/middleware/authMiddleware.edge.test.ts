import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

/**
 * Edge-case unit tests for authentication and authorization.
 *
 * Validates:
 * - Requirements 4.7: out-of-scope record access returns 403
 * - Requirements 4.8: missing/invalid tokens return 401
 * - Requirements 22.1: expired or malformed tokens are rejected with 401
 */

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the authTokenService
const mockValidateAccessToken = jest.fn<() => Promise<{ userId: string; role: string; iat: number; exp: number }>>();
jest.unstable_mockModule('../services/authTokenService.js', () => ({
  authTokenService: {
    validateAccessToken: mockValidateAccessToken,
  },
}));

const { authMiddleware } = await import('./authMiddleware.js');
const { requireRoles } = await import('./rbacMiddleware.js');
const { AppError } = await import('./errorHandler.js');
import { authTokenService } from '../services/authTokenService.js';
import { AuthorizationService } from '../services/authorizationService.js';

function createMockRequest(headers: Record<string, string> = {}, user?: { userId: string; role: string }): Request {
  const req = { headers } as unknown as Request;
  if (user) {
    (req as unknown as { user: typeof user }).user = user;
  }
  return req;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('authMiddleware — edge cases (Requirements 4.8, 22.1)', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn() as unknown as NextFunction;
    jest.clearAllMocks();
  });

  describe('expired tokens', () => {
    it('should reject an expired JWT with 401 and an expiration message', async () => {
      mockValidateAccessToken.mockRejectedValue(
        new Error('Access token has expired'),
      );

      const req = createMockRequest({ authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.fake' });

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
        expect((error as InstanceType<typeof AppError>).message).toMatch(/expired/i);
      }

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject a token whose exp claim is in the past with 401', async () => {
      mockValidateAccessToken.mockRejectedValue(
        new Error('Access token has expired'),
      );

      const req = createMockRequest({ authorization: 'Bearer expired.token.value' });

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
        expect((error as InstanceType<typeof AppError>).errorCode).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('malformed tokens', () => {
    it('should reject a token with invalid JWT format (not 3 dot-separated segments) with 401', async () => {
      mockValidateAccessToken.mockRejectedValue(
        new Error('Invalid access token'),
      );

      const req = createMockRequest({ authorization: 'Bearer not-a-jwt' });

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
        expect((error as InstanceType<typeof AppError>).message).toMatch(/invalid/i);
      }

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject a token with bad signature with 401', async () => {
      mockValidateAccessToken.mockRejectedValue(
        new Error('Invalid access token'),
      );

      // A structurally valid JWT but with a tampered signature
      const req = createMockRequest({
        authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoic3R1ZGVudCJ9.TAMPERED_SIGNATURE',
      });

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
        expect((error as InstanceType<typeof AppError>).errorCode).toBe('UNAUTHORIZED');
      }

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject a token with corrupted base64 payload with 401', async () => {
      mockValidateAccessToken.mockRejectedValue(
        new Error('Invalid access token'),
      );

      const req = createMockRequest({
        authorization: 'Bearer eyJhbGciOi.!!!corrupted!!!.signature',
      });

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
        expect((error as InstanceType<typeof AppError>).message).toMatch(/invalid/i);
      }
    });

    it('should reject an empty string token with 401', async () => {
      const req = createMockRequest({ authorization: 'Bearer ' });

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
      }

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when Authorization header has wrong scheme with 401', async () => {
      const req = createMockRequest({ authorization: 'Token abc.def.ghi' });

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
        expect((error as InstanceType<typeof AppError>).message).toMatch(/bearer/i);
      }
    });
  });

  describe('missing tokens', () => {
    it('should reject a request with no Authorization header with 401', async () => {
      const req = createMockRequest({});

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
        expect((error as InstanceType<typeof AppError>).message).toMatch(/missing/i);
      }

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject a request with Authorization header set to undefined with 401', async () => {
      const req = { headers: {} } as unknown as Request;

      try {
        await authMiddleware(req, createMockResponse(), mockNext);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
      }
    });
  });
});

describe('requireRoles — out-of-scope denial messages (Requirement 4.7)', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn() as unknown as NextFunction;
  });

  it('should deny a student accessing admin-only route with 403 and descriptive message', () => {
    const middleware = requireRoles('admin');
    const req = createMockRequest({}, { userId: 'student-1', role: 'student' });

    try {
      middleware(req, createMockResponse(), mockNext);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
      expect((error as InstanceType<typeof AppError>).message).toContain('student');
      expect((error as InstanceType<typeof AppError>).message).toContain('permission');
    }

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should deny a parent accessing teacher-only route with 403 and a message mentioning the role', () => {
    const middleware = requireRoles('teacher', 'admin');
    const req = createMockRequest({}, { userId: 'parent-1', role: 'parent' });

    try {
      middleware(req, createMockResponse(), mockNext);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
      expect((error as InstanceType<typeof AppError>).message).toContain('parent');
      expect((error as InstanceType<typeof AppError>).message).toContain('permission');
    }
  });

  it('should deny a teacher accessing student-only route with 403 and descriptive message', () => {
    const middleware = requireRoles('student');
    const req = createMockRequest({}, { userId: 'teacher-1', role: 'teacher' });

    try {
      middleware(req, createMockResponse(), mockNext);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
      expect((error as InstanceType<typeof AppError>).message).toContain('teacher');
      expect((error as InstanceType<typeof AppError>).errorCode).toBe('FORBIDDEN');
    }
  });

  it('should produce 401 when no user is attached (unauthenticated request reaches role check)', () => {
    const middleware = requireRoles('admin', 'teacher');
    const req = createMockRequest({}); // No user

    try {
      middleware(req, createMockResponse(), mockNext);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
      expect((error as InstanceType<typeof AppError>).errorCode).toBe('UNAUTHORIZED');
    }
  });
});

describe('AuthorizationService — out-of-scope denial messages (Requirement 4.7)', () => {
  const service = new AuthorizationService();

  describe('assertStudentOwnership', () => {
    it('should deny a student accessing another student\'s records with 403 and descriptive message', () => {
      try {
        service.assertStudentOwnership('student-A', 'student-B', 'student');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as InstanceType<typeof AppError>).statusCode).toBe(403);
        expect((error as InstanceType<typeof AppError>).message).toContain('own records');
      }
    });

    it('should allow a student accessing their own records', () => {
      expect(() => {
        service.assertStudentOwnership('student-A', 'student-A', 'student');
      }).not.toThrow();
    });

    it('should allow admin to access any student records (bypass)', () => {
      expect(() => {
        service.assertStudentOwnership('admin-1', 'student-B', 'admin');
      }).not.toThrow();
    });
  });
});
