import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Set up the logger mock BEFORE importing the middleware
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockInfo = jest.fn();

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    warn: mockWarn,
    error: mockError,
    info: mockInfo,
    debug: jest.fn(),
  },
}));

// Dynamic import so that the mock is resolved
const {
  csrfProtectionMiddleware,
  COOKIE_CONFIG,
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
} = await import('./csrfProtection.js');

/**
 * Helper to create mock request/response/next objects.
 */
function createMocks(overrides: {
  method?: string;
  path?: string;
  headers?: Record<string, string | undefined>;
} = {}) {
  const req = {
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/api/v1/resource',
    headers: overrides.headers ?? {},
    ip: '127.0.0.1',
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next: NextFunction = jest.fn();

  return { req, res, next };
}

describe('csrfProtectionMiddleware', () => {
  const middleware = csrfProtectionMiddleware({
    allowedOrigins: ['http://localhost:3000', 'https://app.gurukul.ai'],
  });

  beforeEach(() => {
    mockWarn.mockClear();
    mockError.mockClear();
    mockInfo.mockClear();
  });

  describe('safe methods pass through', () => {
    it('should allow GET requests without any checks', () => {
      const { req, res, next } = createMocks({ method: 'GET' });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow HEAD requests without any checks', () => {
      const { req, res, next } = createMocks({ method: 'HEAD' });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without any checks', () => {
      const { req, res, next } = createMocks({ method: 'OPTIONS' });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Bearer token auth passes through', () => {
    it('should allow POST with valid Bearer token', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.test.token' },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow PUT with valid Bearer token', () => {
      const { req, res, next } = createMocks({
        method: 'PUT',
        headers: { authorization: 'Bearer some-access-token' },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow DELETE with valid Bearer token', () => {
      const { req, res, next } = createMocks({
        method: 'DELETE',
        headers: { authorization: 'Bearer abc123' },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow PATCH with valid Bearer token', () => {
      const { req, res, next } = createMocks({
        method: 'PATCH',
        headers: { authorization: 'Bearer xyz789' },
      });
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cookie-based auth requires CSRF protection', () => {
    it('should reject POST with cookie auth but no X-Requested-With header', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {
          cookie: 'refreshToken=abc123; other=value',
        },
      });

      expect(() => middleware(req, res, next)).toThrow(
        'CSRF validation failed: missing required security header',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject PUT with cookie auth and wrong X-Requested-With value', () => {
      const { req, res, next } = createMocks({
        method: 'PUT',
        headers: {
          cookie: 'refreshToken=abc123',
          [CSRF_HEADER_NAME]: 'WrongValue',
        },
      });

      expect(() => middleware(req, res, next)).toThrow(
        'CSRF validation failed: missing required security header',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject DELETE with cookie auth and invalid origin', () => {
      const { req, res, next } = createMocks({
        method: 'DELETE',
        headers: {
          cookie: 'refreshToken=abc123',
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
          origin: 'https://evil-site.com',
        },
      });

      expect(() => middleware(req, res, next)).toThrow(
        'CSRF validation failed: request origin not allowed',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow POST with cookie auth, correct header, and valid origin', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {
          cookie: 'refreshToken=abc123',
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
          origin: 'http://localhost:3000',
        },
      });

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow PATCH with cookie auth, correct header, and valid referer', () => {
      const { req, res, next } = createMocks({
        method: 'PATCH',
        headers: {
          cookie: 'session=xyz',
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
          referer: 'https://app.gurukul.ai/dashboard/settings',
        },
      });

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject when referer has invalid origin', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {
          cookie: 'refreshToken=token123',
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
          referer: 'https://attacker.com/fake-page',
        },
      });

      expect(() => middleware(req, res, next)).toThrow(
        'CSRF validation failed: request origin not allowed',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should detect refresh_token cookie pattern', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {
          cookie: 'refresh_token=abc123',
        },
      });

      expect(() => middleware(req, res, next)).toThrow(
        'CSRF validation failed: missing required security header',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should detect session cookie pattern', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {
          cookie: 'session=abc123',
        },
      });

      expect(() => middleware(req, res, next)).toThrow(
        'CSRF validation failed: missing required security header',
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('excluded paths bypass CSRF checks', () => {
    const middlewareWithExclusions = csrfProtectionMiddleware({
      excludePaths: ['/api/v1/webhooks/', '/api/v1/stripe/'],
      allowedOrigins: ['http://localhost:3000'],
    });

    it('should skip CSRF check for webhook paths', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        path: '/api/v1/webhooks/payment',
        headers: {
          cookie: 'refreshToken=abc123',
        },
      });

      middlewareWithExclusions(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should skip CSRF check for stripe webhook path', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        path: '/api/v1/stripe/events',
        headers: {
          cookie: 'refreshToken=abc123',
        },
      });

      middlewareWithExclusions(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should still check non-excluded paths', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        path: '/api/v1/users',
        headers: {
          cookie: 'refreshToken=abc123',
        },
      });

      expect(() => middlewareWithExclusions(req, res, next)).toThrow(
        'CSRF validation failed',
      );
    });
  });

  describe('unauthenticated requests pass through', () => {
    it('should allow POST without any auth (will be rejected by auth middleware later)', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {},
      });

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow DELETE without any auth headers', () => {
      const { req, res, next } = createMocks({
        method: 'DELETE',
        headers: {},
      });

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cookie configuration constants', () => {
    it('should have SameSite set to strict', () => {
      expect(COOKIE_CONFIG.sameSite).toBe('strict');
    });

    it('should have HttpOnly set to true', () => {
      expect(COOKIE_CONFIG.httpOnly).toBe(true);
    });

    it('should have path set to root', () => {
      expect(COOKIE_CONFIG.path).toBe('/');
    });

    it('should set Secure based on NODE_ENV', () => {
      // In test env, secure should be false
      expect(COOKIE_CONFIG.secure).toBe(false);
    });
  });

  describe('default options behavior', () => {
    it('should work with no options provided', () => {
      const defaultMiddleware = csrfProtectionMiddleware();
      const { req, res, next } = createMocks({ method: 'GET' });
      defaultMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow Bearer auth with no options', () => {
      const defaultMiddleware = csrfProtectionMiddleware();
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer token123' },
      });
      defaultMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log a warning when CSRF header is missing', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {
          cookie: 'refreshToken=abc123',
        },
      });

      expect(() => middleware(req, res, next)).toThrow();
      expect(mockWarn).toHaveBeenCalledWith(
        'CSRF protection: missing or invalid X-Requested-With header',
        expect.objectContaining({
          method: 'POST',
          ip: '127.0.0.1',
        }),
      );
    });

    it('should log a warning when origin is invalid', () => {
      const { req, res, next } = createMocks({
        method: 'POST',
        headers: {
          cookie: 'refreshToken=abc123',
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
          origin: 'https://evil.com',
        },
      });

      expect(() => middleware(req, res, next)).toThrow();
      expect(mockWarn).toHaveBeenCalledWith(
        'CSRF protection: invalid origin for cookie-based request',
        expect.objectContaining({
          origin: 'https://evil.com',
          method: 'POST',
        }),
      );
    });
  });
});
