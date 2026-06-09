import type { Request, Response, NextFunction } from 'express';

import { AppError } from './errorHandler.js';
import type { UserRole } from '../types/common.js';

/**
 * Authenticated user payload attached to request by authMiddleware.
 */
export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

/**
 * Extend Express Request to include the authenticated user.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * A RBAC-enforcing middleware function with an inspectable `__roles` property.
 * The `__roles` array allows the Route Map generator to read the required roles
 * without executing the middleware.
 */
export interface RbacMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  /** The roles this middleware requires — readable by `buildRouteMap`. */
  __roles: UserRole[];
}

/**
 * Route-level RBAC middleware.
 * Checks that the authenticated user has one of the allowed roles.
 * Must be placed after authMiddleware in the middleware chain.
 *
 * The returned function has a `__roles` property that exposes the allowed
 * roles to static analysis tools such as the Route Map generator.
 *
 * @param allowedRoles - One or more roles permitted to access the route.
 */
export function requireRoles(...allowedRoles: UserRole[]): RbacMiddleware {
  const middleware = (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(user.role)) {
      throw AppError.forbidden(
        `Role '${user.role}' does not have permission for this resource`,
      );
    }

    next();
  };

  // Expose roles for static introspection by the Route Map generator
  (middleware as RbacMiddleware).__roles = allowedRoles;

  return middleware as RbacMiddleware;
}

/**
 * Convenience middlewares for common role combinations.
 */
export const adminOnly = requireRoles('admin');
export const teacherOrAdmin = requireRoles('admin', 'teacher');
export const studentOnly = requireRoles('student');
export const parentOnly = requireRoles('parent');
export const allRoles = requireRoles('admin', 'teacher', 'student', 'parent');
