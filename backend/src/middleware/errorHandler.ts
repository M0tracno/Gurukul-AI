import type { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger.js';
import { failure } from '../utils/envelope.js';
import type { ErrorDetail } from '../utils/envelope.js';

/**
 * Custom application error class for structured error handling.
 * Carries an HTTP status code and machine-readable error code so the
 * global error handler can produce a consistent ErrorEnvelope response.
 *
 * AppError taxonomy and HTTP status mapping:
 *   unauthorized → 401
 *   forbidden    → 403
 *   badRequest   → 400
 *   notFound     → 404
 *   conflict     → 409
 *   internal     → 500
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: ErrorDetail[];

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }

  /** 400 Bad Request — also used for validation failures */
  static badRequest(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  /** 404 Not Found */
  static notFound(message: string): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  /** 401 Unauthorized — missing or invalid token */
  static unauthorized(message: string): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  /** 403 Forbidden — authenticated but insufficient role/scope */
  static forbidden(message: string): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  /** 409 Conflict — e.g. duplicate record or scheduling overlap */
  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  /** 500 Internal Server Error — unexpected failure */
  static internal(message: string): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}

/**
 * Global error handler middleware.
 *
 * Maps `AppError` instances and unknown errors to a standardized
 * `ErrorEnvelope` (`{ success: false, message, details? }`) so that
 * all error responses follow Requirement 2.2 and carry a 4xx/5xx
 * status code consistent with Requirement 2.3.
 *
 * Validation details (`{ field, reason }`) are forwarded from `AppError`
 * to satisfy Requirement 2.4 and 22.5.
 *
 * Unhandled exceptions produce a generic 500 response with NO stack
 * traces, file paths, database identifiers, or environment variables leaked.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string | undefined) ??
    (req as unknown as { correlationId?: string }).correlationId;

  if (err instanceof AppError) {
    logger.warn('Application error', {
      correlationId,
      error: err.errorCode,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    res.status(err.statusCode).json(failure(err.message, err.details));
    return;
  }

  // Unhandled exception: log the full stack server-side but return only
  // a static message to the client to avoid leaking internal details.
  logger.error('Unhandled error', {
    correlationId,
    stack: err.stack,
    path: req.path,
    method: req.method,
    errorName: err.name,
    errorMessage: err.message,
  });

  res.status(500).json(failure('An internal error occurred'));
}

/**
 * 404 handler for unregistered routes.
 * Mount this after all route definitions but before the global error handler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json(failure(`The requested route ${req.method} ${req.path} does not exist`));
}
