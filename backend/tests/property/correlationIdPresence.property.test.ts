/**
 * Property-Based Test: Correlation ID Presence (Property 28)
 *
 * Feature: gurukul-ai-modernization, Property 28: Correlation ID Presence
 *
 * For any HTTP request, whether or not it includes a correlation ID header,
 * the response SHALL include a correlation ID in its headers, and all log
 * entries for that request SHALL reference the same correlation ID.
 *
 * **Validates: Requirements 11.6, 11.7**
 */

import { describe, it, expect, afterEach, jest } from '@jest/globals';
import * as fc from 'fast-check';
import { EventEmitter } from 'events';
import type { Request, Response, NextFunction } from 'express';

// Mock the logger module before importing middleware
const mockInfo = jest.fn();

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: mockInfo,
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const { correlationIdMiddleware } = await import('../../src/middleware/correlationId.js');
const { requestLoggerMiddleware } = await import('../../src/middleware/requestLogger.js');

// Generator for valid UUIDs (simulating client-provided correlation IDs)
const uuidArb = fc.uuid();

// Generator for valid HTTP methods
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD');

// Generator for valid endpoint paths
const endpointArb = fc.constantFrom(
  '/api/v1/students',
  '/api/v1/courses',
  '/api/v1/attendance',
  '/api/v1/marks',
  '/api/v1/faculty',
  '/api/v1/enrollment',
  '/health',
  '/api/v1/auth/login',
  '/api/v1/grading/batch'
);

// Generator for arbitrary non-empty strings (to simulate arbitrary correlation ID formats)
const arbitraryCorrelationIdArb = fc
  .array(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
    { minLength: 1, maxLength: 64 }
  )
  .map(chars => chars.join(''));

/**
 * Creates a mock Request with optional correlation ID header.
 */
function createMockReq(options: {
  path: string;
  method: string;
  correlationId?: string;
}): Request {
  const headers: Record<string, string> = {};
  if (options.correlationId !== undefined) {
    headers['x-correlation-id'] = options.correlationId;
  }

  const req: Partial<Request> = {
    headers,
    path: options.path,
    method: options.method,
  };

  return req as Request;
}

/**
 * Creates a mock Response that can record set headers and emits 'finish'.
 */
function createMockRes(statusCode: number): Response & EventEmitter {
  const emitter = new EventEmitter();
  const responseHeaders: Record<string, string> = {};

  const res = Object.assign(emitter, {
    statusCode,
    setHeader(name: string, value: string | number | readonly string[]) {
      responseHeaders[name.toLowerCase()] = String(value);
      return res;
    },
    getHeader(name: string): string | undefined {
      return responseHeaders[name.toLowerCase()];
    },
    _headers: responseHeaders,
  });

  return res as unknown as Response & EventEmitter;
}

