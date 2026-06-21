import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { dashboardService } from '../services/dashboardService.js';
import { success } from '../utils/envelope.js';

/**
 * Per-role dashboard summary controller (Requirements 2.1, 2.5, 2.6, 3.1, 9.1).
 *
 * HTTP-thin: every handler derives the requester's identity from `req.user`
 * (attached by `authMiddleware`) and NEVER from a client-supplied identifier
 * (Req 2.2), delegates to {@link dashboardService}, and wraps the result in the
 * canonical success envelope. When the requester's scope is empty the
 * underlying services return empty collections, so the success envelope
 * naturally satisfies the friendly empty-state contract (Req 9.1). RBAC is
 * enforced at the route layer; errors are forwarded to the global error
 * handler via `next`.
 *
 * The faculty dashboard handler lives in `facultyMeController` because it is
 * mounted under the faculty `/me` surface.
 */
export const dashboardController = {
  /**
   * GET /api/students/me/dashboard — student dashboard summary scoped to the
   * authenticated student (Req 2.1, 2.5, 3.1).
   */
  async getStudentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await dashboardService.getStudentDashboard(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/parents/me/dashboard — parent dashboard summary scoped to the
   * authenticated parent's active linkages (Req 2.6, 3.1). Per-child access is
   * gated by `AuthorizationService` inside the service layer.
   */
  async getParentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await dashboardService.getParentDashboard(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/dashboard — admin management aggregate over the
   * authoritative collections (Req 2.1, 3.1).
   */
  async getAdminDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getAdminDashboard();
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },
};
