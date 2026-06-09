import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { success } from '../utils/envelope.js';
import { studentMeService } from '../services/studentMeService.js';

export const studentMeController = {
  async getMyCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await studentMeService.getCourses(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  async getMyGrades(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const data = await studentMeService.getGrades(userId);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  async getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const dateRange = (startDate || endDate)
        ? {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          }
        : undefined;

      const data = await studentMeService.getAttendance(userId, dateRange);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },
};
