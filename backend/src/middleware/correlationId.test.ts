import { describe, it, expect, jest } from '@jest/globals';
import { correlationIdMiddleware } from './correlationId.js';
import type { Request, Response, NextFunction } from 'express';

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
  return {
    headers: { ...headers },
  } as Partial<Request>;
}

function createMockRes(): Partial<Response> & { getHeader(name: string): string | undefined } {
  const responseHeaders: Record<string, string> = {};
  return {
    setHeader(name: string, value: string | number | readonly string[]) {
      responseHeaders[name.toLowerCase()] = String(value);
      return this as Response;
    },
    getHeader(name: string): string | undefined {
      return responseHeaders[name.toLowerCase()];
    },
  } as Partial<Response> & { getHeader(name: string): string | undefined };
}

describe('correlationIdMiddleware', () => {
  it('generates a UUID when no x-correlation-id header is present', () => {
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response & { getHeader(name: string): string | undefined };
    const next: NextFunction = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBeDefined();
    expect(req.correlationId).toMatch(UUID_REGEX);
    expect(res.getHeader('x-correlation-id')).toBe(req.correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('uses the provided x-correlation-id header value', () => {
    const existingId = 'my-custom-correlation-id-12345';
    const req = createMockReq({ 'x-correlation-id': existingId }) as Request;
    const res = createMockRes() as unknown as Response & { getHeader(name: string): string | undefined };
    const next: NextFunction = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBe(existingId);
    expect(res.getHeader('x-correlation-id')).toBe(existingId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets the response header to match the correlation ID on the request', () => {
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response & { getHeader(name: string): string | undefined };
    const next: NextFunction = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(res.getHeader('x-correlation-id')).toBe(req.correlationId);
  });

  it('calls next() to pass control to the next middleware', () => {
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next: NextFunction = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
