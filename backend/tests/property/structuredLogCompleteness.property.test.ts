/**
 * Property-Based Test: Structured Log Completeness (Property 27)
 *
 * Feature: gurukul-ai-modernization, Property 27: Structured Log Completeness
 *
 * For any HTTP request processed by the Backend_Service, the corresponding
 * structured JSON log entry SHALL contain all required fields: requestId,
 * userId (if authenticated), role (if authenticated), endpoint, HTTP method,
 * response status code, and response time in milliseconds.
 *
 * **Validates: Requirements 11.1**
 */

import { describe, it, expect, afterEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import { EventEmitter } from 'events';
import type { Request, Response, NextFunction } from 'express';

// Mock the logger module before importing requestLogger
const mockInfo = jest.fn();

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: mockInfo,
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const { requestLoggerMiddleware } = await import('../../src/middleware/requestLogger.js');

// Generator for valid HTTP methods
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD');

// Generator for valid endpoint paths
const endpointArb = fc.tuple(
  fc.constantFrom(
    '/api/v1/students',
    '/api/v1/courses',
    '/api/v1/attendance',
    '/api/v1/marks',
    '/api/v1/faculty',
    '/api/v1/enrollment',
    '/health',
    '/api/v1/auth/login',
    '/api/v1/grading/batch'
  ),
  fc.string({ minLength: 0, maxLength: 8 }).map(s => s.replace(/[^a-zA-Z0-9-_]/g, ''))
).map(([base, suffix]) => suffix ? `${base}/${suffix}` : base);

// Generator for valid HTTP status codes
const statusCodeArb = fc.constantFrom(200, 201, 204, 301, 302, 400, 401, 403, 404, 409, 422, 500, 502, 503);

// Generator for user IDs (MongoDB-like ObjectId hex strings)
const hexChars = '0123456789abcdef';
const userIdArb = fc.array(
  fc.integer({ min: 0, max: 15 }),
  { minLength: 24, maxLength: 24 }
).map(arr => arr.map(i => hexChars[i]).join(''));

// Generator for roles
const roleArb = fc.constantFrom('student', 'teacher', 'parent', 'admin');

// Generator for correlation IDs (UUIDs)
const correlationIdArb = fc.uuid();

/**
 * Creates a mock Request with the given properties.
 */
function createMockReq(options: {
  correlationId: string;
  path: string;
  method: string;
  user?: { userId: string; role: string };
}): Request {
  const req: Partial<Request> = {
    headers: { 'x-correlation-id': options.correlationId },
    correlationId: options.correlationId,
    path: options.path,
    method: options.method,
  };

  if (options.user) {
    (req as any).user = options.user;
  }

  return req as Request;
}

/**
 * Creates a mock Response (EventEmitter) with a given status code.
 */
function createMockRes(statusCode: number): EventEmitter & { statusCode: number } {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode });
}

