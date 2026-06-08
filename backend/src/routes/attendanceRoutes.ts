import { Router } from 'express';
import { z } from 'zod';

import { attendanceController } from '../controllers/attendanceController.js';
import { validateRequest } from '../middleware/validateRequest.js';

// Placeholder auth/RBAC middleware — being built in parallel (Task 4.4, 4.5)
// import { authenticate } from '../middleware/authMiddleware.js';
// import { requireRoles } from '../middleware/rbacMiddleware.js';

const router = Router();

// --- Validation Schemas ---

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).strict();

const attendanceListQuerySchema = paginationQuerySchema.extend({
  enrollment: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).strict();

const createAttendanceBodySchema = z.object({
  enrollment: z.string().min(1, 'Enrollment ID is required'),
  date: z.string().datetime({ message: 'Valid date is required' }),
  status: z.enum(['present', 'absent', 'late', 'excused']).default('present'),
  notes: z.string().optional(),
}).strict();

const updateAttendanceBodySchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
  notes: z.string().optional(),
}).strict();

// --- Routes ---

// GET /api/v1/attendance
router.get(
  '/',
  // authenticate,
  // requireRoles(['admin', 'teacher', 'student']),
  validateRequest({ query: attendanceListQuerySchema }),
  attendanceController.getAll,
);

// GET /api/v1/attendance/:id
router.get(
  '/:id',
  // authenticate,
  validateRequest({ params: idParamsSchema }),
  attendanceController.getById,
);

// POST /api/v1/attendance
router.post(
  '/',
  // authenticate,
  // requireRoles(['admin', 'teacher']),
  validateRequest({ body: createAttendanceBodySchema }),
  attendanceController.create,
);

// PUT /api/v1/attendance/:id
router.put(
  '/:id',
  // authenticate,
  // requireRoles(['admin', 'teacher']),
  validateRequest({ params: idParamsSchema, body: updateAttendanceBodySchema }),
  attendanceController.update,
);

// DELETE /api/v1/attendance/:id
router.delete(
  '/:id',
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ params: idParamsSchema }),
  attendanceController.remove,
);

export default router;
