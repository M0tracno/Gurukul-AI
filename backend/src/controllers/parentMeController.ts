import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { success } from '../utils/envelope.js';
import { parentMeService } from '../services/parentMeService.js';

export const parentMeController = {
  async getMyChildren(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await parentMeService.getChildren(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  async getChildCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const { childId } = req.params as { childId: string };
      const data = await parentMeService.getChildCourses(userId, childId, role as any);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  async getChildGrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const { childId } = req.params as { childId: string };
      const data = await parentMeService.getChildGrades(userId, childId, role as any);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  async getChildAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const { childId } = req.params as { childId: string };
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const dateRange = (startDate || endDate)
        ? {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          }
        : undefined;

      const data = await parentMeService.getChildAttendance(userId, childId, role as any, dateRange);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },
};
