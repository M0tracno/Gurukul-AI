import { Router } from 'express';
import { z } from 'zod';

import { dashboardController } from '../controllers/dashboardController.js';
import { studentMeController } from '../controllers/studentMeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// Zod schema for optional date range query params
const dateRangeQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).strict();

// GET /me/courses - Get student's enrolled courses
router.get(
  '/me/courses',
  authMiddleware,
  requireRoles('student'),
  studentMeController.getMyCourses,
);

// GET /me/grades - Get student's marks/grades
router.get(
  '/me/grades',
  authMiddleware,
  requireRoles('student'),
  studentMeController.getMyGrades,
);

// GET /me/attendance - Get student's attendance records (optional date filter)
router.get(
  '/me/attendance',
  authMiddleware,
  requireRoles('student'),
  validateRequest({ query: dateRangeQuerySchema }),
  studentMeController.getMyAttendance,
);

// GET /me/dashboard - Get student's dashboard summary (scoped to self)
router.get(
  '/me/dashboard',
  authMiddleware,
  requireRoles('student'),
  dashboardController.getStudentDashboard,
);

export default router;
