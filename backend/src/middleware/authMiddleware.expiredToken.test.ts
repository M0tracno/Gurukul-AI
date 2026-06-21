import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

/**
 * Example test for expired-token rejection (Task 15.3).
 *
 * Crafts ONE real expired JWT signed with the configured JWT_SECRET and runs it
 * through the REAL authMiddleware -> authTokenService.validateAccessToken path
 * (no service mocking), asserting the request is rejected with HTTP 401 and an
 * error indicating the access token has expired.
 *
 * Validates: Requirements 1.3
 */

// Mock logger to avoid import.meta.url issues in ts-jest.
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const TEST_JWT_SECRET = 'test-secret-key-for-expired-token-example';

// Import AFTER setting up mocks; authTokenService is intentionally NOT mocked so
// the genuine jwt.verify expiry check runs.
const { authMiddleware } = await import('./authMiddleware.js');
const { AppError } = await import('./errorHandler.js');

function createMockRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('authMiddleware — expired token rejection (Requirement 1.3)', () => {
  let mockNext: NextFunction;

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  beforeEach(() => {
    mockNext = jest.fn() as unknown as NextFunction;
  });

  it('rejects a crafted expired access token with 401 and a token-expired error', async () => {
    // Craft one real access token whose exp claim is already in the past.
    const expiredToken = jwt.sign(
      { userId: 'user-expired-123', role: 'admin' },
      TEST_JWT_SECRET,
      { expiresIn: '-1s' },
    );

    const req = createMockRequest({ authorization: `Bearer ${expiredToken}` });

    try {
      await authMiddleware(req, createMockResponse(), mockNext);
      throw new Error('Expected authMiddleware to reject the expired token');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as InstanceType<typeof AppError>;
      expect(appError.statusCode).toBe(401);
      expect(appError.errorCode).toBe('UNAUTHORIZED');
      expect(appError.message).toMatch(/expired/i);
    }

    // The route handler must never run for an expired token.
    expect(mockNext).not.toHaveBeenCalled();
  });
});
