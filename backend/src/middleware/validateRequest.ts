import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

import { failure } from '../utils/envelope.js';
import type { ErrorDetail } from '../utils/envelope.js';

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Express middleware factory that validates request body, query, and params
 * against provided Zod schemas. Rejects unknown fields with HTTP 400 and
 * returns a standardized ErrorEnvelope with field-level `details[]`.
 *
 * Each detail entry is `{ field, reason }` per Requirement 2.4 and 22.5.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ErrorDetail[] = [];

    const targets = [
      { key: 'body' as const, schema: schemas.body, data: req.body },
      { key: 'query' as const, schema: schemas.query, data: req.query },
      { key: 'params' as const, schema: schemas.params, data: req.params },
    ];

    for (const { key, schema, data } of targets) {
      if (!schema) continue;

      const result = schema.safeParse(data);

      if (!result.success) {
        const zodErrors = flattenZodError(result.error, key);
        errors.push(...zodErrors);
      }
    }

    if (errors.length > 0) {
      res
        .status(400)
        .json(
          failure(
            `Request validation failed with ${errors.length} error(s)`,
            errors,
          ),
        );
      return;
    }

    next();
  };
}

/**
 * Converts a ZodError into an array of field-level `ErrorDetail` entries.
 * Each entry carries the full dotted field path and a human-readable reason,
 * matching the `{ field, reason }` shape required by Requirement 2.4 / 22.5.
 */
function flattenZodError(
  zodError: ZodError,
  source: 'body' | 'query' | 'params',
): ErrorDetail[] {
  return zodError.issues.map((issue) => {
    const fieldPath =
      issue.path.length > 0
        ? `${source}.${issue.path.join('.')}`
        : source;

    return {
      field: fieldPath,
      reason: issue.message,
    };
  });
}
