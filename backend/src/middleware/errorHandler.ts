import type { Request, Response, NextFunction } from 'express';

import { logger } from '../utils/logger.js';
import type { ApiErrorResponse } from '../types/api.js';

/**
 * Custom application error class for structured error handling.
 * Carries an HTTP status code and machine-readable error code so the
 * global error handler can produce a consistent error envelope.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Array<{ field: string; value: unknown; reason: string }>;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: Array<{ field: string; value: unknown; reason: string }>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }

  /** 400 Bad Request */
  static badRequest(
    message: string,
    details?: Array<{ field: string; value: unknown; reason: string }>,
  ): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  /** 404 Not Found */
  static notFound(message: string): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  /** 401 Unauthorized */
  static unauthorized(message: string): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  /** 403 Forbidden */
  static forbidden(message: string): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }
}

/**
 * Global error handler middleware.
 *
 * - AppError instances produce a structured error envelope with the
 *   configured status code and error code.
 * - Unhandled exceptions produce a generic 500 response with NO stack
 *   traces, file paths, database identifiers, or environment variables leaked.
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

    const body: ApiErrorResponse = {
      error: err.errorCode,
      message: err.message,
      ...(err.details && { details: err.details }),
    };

    res.status(err.statusCode).json(body);
    return;
  }

  // Unhandled exception: log the full stack server-side but return only
  // a static message to the client.
  logger.error('Unhandled error', {
    correlationId,
    stack: err.stack,
    path: req.path,
    method: req.method,
    errorName: err.name,
    errorMessage: err.message,
  });

  const body: ApiErrorResponse = {
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred',
  };

  res.status(500).json(body);
}

/**
 * 404 handler for unregistered routes.
 * Mount this after all route definitions but before the global error handler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiErrorResponse = {
    error: 'NOT_FOUND',
    message: `The requested route ${req.method} ${req.path} does not exist`,
  };

  res.status(404).json(body);
}
