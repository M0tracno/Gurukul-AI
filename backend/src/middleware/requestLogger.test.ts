import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

// Set up the mock BEFORE importing the middleware
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockDebug = jest.fn();

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
    debug: mockDebug,
  },
}));

// Dynamic import so that the mock is resolved
const { requestLoggerMiddleware } = await import('./requestLogger.js');

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    correlationId: 'test-correlation-id-123',
    path: '/api/v1/students',
    method: 'GET',
    ...overrides,
  } as Partial<Request>;
}

function createMockRes(): EventEmitter & { statusCode: number } {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode: 200 });
}

describe('requestLoggerMiddleware', () => {
  beforeEach(() => {
    mockInfo.mockClear();
    mockWarn.mockClear();
    mockError.mockClear();
    mockDebug.mockClear();
  });

  it('calls next() immediately to pass control to downstream handlers', () => {
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('emits a structured log entry when response finishes', () => {
    const req = createMockReq() as Request;
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req as Request, res as unknown as Response, next);

    // Log should not be called yet
    expect(mockInfo).not.toHaveBeenCalled();

    // Simulate response finishing
    res.emit('finish');

    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.any(Object));
  });

  it('includes all required fields in the log entry', () => {
    const req = createMockReq({
      correlationId: 'req-id-abc',
      path: '/api/v1/courses',
      method: 'POST',
    }) as Request;
    const res = createMockRes();
    res.statusCode = 201;
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req as Request, res as unknown as Response, next);
    res.emit('finish');

    expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
      requestId: 'req-id-abc',
      endpoint: '/api/v1/courses',
      method: 'POST',
      status: 201,
      responseTime: expect.any(Number),
    }));
  });

  it('includes userId and role when user is authenticated', () => {
    const req = createMockReq() as Request;
    (req as any).user = { userId: 'user-42', role: 'teacher' };
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req as Request, res as unknown as Response, next);
    res.emit('finish');

    expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
      userId: 'user-42',
      role: 'teacher',
    }));
  });

  it('omits userId and role when user is not authenticated', () => {
    const req = createMockReq() as Request;
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req as Request, res as unknown as Response, next);
    res.emit('finish');

    const logMeta = mockInfo.mock.calls[0]![1] as Record<string, unknown>;
    expect(logMeta.userId).toBeUndefined();
    expect(logMeta.role).toBeUndefined();
  });

  it('falls back to x-correlation-id header if req.correlationId is not set', () => {
    const req = createMockReq({
      correlationId: undefined as any,
      headers: { 'x-correlation-id': 'header-correlation-xyz' },
    }) as Request;
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req as Request, res as unknown as Response, next);
    res.emit('finish');

    expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
      requestId: 'header-correlation-xyz',
    }));
  });

  it('records a non-negative responseTime in milliseconds', () => {
    const req = createMockReq() as Request;
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req as Request, res as unknown as Response, next);
    res.emit('finish');

    const logMeta = mockInfo.mock.calls[0]![1] as Record<string, unknown>;
    expect(typeof logMeta.responseTime).toBe('number');
    expect(logMeta.responseTime as number).toBeGreaterThanOrEqual(0);
  });

  it('supports user object with id field instead of userId', () => {
    const req = createMockReq() as Request;
    (req as any).user = { id: 'alt-id-99', role: 'student' };
    const res = createMockRes();
    const next: NextFunction = jest.fn();

    requestLoggerMiddleware(req as Request, res as unknown as Response, next);
    res.emit('finish');

    expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
      userId: 'alt-id-99',
      role: 'student',
    }));
  });
});
