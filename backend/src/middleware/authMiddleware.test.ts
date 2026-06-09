import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock logger to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the authTokenService with unstable_mockModule for ESM compatibility
const mockValidateAccessToken = jest.fn<() => Promise<{ userId: string; role: string; iat: number; exp: number }>>();
jest.unstable_mockModule('../services/authTokenService.js', () => ({
  authTokenService: {
    validateAccessToken: mockValidateAccessToken,
  },
}));

const { authMiddleware } = await import('./authMiddleware.js');
const { AppError } = await import('./errorHandler.js');

function createMockRequest(headers: Record<string, string> = {}): Request {
  return {
    headers,
  } as unknown as Request;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('authMiddleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn() as unknown as NextFunction;
    jest.clearAllMocks();
  });

  it('should throw 401 when Authorization header is missing', async () => {
    const req = createMockRequest({});

    await expect(
      authMiddleware(req, createMockResponse(), mockNext),
    ).rejects.toThrow(AppError);

    try {
      await authMiddleware(req, createMockResponse(), mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
      expect((error as InstanceType<typeof AppError>).message).toContain('missing');
    }
  });

  it('should throw 401 when Authorization header does not use Bearer scheme', async () => {
    const req = createMockRequest({ authorization: 'Basic abc123' });

    await expect(
      authMiddleware(req, createMockResponse(), mockNext),
    ).rejects.toThrow(AppError);

    try {
      await authMiddleware(req, createMockResponse(), mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
      expect((error as InstanceType<typeof AppError>).message).toContain('Bearer');
    }
  });

  it('should throw 401 when token is empty after Bearer prefix', async () => {
    const req = createMockRequest({ authorization: 'Bearer ' });

    await expect(
      authMiddleware(req, createMockResponse(), mockNext),
    ).rejects.toThrow(AppError);

    try {
      await authMiddleware(req, createMockResponse(), mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
    }
  });

  it('should throw 401 when token is expired', async () => {
    mockValidateAccessToken.mockRejectedValue(
      new Error('Access token has expired'),
    );

    const req = createMockRequest({ authorization: 'Bearer expired-token' });

    await expect(
      authMiddleware(req, createMockResponse(), mockNext),
    ).rejects.toThrow(AppError);

    try {
      await authMiddleware(req, createMockResponse(), mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
      expect((error as InstanceType<typeof AppError>).message).toContain('expired');
    }
  });

  it('should throw 401 when token is invalid', async () => {
    mockValidateAccessToken.mockRejectedValue(
      new Error('Invalid access token'),
    );

    const req = createMockRequest({ authorization: 'Bearer invalid-token' });

    await expect(
      authMiddleware(req, createMockResponse(), mockNext),
    ).rejects.toThrow(AppError);

    try {
      await authMiddleware(req, createMockResponse(), mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(401);
      expect((error as InstanceType<typeof AppError>).message).toContain('Invalid');
    }
  });

  it('should set req.user and call next() when token is valid', async () => {
    const decoded = {
      userId: 'user-123',
      role: 'student' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    };

    mockValidateAccessToken.mockResolvedValue(decoded);

    const req = createMockRequest({ authorization: 'Bearer valid-token' });

    await authMiddleware(req, createMockResponse(), mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect((req as unknown as { user: { userId: string; role: string } }).user).toEqual({
      userId: 'user-123',
      role: 'student',
    });
  });

  it('should set correct role for teacher tokens', async () => {
    const decoded = {
      userId: 'teacher-456',
      role: 'teacher' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    };

    mockValidateAccessToken.mockResolvedValue(decoded);

    const req = createMockRequest({ authorization: 'Bearer teacher-token' });

    await authMiddleware(req, createMockResponse(), mockNext);

    expect((req as unknown as { user: { userId: string; role: string } }).user).toEqual({
      userId: 'teacher-456',
      role: 'teacher',
    });
  });
});
