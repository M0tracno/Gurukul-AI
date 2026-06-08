import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mongoSanitizeMiddleware, containsMongoOperators } from './mongoSanitize.js';
import { AppError } from './errorHandler.js';
import { logger } from '../utils/logger.js';
import type { Request, Response, NextFunction } from 'express';

let warnSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
});

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    path: '/test',
    method: 'POST',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  return {} as unknown as Response;
}

describe('containsMongoOperators', () => {
  it('returns false for null/undefined', () => {
    expect(containsMongoOperators(null)).toBe(false);
    expect(containsMongoOperators(undefined)).toBe(false);
  });

  it('returns false for plain strings without operators', () => {
    expect(containsMongoOperators('hello world')).toBe(false);
    expect(containsMongoOperators('john@example.com')).toBe(false);
    expect(containsMongoOperators('')).toBe(false);
  });

  it('returns true for strings containing MongoDB operators', () => {
    expect(containsMongoOperators('{"$gt": 5}')).toBe(true);
    expect(containsMongoOperators('$ne')).toBe(true);
    expect(containsMongoOperators('prefix $where suffix')).toBe(true);
  });

  it('returns false for plain objects without operators', () => {
    expect(containsMongoOperators({ name: 'Alice', age: 25 })).toBe(false);
    expect(containsMongoOperators({ email: 'a@b.com' })).toBe(false);
  });

  it('returns true when an object key starts with $', () => {
    expect(containsMongoOperators({ $gt: 5 })).toBe(true);
    expect(containsMongoOperators({ $ne: 'admin' })).toBe(true);
    expect(containsMongoOperators({ $where: 'this.a > 1' })).toBe(true);
  });

  it('returns true for nested objects with $ keys', () => {
    expect(containsMongoOperators({ user: { password: { $ne: '' } } })).toBe(true);
    expect(containsMongoOperators({ filter: { age: { $gt: 18 } } })).toBe(true);
  });

  it('returns true for string values containing operators in nested objects', () => {
    expect(containsMongoOperators({ query: 'find $regex pattern' })).toBe(true);
  });

  it('returns true for arrays containing operator patterns', () => {
    expect(containsMongoOperators([{ $or: [{ a: 1 }] }])).toBe(true);
    expect(containsMongoOperators(['safe', '$gt'])).toBe(true);
  });

  it('returns false for arrays of safe values', () => {
    expect(containsMongoOperators(['hello', 'world'])).toBe(false);
    expect(containsMongoOperators([1, 2, 3])).toBe(false);
  });

  it('returns false for numbers and booleans', () => {
    expect(containsMongoOperators(42)).toBe(false);
    expect(containsMongoOperators(true)).toBe(false);
    expect(containsMongoOperators(false)).toBe(false);
  });

  it('detects $elemMatch operator', () => {
    expect(containsMongoOperators({ scores: { $elemMatch: { $gt: 80 } } })).toBe(true);
  });

  it('detects $exists operator', () => {
    expect(containsMongoOperators({ password: { $exists: true } })).toBe(true);
  });

  it('detects $in and $nin operators', () => {
    expect(containsMongoOperators({ role: { $in: ['admin'] } })).toBe(true);
    expect(containsMongoOperators({ role: { $nin: ['user'] } })).toBe(true);
  });
});

describe('mongoSanitizeMiddleware', () => {
  it('calls next() for safe request data', () => {
    const req = createMockReq({
      body: { username: 'alice', password: 'secret123' },
      query: { page: '1', limit: '10' } as unknown as Request['query'],
      params: { id: '507f1f77bcf86cd799439011' },
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    mongoSanitizeMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('throws AppError.badRequest when body contains $ key operator', () => {
    const req = createMockReq({
      body: { username: { $ne: '' } },
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    expect(() => mongoSanitizeMiddleware(req, res, next)).toThrow(AppError);
    expect(() => mongoSanitizeMiddleware(req, res, next)).toThrow(
      'Request contains prohibited operators',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('throws AppError.badRequest when query contains $ key operator', () => {
    const req = createMockReq({
      query: { age: { $gt: '18' } } as unknown as Request['query'],
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    expect(() => mongoSanitizeMiddleware(req, res, next)).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws AppError.badRequest when params contains $ key operator', () => {
    const req = createMockReq({
      params: { id: { $regex: '.*' } } as unknown as Request['params'],
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    expect(() => mongoSanitizeMiddleware(req, res, next)).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws when body contains string value with MongoDB operator', () => {
    const req = createMockReq({
      body: { search: '$where this.role === "admin"' },
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    expect(() => mongoSanitizeMiddleware(req, res, next)).toThrow(
      'Request contains prohibited operators',
    );
  });

  it('logs a security event when injection is detected', () => {
    const req = createMockReq({
      body: { username: { $ne: '' } },
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    try {
      mongoSanitizeMiddleware(req, res, next);
    } catch {
      // Expected
    }

    expect(warnSpy).toHaveBeenCalledWith(
      'NoSQL injection attempt detected',
      expect.objectContaining({
        event: 'security:nosql_injection',
        source: 'body',
        ip: '192.168.1.100',
        path: '/test',
        method: 'POST',
      }),
    );
  });

  it('extracts IP from x-forwarded-for header', () => {
    const req = createMockReq({
      body: { role: { $ne: 'user' } },
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    try {
      mongoSanitizeMiddleware(req, res, next);
    } catch {
      // Expected
    }

    expect(warnSpy).toHaveBeenCalledWith(
      'NoSQL injection attempt detected',
      expect.objectContaining({
        ip: '10.0.0.1',
      }),
    );
  });

  it('falls back to socket remoteAddress when no x-forwarded-for', () => {
    const req = createMockReq({
      body: { role: { $ne: 'user' } },
      headers: {},
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    try {
      mongoSanitizeMiddleware(req, res, next);
    } catch {
      // Expected
    }

    expect(warnSpy).toHaveBeenCalledWith(
      'NoSQL injection attempt detected',
      expect.objectContaining({
        ip: '127.0.0.1',
      }),
    );
  });

  it('detects deeply nested injection attempts', () => {
    const req = createMockReq({
      body: {
        filter: {
          conditions: [{ field: 'age', operator: { $gt: 0 } }],
        },
      },
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    expect(() => mongoSanitizeMiddleware(req, res, next)).toThrow(
      'Request contains prohibited operators',
    );
  });

  it('allows requests with empty body/query/params', () => {
    const req = createMockReq({
      body: {},
      query: {} as unknown as Request['query'],
      params: {},
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    mongoSanitizeMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('thrown error is HTTP 400 with correct code', () => {
    const req = createMockReq({
      body: { data: { $exists: true } },
    });
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    try {
      mongoSanitizeMiddleware(req, res, next);
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.errorCode).toBe('BAD_REQUEST');
      expect(appErr.message).toBe('Request contains prohibited operators');
    }
  });
});
