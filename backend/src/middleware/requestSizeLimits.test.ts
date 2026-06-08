import { describe, it, expect } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

import { AppError } from './errorHandler.js';
import {
  fieldSizeLimitMiddleware,
  payloadTooLargeHandler,
  findOversizedField,
} from './requestSizeLimits.js';

function createMockRequest(body?: unknown): Request {
  return {
    body,
    headers: {},
    path: '/test',
    method: 'POST',
  } as unknown as Request;
}

function createMockResponse(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: undefined as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
  } as unknown as Response & { _status: number; _body: unknown };
  return res;
}

describe('findOversizedField', () => {
  it('should return undefined for empty objects', () => {
    expect(findOversizedField({}, 10000)).toBeUndefined();
  });

  it('should return undefined for null/undefined', () => {
    expect(findOversizedField(null, 10000)).toBeUndefined();
    expect(findOversizedField(undefined, 10000)).toBeUndefined();
  });

  it('should return undefined when all fields are within limits', () => {
    const obj = {
      name: 'John Doe',
      email: 'john@example.com',
      description: 'A short description',
    };
    expect(findOversizedField(obj, 10000)).toBeUndefined();
  });

  it('should detect oversized top-level string field', () => {
    const obj = { name: 'a'.repeat(10001) };
    const result = findOversizedField(obj, 10000);
    expect(result).toEqual({ field: 'name', length: 10001 });
  });

  it('should detect oversized nested string field', () => {
    const obj = {
      user: {
        profile: {
          bio: 'x'.repeat(15000),
        },
      },
    };
    const result = findOversizedField(obj, 10000);
    expect(result).toEqual({ field: 'user.profile.bio', length: 15000 });
  });

  it('should detect oversized field in arrays', () => {
    const obj = {
      items: ['short', 'b'.repeat(20000)],
    };
    const result = findOversizedField(obj, 10000);
    expect(result).toEqual({ field: 'items[1]', length: 20000 });
  });

  it('should not flag non-string fields (numbers, booleans)', () => {
    const obj = {
      count: 999999999,
      active: true,
      ratio: 3.14159265358979,
      empty: null,
    };
    expect(findOversizedField(obj, 10)).toBeUndefined();
  });

  it('should handle deeply nested objects', () => {
    const obj = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: 'z'.repeat(11000),
            },
          },
        },
      },
    };
    const result = findOversizedField(obj, 10000);
    expect(result).toEqual({
      field: 'level1.level2.level3.level4.value',
      length: 11000,
    });
  });
});

describe('fieldSizeLimitMiddleware', () => {
  const middleware = fieldSizeLimitMiddleware(10000);

  it('should call next() for normal-sized requests', () => {
    const req = createMockRequest({ name: 'John', email: 'john@test.com' });
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    middleware(req, createMockResponse() as unknown as Response, next);

    expect(nextCalled).toBe(true);
  });

  it('should call next() when body is undefined', () => {
    const req = createMockRequest(undefined);
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    middleware(req, createMockResponse() as unknown as Response, next);

    expect(nextCalled).toBe(true);
  });

  it('should call next() when body is a string (non-object)', () => {
    const req = createMockRequest('just a string');
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    middleware(req, createMockResponse() as unknown as Response, next);

    expect(nextCalled).toBe(true);
  });

  it('should throw AppError for fields exceeding 10000 characters', () => {
    const req = createMockRequest({ content: 'a'.repeat(10001) });
    const next: NextFunction = () => {};

    expect(() => {
      middleware(req, createMockResponse() as unknown as Response, next);
    }).toThrow(AppError);

    try {
      middleware(req, createMockResponse() as unknown as Response, next);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.errorCode).toBe('BAD_REQUEST');
      expect(appErr.message).toContain("Field 'content'");
      expect(appErr.message).toContain('10000 characters');
      expect(appErr.details).toHaveLength(1);
      expect(appErr.details![0].field).toBe('content');
      expect(appErr.details![0].reason).toContain('10000 character limit');
    }
  });

  it('should reject requests with nested fields exceeding limit', () => {
    const req = createMockRequest({
      user: {
        profile: {
          description: 'b'.repeat(12000),
        },
      },
    });
    const next: NextFunction = () => {};

    expect(() => {
      middleware(req, createMockResponse() as unknown as Response, next);
    }).toThrow(AppError);

    try {
      middleware(req, createMockResponse() as unknown as Response, next);
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(400);
      expect(appErr.message).toContain('user.profile.description');
    }
  });

  it('should not check non-string fields', () => {
    const req = createMockRequest({
      count: 999999999999,
      active: true,
      scores: [100, 200, 300],
      metadata: null,
    });
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    middleware(req, createMockResponse() as unknown as Response, next);

    expect(nextCalled).toBe(true);
  });

  it('should allow custom max field length', () => {
    const strictMiddleware = fieldSizeLimitMiddleware(100);
    const req = createMockRequest({ name: 'a'.repeat(101) });
    const next: NextFunction = () => {};

    expect(() => {
      strictMiddleware(req, createMockResponse() as unknown as Response, next);
    }).toThrow(AppError);
  });

  it('should allow fields exactly at the limit', () => {
    const req = createMockRequest({ name: 'a'.repeat(10000) });
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    middleware(req, createMockResponse() as unknown as Response, next);

    expect(nextCalled).toBe(true);
  });
});

describe('payloadTooLargeHandler', () => {
  it('should handle entity.too.large errors', () => {
    const err = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });
    const req = createMockRequest();
    const res = createMockResponse();
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    payloadTooLargeHandler(err, req, res as unknown as Response, next);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({
      error: 'BAD_REQUEST',
      message: 'Request body exceeds the maximum allowed size of 10 MB',
      details: [
        {
          field: 'body',
          value: '[too large]',
          reason: 'Exceeds 10 MB size limit',
        },
      ],
    });
    expect(nextCalled).toBe(false);
  });

  it('should handle errors with status 413 even without type field', () => {
    const err = Object.assign(new Error('too large'), { status: 413 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next: NextFunction = () => {};

    payloadTooLargeHandler(
      err as Error & { type?: string; status?: number },
      req,
      res as unknown as Response,
      next,
    );

    expect(res._status).toBe(400);
  });

  it('should pass non-payload-size errors to next()', () => {
    const err = Object.assign(new Error('some other error'), {
      type: 'other',
      status: 500,
    });
    const req = createMockRequest();
    const res = createMockResponse();
    let passedErr: unknown = null;
    const next = ((e: unknown) => {
      passedErr = e;
    }) as unknown as NextFunction;

    payloadTooLargeHandler(err, req, res as unknown as Response, next);

    expect(passedErr).toBe(err);
    expect(res._status).toBe(0); // Response not touched
  });
});
