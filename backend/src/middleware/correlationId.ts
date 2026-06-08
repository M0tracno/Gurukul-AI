import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Correlation ID middleware.
 *
 * Reads the `x-correlation-id` header from incoming requests. If the header
 * is absent, generates a new UUID v4 via Node.js crypto. The correlation ID
 * is attached to the request object for downstream consumers and set on the
 * response headers so clients can reference it.
 *
 * @see Requirements 11.6, 11.7
 */

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Read from header or generate new UUID
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

  // Attach to request object for use by downstream handlers and services
  req.correlationId = correlationId;

  // Include in response headers for client traceability
  res.setHeader('x-correlation-id', correlationId);

  next();
}
