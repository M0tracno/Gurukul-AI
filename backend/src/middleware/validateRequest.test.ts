import { jest, describe, it, expect } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest, ValidationSchemas } from './validateRequest.js';

// Helper to create mock request/response/next
function createMocks(overrides: {
  body?: unknown;
  query?: unknown;
  params?: unknown;
} = {}) {
  const req = {
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    params: overrides.params ?? {},
  } as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next: NextFunction = jest.fn();

  return { req, res, next };
}

describe('validateRequest middleware', () => {
  describe('body validation', () => {
    const schemas: ValidationSchemas = {
      body: z.object({
        name: z.string().min(1),
        age: z.number().int().positive(),
      }).strict(),
    };

    it('should call next() when body is valid', () => {
      const { req, res, next } = createMocks({
        body: { name: 'Alice', age: 25 },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 ErrorEnvelope when required field is missing', () => {
      const { req, res, next } = createMocks({
        body: { age: 25 },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('1 error'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'body.name',
              reason: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should return 400 ErrorEnvelope when field has wrong type', () => {
      const { req, res, next } = createMocks({
        body: { name: 'Alice', age: 'not-a-number' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'body.age',
              reason: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should reject unknown fields with strict schema', () => {
      const { req, res, next } = createMocks({
        body: { name: 'Alice', age: 25, unknown: 'extra' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.stringContaining('body'),
              reason: expect.stringMatching(/unrecognized/i),
            }),
          ]),
        })
      );
    });
  });

  describe('query validation', () => {
    const schemas: ValidationSchemas = {
      query: z.object({
        page: z.string().regex(/^\d+$/),
        limit: z.string().regex(/^\d+$/),
      }).strict(),
    };

    it('should call next() when query is valid', () => {
      const { req, res, next } = createMocks({
        query: { page: '1', limit: '10' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 ErrorEnvelope when query has invalid format', () => {
      const { req, res, next } = createMocks({
        query: { page: 'abc', limit: '10' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'query.page',
            }),
          ]),
        })
      );
    });

    it('should reject unknown query parameters', () => {
      const { req, res, next } = createMocks({
        query: { page: '1', limit: '10', extraParam: 'bad' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('params validation', () => {
    const schemas: ValidationSchemas = {
      params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/),
      }).strict(),
    };

    it('should call next() when params are valid', () => {
      const { req, res, next } = createMocks({
        params: { id: '507f1f77bcf86cd799439011' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 ErrorEnvelope for invalid params', () => {
      const { req, res, next } = createMocks({
        params: { id: 'not-an-objectid' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'params.id',
            }),
          ]),
        })
      );
    });
  });

  describe('combined validation', () => {
    const schemas: ValidationSchemas = {
      body: z.object({
        title: z.string().min(1),
      }).strict(),
      query: z.object({
        format: z.enum(['json', 'xml']),
      }).strict(),
      params: z.object({
        id: z.string().min(1),
      }).strict(),
    };

    it('should collect errors from all sources', () => {
      const { req, res, next } = createMocks({
        body: {},          // missing title
        query: { format: 'csv' },  // invalid enum value
        params: { id: '' },  // empty string, min 1
      });

      validateRequest(schemas)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(jsonCall.success).toBe(false);
      expect((jsonCall.details as unknown[]).length).toBeGreaterThanOrEqual(3);
    });

    it('should pass when all schemas are satisfied', () => {
      const { req, res, next } = createMocks({
        body: { title: 'Hello' },
        query: { format: 'json' },
        params: { id: 'abc123' },
      });

      validateRequest(schemas)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('no schemas provided', () => {
    it('should call next() when no schemas are defined', () => {
      const { req, res, next } = createMocks({
        body: { anything: 'goes' },
      });

      validateRequest({})(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('error response format', () => {
    it('should match ErrorEnvelope interface', () => {
      const schemas: ValidationSchemas = {
        body: z.object({ email: z.string().email() }).strict(),
      };

      const { req, res, next } = createMocks({
        body: { email: 'invalid-email' },
      });

      validateRequest(schemas)(req, res, next);

      const response = (res.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;

      // Verify structure matches ErrorEnvelope
      expect(response.success).toBe(false);
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('details');
      expect(typeof response.message).toBe('string');
      expect(Array.isArray((response.details as unknown[]))).toBe(true);

      // Verify each detail entry has { field, reason }
      for (const detail of (response.details as Array<Record<string, string>>)) {
        expect(detail).toHaveProperty('field');
        expect(detail).toHaveProperty('reason');
        expect(typeof detail.field).toBe('string');
        expect(typeof detail.reason).toBe('string');
      }
    });

    it('should NOT include an error code in the response body', () => {
      const schemas: ValidationSchemas = {
        body: z.object({ name: z.string() }).strict(),
      };

      const { req, res, next } = createMocks({
        body: { name: 123 },
      });

      validateRequest(schemas)(req, res, next);

      const response = (res.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      // ErrorEnvelope has no top-level `error` field
      expect(response).not.toHaveProperty('error');
    });
  });

  describe('nested object validation', () => {
    const schemas: ValidationSchemas = {
      body: z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            city: z.string(),
          }).strict(),
        }).strict(),
      }).strict(),
    };

    it('should report nested field paths correctly', () => {
      const { req, res, next } = createMocks({
        body: {
          user: {
            name: 'Alice',
            address: { city: 123 },  // wrong type
          },
        },
      });

      validateRequest(schemas)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const response = (res.json as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect((response.details as Array<Record<string, string>>)[0].field).toBe('body.user.address.city');
    });
  });
});
