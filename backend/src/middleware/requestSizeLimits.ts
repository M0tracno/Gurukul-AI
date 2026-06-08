import type { Request, Response, NextFunction } from 'express';

import { AppError } from './errorHandler.js';

/**
 * Result of scanning request body for oversized string fields.
 */
interface FieldViolation {
  field: string;
  length: number;
}

/**
 * Recursively scans an object for string fields that exceed the given
 * maximum length. Returns the first violation found, or undefined if
 * all fields are within limits.
 */
function findOversizedField(
  obj: unknown,
  maxLength: number,
  prefix: string = '',
): FieldViolation | undefined {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (typeof obj === 'string') {
    if (obj.length > maxLength) {
      return { field: prefix || 'value', length: obj.length };
    }
    return undefined;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = findOversizedField(
        obj[i],
        maxLength,
        prefix ? `${prefix}[${i}]` : `[${i}]`,
      );
      if (result) return result;
    }
    return undefined;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const value = (obj as Record<string, unknown>)[key];
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const result = findOversizedField(value, maxLength, fieldPath);
      if (result) return result;
    }
  }

  return undefined;
}

/**
 * Middleware that rejects requests containing individual string fields
 * exceeding the specified character limit.
 *
 * @param maxFieldLength Maximum allowed string length (default: 10000)
 */
export function fieldSizeLimitMiddleware(maxFieldLength: number = 10000) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      const violation = findOversizedField(req.body, maxFieldLength);
      if (violation) {
        throw AppError.badRequest(
          `Field '${violation.field}' exceeds the maximum allowed length of ${maxFieldLength} characters`,
          [
            {
              field: violation.field,
              value: `[${violation.length} chars]`,
              reason: `Exceeds ${maxFieldLength} character limit`,
            },
          ],
        );
      }
    }
    next();
  };
}

/**
 * Middleware that handles PayloadTooLargeError from Express body parsers.
 * When express.json({ limit: '10mb' }) rejects a request, Express throws
 * an error with type 'entity.too.large'. This middleware converts it into
 * a proper AppError response.
 *
 * Mount this AFTER body-parser middleware but BEFORE routes.
 */
export function payloadTooLargeHandler(
  err: Error & { type?: string; status?: number },
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err.type === 'entity.too.large' || err.status === 413) {
    const appError = AppError.badRequest(
      'Request body exceeds the maximum allowed size of 10 MB',
      [
        {
          field: 'body',
          value: '[too large]',
          reason: 'Exceeds 10 MB size limit',
        },
      ],
    );
    res.status(appError.statusCode).json({
      error: appError.errorCode,
      message: appError.message,
      details: appError.details,
    });
    return;
  }
  next(err);
}

// Export helper for testing
export { findOversizedField };