describe('Property 28: Correlation ID Presence', () => {
  afterEach(() => {
    mockInfo.mockClear();
  });

  /**
   * Property: For any HTTP request that INCLUDES a correlation ID header,
   * the response SHALL include the SAME correlation ID in its headers.
   */
  it('requests with a correlation ID header receive the same ID in the response', async () => {
    await fc.assert(
      fc.asyncProperty(
        httpMethodArb,
        endpointArb,
        fc.oneof(uuidArb, arbitraryCorrelationIdArb),
        async (method, endpoint, correlationId) => {
          mockInfo.mockClear();

          const req = createMockReq({ path: endpoint, method, correlationId });
          const res = createMockRes(200);
          const next: NextFunction = jest.fn() as unknown as NextFunction;

          // Run correlation ID middleware
          correlationIdMiddleware(req, res as unknown as Response, next);

          // Verify response header contains the same correlation ID
          expect(res.getHeader('x-correlation-id')).toBe(correlationId);

          // Verify request object has correlation ID attached
          expect(req.correlationId).toBe(correlationId);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For any HTTP request that does NOT include a correlation ID header,
   * the response SHALL include a newly generated correlation ID (valid UUID) in its headers.
   */
  it('requests without a correlation ID header receive a generated UUID in the response', async () => {
    await fc.assert(
      fc.asyncProperty(
        httpMethodArb,
        endpointArb,
        async (method, endpoint) => {
          mockInfo.mockClear();

          const req = createMockReq({ path: endpoint, method });
          const res = createMockRes(200);
          const next: NextFunction = jest.fn() as unknown as NextFunction;

          // Run correlation ID middleware
          correlationIdMiddleware(req, res as unknown as Response, next);

          // Verify response header contains a generated correlation ID
          const responseCorrelationId = res.getHeader('x-correlation-id');
          expect(responseCorrelationId).toBeDefined();
          expect(typeof responseCorrelationId).toBe('string');
          expect((responseCorrelationId as string).length).toBeGreaterThan(0);

          // Verify generated ID matches UUID v4 format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          expect(responseCorrelationId).toMatch(uuidRegex);

          // Verify request object has the same generated ID
          expect(req.correlationId).toBe(responseCorrelationId);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: For any HTTP request (with or without correlation ID header),
   * the log entry SHALL reference the same correlation ID as the response header.
   */
  it('log entries reference the same correlation ID as the response header', async () => {
    await fc.assert(
      fc.asyncProperty(
        httpMethodArb,
        endpointArb,
        fc.option(uuidArb, { nil: undefined }),
        async (method, endpoint, maybeCorrelationId) => {
          mockInfo.mockClear();

          const req = createMockReq({
            path: endpoint,
            method,
            correlationId: maybeCorrelationId,
          });
          const res = createMockRes(200);
          const next: NextFunction = jest.fn() as unknown as NextFunction;

          // Run correlation ID middleware first (sets req.correlationId and response header)
          correlationIdMiddleware(req, res as unknown as Response, next);

          // Capture the correlation ID from the response header
          const responseCorrelationId = res.getHeader('x-correlation-id');

          // Run request logger middleware (should log the same correlation ID)
          const loggerNext: NextFunction = jest.fn() as unknown as NextFunction;
          requestLoggerMiddleware(req, res as unknown as Response, loggerNext);

          // Simulate response finishing to trigger the log
          (res as unknown as EventEmitter).emit('finish');

          // Verify log was emitted
          expect(mockInfo).toHaveBeenCalledTimes(1);
          expect(mockInfo).toHaveBeenCalledWith('HTTP Request', expect.any(Object));

          const meta = mockInfo.mock.calls[0]![1] as Record<string, unknown>;

          // The log entry's requestId SHALL be the same as the response correlation ID
          expect(meta.requestId).toBe(responseCorrelationId);

          // Also verify it matches the req.correlationId
          expect(meta.requestId).toBe(req.correlationId);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property: The correlation ID in the response header SHALL always be a non-empty string
   * regardless of whether the request provided one or not.
   */
  it('response always contains a non-empty correlation ID header', async () => {
    await fc.assert(
      fc.asyncProperty(
        httpMethodArb,
        endpointArb,
        fc.option(
          fc.oneof(uuidArb, arbitraryCorrelationIdArb, fc.constant('')),
          { nil: undefined }
        ),
        async (method, endpoint, maybeCorrelationId) => {
          mockInfo.mockClear();

          const req = createMockReq({
            path: endpoint,
            method,
            correlationId: maybeCorrelationId,
          });
          const res = createMockRes(200);
          const next: NextFunction = jest.fn() as unknown as NextFunction;

          // Run correlation ID middleware
          correlationIdMiddleware(req, res as unknown as Response, next);

          // Response header must always have a correlation ID
          const responseCorrelationId = res.getHeader('x-correlation-id');
          expect(responseCorrelationId).toBeDefined();
          expect(typeof responseCorrelationId).toBe('string');

          // If the request provided a non-empty correlation ID, response should match
          if (maybeCorrelationId && maybeCorrelationId.length > 0) {
            expect(responseCorrelationId).toBe(maybeCorrelationId);
          } else {
            // If no correlation ID provided (or empty), a new one is generated
            expect((responseCorrelationId as string).length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
