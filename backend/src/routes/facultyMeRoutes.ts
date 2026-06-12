import { Router } from 'express';
import { z } from 'zod';

import { facultyMeController } from '../controllers/facultyMeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

/**
 * Teacher self-scope routes, mounted under `/api/faculty` (Req 2.4) alongside
 * the existing admin-management faculty routes. The `/me/*` paths never
 * collide with the admin routes (`/`, `/:id`, `/:id/...`) because they are
 * two-segment paths under the literal `me` prefix.
 *
 * Every route enforces the fixed pipeline
 *   `authMiddleware → requireRoles(...) → validateRequest → controller`
 * so an unauthenticated caller is rejected with 401 before any role/scope
 * check runs (Req 2.7) and a wrong-role caller is rejected with 403 before the
 * handler executes (Req 2.8). Scope is always derived from `req.user`
 * (Req 2.2); no client-supplied identifier is read.
 */

/** Allowed weekday values for the optional schedule `?day=` filter. */
const scheduleQuerySchema = z
  .object({
    day: z
      .enum([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ])
      .optional(),
  })
  .strict();

// GET /api/faculty/me/profile — own authoritative Faculty record.
router.get(
  '/me/profile',
  authMiddleware,
  requireRoles('faculty', 'admin'),
  facultyMeController.getProfile,
);

// GET /api/faculty/me/courses — own (non-deleted) courses.
router.get(
  '/me/courses',
  authMiddleware,
  requireRoles('faculty', 'admin'),
  facultyMeController.getCourses,
);

// GET /api/faculty/me/students — distinct students enrolled in own courses.
router.get(
  '/me/students',
  authMiddleware,
  requireRoles('faculty', 'admin'),
  facultyMeController.getStudents,
);

// GET /api/faculty/me/schedule?day=... — own schedule slots, optional weekday.
router.get(
  '/me/schedule',
  authMiddleware,
  requireRoles('faculty', 'admin'),
  validateRequest({ query: scheduleQuerySchema }),
  facultyMeController.getSchedule,
);

// GET /api/faculty/me/dashboard — faculty dashboard summary.
router.get(
  '/me/dashboard',
  authMiddleware,
  requireRoles('faculty', 'admin'),
  facultyMeController.getDashboard,
);

// GET /api/faculty/me/quiz-analytics — aggregate/per-assessment quiz analytics.
router.get(
  '/me/quiz-analytics',
  authMiddleware,
  requireRoles('teacher', 'admin'),
  facultyMeController.getQuizAnalytics,
);

export default router;