describe('Property 27: Structured Log Completeness', () => {
  afterEach(() => {
    mockInfo.mockClear();
  });

  /**
   * Property: For any unauthenticated HTTP request, the structured log entry
   * SHALL contain: requestId, endpoint, method, status, and responseTime.
   * userId and role are NOT required for unauthenticated requests.
   */
  it('unauthenticated requests log all required base fields (requestId, endpoint, method, status, responseTime)', async () => {
    await fc.assert(
      fc.asyncProperty(
        httpMethodArb,
        endpointArb,
        statusCodeArb,
        correlationIdArb,
        async (method, endpoint, statusCode, correlationId) => {
          mockInfo.mockClear();

          const req = createMockReq({ correlationId, path: endpoint, method });
          const res = createMockRes(statusCode);
          const next: NextFunction = jest.fn() as unknown as NextFunction;

          requestLoggerMiddleware(req, res as unknown as Response, next);

          // Simulate response finishing
          res.emit('finish');

          // Should have logged exactly one HTTP Request entry
          expect(mockInfo).toHaveBeenCalledTimes(1);
          expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.any(Object));

          const meta = mockInfo.mock.calls[0]![1] as Record<string, unknown>;

          // Required fields for all requests
          expect(meta).toHaveProperty('requestId');
          expect(typeof meta.requestId).toBe('string');
          expect((meta.requestId as string).length).toBeGreaterThan(0);
          expect(meta.requestId).toBe(correlationId);

          expect(meta).toHaveProperty('endpoint');
          expect(typeof meta.endpoint).toBe('string');
          expect(meta.endpoint).toBe(endpoint);

          expect(meta).toHaveProperty('method');
          expect(meta.method).toBe(method);

          expect(meta).toHaveProperty('status');
          expect(typeof meta.status).toBe('number');
          expect(meta.status).toBe(statusCode);

          expect(meta).toHaveProperty('responseTime');
          expect(typeof meta.responseTime).toBe('number');
          expect(meta.responseTime as number).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For any authenticated HTTP request, the structured log entry
   * SHALL contain ALL required fields including userId and role.
   */
  it('authenticated requests log all required fields including userId and role', async () => {
    await fc.assert(
      fc.asyncProperty(
        httpMethodArb,
        endpointArb,
        statusCodeArb,
        correlationIdArb,
        userIdArb,
        roleArb,
        async (method, endpoint, statusCode, correlationId, userId, role) => {
          mockInfo.mockClear();

          const req = createMockReq({
            correlationId,
            path: endpoint,
            method,
            user: { userId, role },
          });
          const res = createMockRes(statusCode);
          const next: NextFunction = jest.fn() as unknown as NextFunction;

          requestLoggerMiddleware(req, res as unknown as Response, next);

          // Simulate response finishing
          res.emit('finish');

          // Should have logged exactly one HTTP Request entry
          expect(mockInfo).toHaveBeenCalledTimes(1);
          expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.any(Object));

          const meta = mockInfo.mock.calls[0]![1] as Record<string, unknown>;

          // All base required fields
          expect(meta).toHaveProperty('requestId');
          expect(typeof meta.requestId).toBe('string');
          expect(meta.requestId).toBe(correlationId);

          expect(meta).toHaveProperty('endpoint');
          expect(meta.endpoint).toBe(endpoint);

          expect(meta).toHaveProperty('method');
          expect(meta.method).toBe(method);

          expect(meta).toHaveProperty('status');
          expect(typeof meta.status).toBe('number');
          expect(meta.status).toBe(statusCode);

          expect(meta).toHaveProperty('responseTime');
          expect(typeof meta.responseTime).toBe('number');
          expect(meta.responseTime as number).toBeGreaterThanOrEqual(0);

          // Authenticated-specific required fields
          expect(meta).toHaveProperty('userId');
          expect(meta.userId).toBe(userId);

          expect(meta).toHaveProperty('role');
          expect(meta.role).toBe(role);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: The responseTime value SHALL always be a non-negative number
   * representing milliseconds elapsed during request processing.
   */
  it('responseTime is always a non-negative number in milliseconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        httpMethodArb,
        endpointArb,
        statusCodeArb,
        correlationIdArb,
        async (method, endpoint, statusCode, correlationId) => {
          mockInfo.mockClear();

          const req = createMockReq({ correlationId, path: endpoint, method });
          const res = createMockRes(statusCode);
          const next: NextFunction = jest.fn() as unknown as NextFunction;

          requestLoggerMiddleware(req, res as unknown as Response, next);
          res.emit('finish');

          const meta = mockInfo.mock.calls[0]![1] as Record<string, unknown>;

          // responseTime must be a non-negative number
          expect(typeof meta.responseTime).toBe('number');
          expect(meta.responseTime as number).toBeGreaterThanOrEqual(0);
          // Should be reasonable (less than 10 seconds for a synchronous test)
          expect(meta.responseTime as number).toBeLessThan(10000);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
