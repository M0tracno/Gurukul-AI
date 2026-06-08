import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

import type { ApiErrorResponse } from '../types/api.js';

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Express middleware factory that validates request body, query, and params
 * against provided Zod schemas. Rejects unknown fields with HTTP 400 and
 * returns a standardized error response.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; value: unknown; reason: string }> = [];

    const targets = [
      { key: 'body' as const, schema: schemas.body, data: req.body },
      { key: 'query' as const, schema: schemas.query, data: req.query },
      { key: 'params' as const, schema: schemas.params, data: req.params },
    ];

    for (const { key, schema, data } of targets) {
      if (!schema) continue;

      const result = schema.safeParse(data);

      if (!result.success) {
        const zodErrors = flattenZodError(result.error, key, data);
        errors.push(...zodErrors);
      }
    }

    if (errors.length > 0) {
      const response: ApiErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: `Request validation failed with ${errors.length} error(s)`,
        details: errors,
      };
      res.status(400).json(response);
      return;
    }

    next();
  };
}

/**
 * Converts a ZodError into an array of field-level detail entries.
 * Each entry includes the full field path, the rejected value, and
 * a human-readable reason for the failure.
 */
function flattenZodError(
  zodError: ZodError,
  source: 'body' | 'query' | 'params',
  data: unknown
): Array<{ field: string; value: unknown; reason: string }> {
  return zodError.issues.map((issue) => {
    const fieldPath =
      issue.path.length > 0
        ? `${source}.${issue.path.join('.')}`
        : source;

    // Resolve the rejected value by traversing the path
    const value = resolveValue(data, issue.path);

    return {
      field: fieldPath,
      value,
      reason: issue.message,
    };
  });
}

/**
 * Traverses an object along the given path to extract the rejected value.
 */
function resolveValue(data: unknown, path: (string | number)[]): unknown {
  let current: unknown = data;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string | number, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}
