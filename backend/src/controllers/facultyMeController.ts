import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { facultyMeService } from '../services/facultyMeService.js';
import type { Weekday } from '../services/facultyMeService.js';
import { dashboardService } from '../services/dashboardService.js';
import { success } from '../utils/envelope.js';

/**
 * Teacher self-scoped read controller (Requirements 2.4, 3.1, 3.3).
 *
 * HTTP-thin: every handler derives the faculty identity from `req.user`
 * (attached by `authMiddleware`) and NEVER from a client-supplied identifier
 * (Req 2.2), delegates to {@link facultyMeService} / {@link dashboardService},
 * and wraps the result in the canonical success envelope. RBAC
 * (`requireRoles('faculty','admin')`) and Zod validation are enforced at the
 * route layer; errors are forwarded to the global error handler via `next`.
 */
export const facultyMeController = {
  /**
   * GET /api/faculty/me/profile — the authenticated faculty member's own
   * authoritative `Faculty` record (Req 3.1).
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await facultyMeService.getProfile(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/faculty/me/courses — the courses owned by the authenticated
   * faculty member (Req 2.4).
   */
  async getCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await facultyMeService.getCourses(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/faculty/me/students — the distinct students enrolled in the
   * authenticated faculty member's own courses (Req 2.4, 3.3).
   */
  async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await facultyMeService.getStudents(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/faculty/me/schedule?day=... — the schedule slots drawn from the
   * authenticated faculty member's own courses, optionally filtered to one
   * weekday (Req 2.4).
   */
  async getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { day } = req.query as { day?: Weekday };
      const data = await facultyMeService.getSchedule(userId, day);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/faculty/me/dashboard — the faculty dashboard summary scoped to
   * the authenticated faculty member (Req 2.1, 2.4, 2.5, 3.1).
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await dashboardService.getFacultyDashboard(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },
};
