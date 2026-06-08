import type { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger.js';
import { AppError } from './errorHandler.js';

/**
 * MongoDB operators that are prohibited in user input.
 * These operators, when injected into queries, can alter query semantics
 * and expose or modify data the user should not have access to.
 */
const MONGO_OPERATORS = [
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$ne',
  '$in',
  '$nin',
  '$regex',
  '$where',
  '$or',
  '$and',
  '$not',
  '$exists',
  '$elemMatch',
  '$expr',
  '$eq',
] as const;

/**
 * Checks whether a given value (object, array, or primitive) contains
 * MongoDB operator patterns. Recursively walks objects and arrays.
 *
 * Detection rules:
 * - Any object key starting with `$` is flagged.
 * - Any string value containing a known MongoDB operator is flagged.
 */
export function containsMongoOperators(obj: unknown): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }

  if (typeof obj === 'string') {
    return MONGO_OPERATORS.some((op) => obj.includes(op));
  }

  if (Array.isArray(obj)) {
    return obj.some((item) => containsMongoOperators(item));
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      // Any key starting with $ is suspicious
      if (key.startsWith('$')) {
        return true;
      }
      // Recursively check the value
      if (containsMongoOperators((obj as Record<string, unknown>)[key])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds the first offending field/value pair containing a MongoDB operator.
 * Used for logging details about the injection attempt.
 */
function findOffendingField(
  obj: unknown,
  path: string = '',
): { field: string; value: unknown } | null {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (typeof obj === 'string') {
    if (MONGO_OPERATORS.some((op) => obj.includes(op))) {
      return { field: path || '(root)', value: obj };
    }
    return null;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = findOffendingField(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
    return null;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (key.startsWith('$')) {
        return { field: currentPath, value: (obj as Record<string, unknown>)[key] };
      }
      const result = findOffendingField(
        (obj as Record<string, unknown>)[key],
        currentPath,
      );
      if (result) return result;
    }
  }

  return null;
}

/**
 * Express middleware that detects NoSQL injection attempts in incoming requests.
 *
 * Inspects `req.body`, `req.query`, and `req.params` for MongoDB operator patterns.
 * When an injection attempt is detected, the request is rejected with HTTP 400
 * and a security event is logged (Requirement 12.8).
 *
 * @example
 * ```typescript
 * import { mongoSanitizeMiddleware } from './middleware/mongoSanitize.js';
 * app.use(mongoSanitizeMiddleware);
 * ```
 */
export function mongoSanitizeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const sources: Array<{ name: string; data: unknown }> = [
    { name: 'body', data: req.body },
    { name: 'query', data: req.query },
    { name: 'params', data: req.params },
  ];

  for (const source of sources) {
    if (source.data && containsMongoOperators(source.data)) {
      const offending = findOffendingField(source.data);
      const ip =
        (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';

      logger.warn('NoSQL injection attempt detected', {
        event: 'security:nosql_injection',
        source: source.name,
        field: offending?.field ?? 'unknown',
        value: offending?.value,
        ip,
        path: req.path,
        method: req.method,
        correlationId: (req as unknown as { correlationId?: string }).correlationId,
      });

      throw AppError.badRequest('Request contains prohibited operators');
    }
  }

  next();
}
