import { Router } from 'express';
import { z } from 'zod';

import { dashboardController } from '../controllers/dashboardController.js';
import { parentMeController } from '../controllers/parentMeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// Zod schemas
const childIdParamSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
}).strict();

const dateRangeQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).strict();

// GET /me/children - Get parent's linked children
router.get(
  '/me/children',
  authMiddleware,
  requireRoles('parent'),
  parentMeController.getMyChildren,
);

// GET /me/children/:childId/courses - Get child's courses
router.get(
  '/me/children/:childId/courses',
  authMiddleware,
  requireRoles('parent'),
  validateRequest({ params: childIdParamSchema }),
  parentMeController.getChildCourses,
);

// GET /me/children/:childId/grades - Get child's grades
router.get(
  '/me/children/:childId/grades',
  authMiddleware,
  requireRoles('parent'),
  validateRequest({ params: childIdParamSchema }),
  parentMeController.getChildGrades,
);

// GET /me/children/:childId/attendance - Get child's attendance
router.get(
  '/me/children/:childId/attendance',
  authMiddleware,
  requireRoles('parent'),
  validateRequest({ params: childIdParamSchema, query: dateRangeQuerySchema }),
  parentMeController.getChildAttendance,
);

// GET /me/dashboard - Get parent's dashboard summary (linked children)
router.get(
  '/me/dashboard',
  authMiddleware,
  requireRoles('parent'),
  dashboardController.getParentDashboard,
);

export default router;
