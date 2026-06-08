import type { Request, Response, NextFunction } from 'express';

import { AppError } from './errorHandler.js';
import { authTokenService } from '../services/authTokenService.js';
import type { AuthenticatedRequest } from './rbacMiddleware.js';

/**
 * JWT authentication middleware.
 *
 * Validates the access token from the Authorization: Bearer header,
 * decodes it, and attaches `req.user = { userId, role }` to the request.
 *
 * Throws 401 AppError for:
 * - Missing Authorization header
 * - Malformed Bearer token format
 * - Expired access token
 * - Invalid/tampered access token
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw AppError.unauthorized('Authorization header is missing');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Authorization header must use Bearer scheme');
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    throw AppError.unauthorized('Access token is missing');
  }

  try {
    const decoded = await authTokenService.validateAccessToken(token);

    // Attach user info to the request
    (req as AuthenticatedRequest).user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Invalid access token';

    if (message.includes('expired')) {
      throw AppError.unauthorized('Access token has expired');
    }

    throw AppError.unauthorized('Invalid access token');
  }
}
