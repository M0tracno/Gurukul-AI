import type { Request, Response, NextFunction } from 'express';

import { AppError } from './errorHandler.js';
import { auditService } from '../services/auditService.js';
import { redactSecrets } from '../utils/auditContext.js';
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
 * Resolve the source IP for an incoming request.
 *
 * Prefers Express's resolved `req.ip` (which honours `trust proxy`), falling
 * back to the left-most hop of the `X-Forwarded-For` header, then to
 * `'unknown'` so the audit entry always carries a non-empty value.
 */
function resolveIp(req: Request): string {
  if (req.ip) {
    return req.ip;
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.split(',')[0]!.trim();
  }

  return 'unknown';
}

/**
 * Record an `access_denied` audit entry for a 403 RBAC denial.
 *
 * Fired (not awaited) immediately before `requireRoles` throws so the
 * synchronous throw semantics that the route map and existing tests rely on
 * are preserved. The audit write happens on its own microtask and any failure
 * is swallowed so it can never mask or delay the 403 response.
 *
 * @see Requirement 11.3 — authorization denials are audited
 */
function recordAccessDenial(req: Request, allowedRoles: UserRole[]): void {
  const user = (req as AuthenticatedRequest).user;
  // For a 403 the requester is authenticated, so `user` is present; guard
  // defensively in case the middleware is ever reached without it.
  const correlationId =
    (req as Partial<AuthenticatedRequest> & { correlationId?: string }).correlationId ??
    'unknown';

  // A generic resource descriptor derived from the request path; resourceId is
  // the targeted record id when the route carries one.
  const resource = `${req.baseUrl ?? ''}${req.path ?? ''}` || 'admin-management';
  const rawId = req.params?.id;
  const resourceId = typeof rawId === 'string' ? rawId : undefined;

  void auditService
    .logEvent({
      userId: user?.userId ?? 'unknown',
      role: user?.role ?? 'unknown',
      ip: resolveIp(req),
      action: 'access_denied',
      resource,
      resourceId,
      correlationId,
      metadata: redactSecrets({
        method: req.method,
        requiredRoles: allowedRoles,
      }),
    })
    .catch(() => {
      /* never let an audit failure affect the 403 response */
    });
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
      // Record the denial before throwing. Fired without awaiting so the
      // synchronous 403 throw (relied on by the route map and tests) is
      // unchanged; audit failures are swallowed and never block the response.
      recordAccessDenial(req, allowedRoles);
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
