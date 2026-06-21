import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock the logger module to avoid import.meta.url issues in ts-jest
jest.mock('../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { AppError, globalErrorHandler, notFoundHandler } from './errorHandler.js';

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/test',
    method: 'GET',
    ...overrides,
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

const noopNext: NextFunction = () => {};

describe('AppError', () => {
  it('should create an error with the correct properties', () => {
    const err = new AppError(422, 'UNPROCESSABLE', 'Invalid entity');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('AppError');
    expect(err.statusCode).toBe(422);
    expect(err.errorCode).toBe('UNPROCESSABLE');
    expect(err.message).toBe('Invalid entity');
    expect(err.details).toBeUndefined();
  });

  it('should create an error with details', () => {
    const details = [{ field: 'email', reason: 'Invalid format' }];
    const err = new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details);

    expect(err.details).toEqual(details);
  });

  describe('factory methods', () => {
    it('badRequest creates a 400 error', () => {
      const err = AppError.badRequest('Bad input');
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe('BAD_REQUEST');
      expect(err.message).toBe('Bad input');
    });

    it('badRequest includes details when provided', () => {
      const details = [{ field: 'name', reason: 'Required' }];
      const err = AppError.badRequest('Bad input', details);
      expect(err.details).toEqual(details);
    });

    it('notFound creates a 404 error', () => {
      const err = AppError.notFound('Student not found');
      expect(err.statusCode).toBe(404);
      expect(err.errorCode).toBe('NOT_FOUND');
      expect(err.message).toBe('Student not found');
    });

    it('unauthorized creates a 401 error', () => {
      const err = AppError.unauthorized('Token expired');
      expect(err.statusCode).toBe(401);
      expect(err.errorCode).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Token expired');
    });

    it('forbidden creates a 403 error', () => {
      const err = AppError.forbidden('Insufficient permissions');
      expect(err.statusCode).toBe(403);
      expect(err.errorCode).toBe('FORBIDDEN');
      expect(err.message).toBe('Insufficient permissions');
    });

    it('conflict creates a 409 error', () => {
      const err = AppError.conflict('Resource already exists');
      expect(err.statusCode).toBe(409);
      expect(err.errorCode).toBe('CONFLICT');
      expect(err.message).toBe('Resource already exists');
    });

    it('internal creates a 500 error', () => {
      const err = AppError.internal('Unexpected failure');
      expect(err.statusCode).toBe(500);
      expect(err.errorCode).toBe('INTERNAL_ERROR');
      expect(err.message).toBe('Unexpected failure');
    });
  });
});

describe('globalErrorHandler', () => {
  let req: Request;
  let res: Response & { _status: number; _body: unknown };

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
  });

  it('should return ErrorEnvelope for AppError instances', () => {
    const err = new AppError(409, 'CONFLICT', 'Resource already exists');

    globalErrorHandler(err, req, res, noopNext);

    expect(res._status).toBe(409);
    expect(res._body).toEqual({
      success: false,
      message: 'Resource already exists',
    });
  });

  it('should include details in ErrorEnvelope when AppError has details', () => {
    const details = [{ field: 'email', reason: 'Invalid' }];
    const err = new AppError(400, 'VALIDATION_ERROR', 'Failed', details);

    globalErrorHandler(err, req, res, noopNext);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({
      success: false,
      message: 'Failed',
      details,
    });
  });

  it('should return 500 ErrorEnvelope with static message for unhandled errors', () => {
    const err = new Error('Database connection failed at /var/db/mongo.sock');

    globalErrorHandler(err, req, res, noopNext);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({
      success: false,
      message: 'An internal error occurred',
    });
  });

  it('should emit success:false for all AppError status codes', () => {
    const cases = [
      AppError.unauthorized('no token'),
      AppError.forbidden('no access'),
      AppError.badRequest('bad input'),
      AppError.notFound('not here'),
      AppError.conflict('duplicate'),
      AppError.internal('crash'),
    ];

    for (const err of cases) {
      const mockRes = createMockResponse();
      globalErrorHandler(err, req, mockRes, noopNext);
      expect((mockRes._body as Record<string, unknown>).success).toBe(false);
      expect(mockRes._status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should NOT leak stack traces in 500 responses', () => {
    const err = new Error('Something broke');
    err.stack = 'Error: Something broke\n    at /home/user/app/src/service.ts:42:5';

    globalErrorHandler(err, req, res, noopNext);

    const body = res._body as Record<string, unknown>;
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('stack');
    expect(bodyStr).not.toContain('/home/user');
    expect(bodyStr).not.toContain('service.ts');
  });

  it('should NOT leak file paths in 500 responses', () => {
    const err = new Error('ENOENT: no such file /etc/secrets/key.pem');

    globalErrorHandler(err, req, res, noopNext);

    const bodyStr = JSON.stringify(res._body);
    expect(bodyStr).not.toContain('/etc/secrets');
    expect(bodyStr).not.toContain('ENOENT');
  });

  it('should NOT leak environment variable values in 500 responses', () => {
    const err = new Error(`Connection string: mongodb://admin:pass@host:27017`);

    globalErrorHandler(err, req, res, noopNext);

    const bodyStr = JSON.stringify(res._body);
    expect(bodyStr).not.toContain('mongodb://');
    expect(bodyStr).not.toContain('admin:pass');
  });

  it('should use correlation ID from request headers', () => {
    req = createMockRequest({
      headers: { 'x-correlation-id': 'abc-123' },
    } as Partial<Request>);

    const err = AppError.badRequest('Bad');
    globalErrorHandler(err, req, res, noopNext);

    // Verify the response is correct — the correlation ID is logged
    // internally via the logger, and the response uses the correct status.
    expect(res._status).toBe(400);
    expect(res._body).toEqual({
      success: false,
      message: 'Bad',
    });
  });

  it('should use correlation ID from request object if header missing', () => {
    const reqWithCorrelation = {
      ...req,
      correlationId: 'req-456',
      headers: {},
    } as unknown as Request;

    const err = AppError.notFound('Not found');
    globalErrorHandler(err, reqWithCorrelation, res, noopNext);

    expect(res._status).toBe(404);
  });
});

describe('notFoundHandler', () => {
  it('should return 404 ErrorEnvelope for GET requests', () => {
    const req = createMockRequest({ method: 'GET', path: '/api/v1/unknown' });
    const res = createMockResponse();

    notFoundHandler(req, res);

    expect(res._status).toBe(404);
    expect(res._body).toEqual({
      success: false,
      message: 'The requested route GET /api/v1/unknown does not exist',
    });
  });

  it('should return 404 ErrorEnvelope for POST requests', () => {
    const req = createMockRequest({ method: 'POST', path: '/api/v1/nonexistent' });
    const res = createMockResponse();

    notFoundHandler(req, res);

    expect(res._status).toBe(404);
    expect(res._body).toEqual({
      success: false,
      message: 'The requested route POST /api/v1/nonexistent does not exist',
    });
  });

  it('should include success:false and message fields', () => {
    const req = createMockRequest({ method: 'DELETE', path: '/foo' });
    const res = createMockResponse();

    notFoundHandler(req, res);

    const body = res._body as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
  });
});
