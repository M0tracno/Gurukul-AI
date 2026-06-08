import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { securityHeadersMiddleware, httpsRedirectMiddleware } from './securityHeaders.js';
import type { Request, Response, NextFunction } from 'express';

describe('securityHeadersMiddleware', () => {
  it('is a function (middleware)', () => {
    expect(typeof securityHeadersMiddleware).toBe('function');
  });

  it('calls next() without error', () => {
    const req = {
      headers: {},
      connection: { encrypted: true },
      url: '/',
      method: 'GET',
    } as unknown as Request;

    const headers: Record<string, string> = {};
    const res = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      removeHeader() {
        return this;
      },
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    securityHeadersMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets Strict-Transport-Security header with correct max-age and includeSubDomains', () => {
    const req = {
      headers: {},
      connection: { encrypted: true },
      url: '/',
      method: 'GET',
    } as unknown as Request;

    const headers: Record<string, string> = {};
    const res = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      removeHeader() {
        return this;
      },
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    securityHeadersMiddleware(req, res, next);

    const hstsHeader = headers['strict-transport-security'];
    expect(hstsHeader).toBeDefined();
    expect(hstsHeader).toContain('max-age=31536000');
    expect(hstsHeader).toContain('includeSubDomains');
  });

  it('sets X-Content-Type-Options to nosniff', () => {
    const req = {
      headers: {},
      connection: { encrypted: true },
      url: '/',
      method: 'GET',
    } as unknown as Request;

    const headers: Record<string, string> = {};
    const res = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      removeHeader() {
        return this;
      },
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    securityHeadersMiddleware(req, res, next);

    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options to DENY', () => {
    const req = {
      headers: {},
      connection: { encrypted: true },
      url: '/',
      method: 'GET',
    } as unknown as Request;

    const headers: Record<string, string> = {};
    const res = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      removeHeader() {
        return this;
      },
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    securityHeadersMiddleware(req, res, next);

    // Helmet v8 uses X-Frame-Options
    expect(headers['x-frame-options']).toBe('DENY');
  });
});

describe('httpsRedirectMiddleware', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('redirects to HTTPS in production when x-forwarded-proto is not https', () => {
    process.env.NODE_ENV = 'production';

    const req = {
      headers: {
        'x-forwarded-proto': 'http',
        host: 'example.com',
      },
      url: '/api/test',
    } as unknown as Request;

    const res = {
      redirect: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    httpsRedirectMiddleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/test');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not redirect when x-forwarded-proto is https in production', () => {
    process.env.NODE_ENV = 'production';

    const req = {
      headers: {
        'x-forwarded-proto': 'https',
        host: 'example.com',
      },
      url: '/api/test',
    } as unknown as Request;

    const res = {
      redirect: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    httpsRedirectMiddleware(req, res, next);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not redirect in non-production environments', () => {
    process.env.NODE_ENV = 'development';

    const req = {
      headers: {
        'x-forwarded-proto': 'http',
        host: 'localhost:5000',
      },
      url: '/api/test',
    } as unknown as Request;

    const res = {
      redirect: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    httpsRedirectMiddleware(req, res, next);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not redirect when NODE_ENV is undefined', () => {
    delete process.env.NODE_ENV;

    const req = {
      headers: {
        'x-forwarded-proto': 'http',
        host: 'localhost:5000',
      },
      url: '/api/test',
    } as unknown as Request;

    const res = {
      redirect: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    httpsRedirectMiddleware(req, res, next);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
