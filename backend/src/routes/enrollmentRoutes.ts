import { Router } from 'express';
import { z } from 'zod';

import { enrollmentController } from '../controllers/enrollmentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminOnly, requireRoles } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// --- Validation Schemas ---

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).strict();

const enrollmentListQuerySchema = paginationQuerySchema.extend({
  student: z.string().optional(),
  course: z.string().optional(),
  status: z.enum(['active', 'completed', 'withdrawn', 'failed']).optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).strict();

const createEnrollmentBodySchema = z.object({
  student: z.string().min(1, 'Student ID is required'),
  course: z.string().min(1, 'Course ID is required'),
  enrollmentDate: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'withdrawn', 'failed']).optional(),
}).strict();

const updateEnrollmentBodySchema = z.object({
  status: z.enum(['active', 'completed', 'withdrawn', 'failed']).optional(),
  grade: z.enum(['A', 'B', 'C', 'D', 'F', 'I', 'W', 'N/A']).optional(),
  finalScore: z.number().min(0).max(100).nullable().optional(),
}).strict();

// --- Routes ---

// GET /api/v1/enrollments
router.get(
  '/',
  authMiddleware,
  requireRoles('admin', 'teacher'),
  validateRequest({ query: enrollmentListQuerySchema }),
  enrollmentController.getAll,
);

// GET /api/v1/enrollments/:id
router.get(
  '/:id',
  authMiddleware,
  requireRoles('admin', 'teacher'),
  validateRequest({ params: idParamsSchema }),
  enrollmentController.getById,
);

// POST /api/v1/enrollments
router.post(
  '/',
  authMiddleware,
  adminOnly,
  validateRequest({ body: createEnrollmentBodySchema }),
  enrollmentController.create,
);

// PUT /api/v1/enrollments/:id
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema, body: updateEnrollmentBodySchema }),
  enrollmentController.update,
);

// DELETE /api/v1/enrollments/:id
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema }),
  enrollmentController.remove,
);

export default router;
