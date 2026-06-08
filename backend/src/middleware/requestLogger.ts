import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Request logging middleware.
 *
 * Logs structured JSON for every HTTP request with:
 * - requestId (correlationId)
 * - userId (if authenticated)
 * - role (if authenticated)
 * - endpoint (req.path)
 * - method (req.method)
 * - status (response status code)
 * - responseTime (ms)
 *
 * Should be mounted after correlationId middleware and auth middleware
 * so that req.correlationId and req.user are available.
 *
 * @see Requirements 11.1
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Hook into response finish event to capture status code and timing
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const user = (req as any).user;

    logger.info('HTTP Request', {
      requestId: req.correlationId || (req.headers['x-correlation-id'] as string),
      userId: user?.userId || user?.id || undefined,
      role: user?.role || undefined,
      endpoint: req.path,
      method: req.method,
      status: res.statusCode,
      responseTime,
    });
  });

  next();
}
