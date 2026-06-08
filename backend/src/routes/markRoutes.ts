import { Router } from 'express';
import { z } from 'zod';

import { markController } from '../controllers/markController.js';
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

const markListQuerySchema = paginationQuerySchema.extend({
  enrollment: z.string().optional(),
  type: z.enum(['assignment', 'quiz', 'exam', 'project', 'participation', 'other']).optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).strict();

const createMarkBodySchema = z.object({
  enrollment: z.string().min(1, 'Enrollment ID is required'),
  title: z.string().min(1, 'Assessment title is required').trim(),
  type: z.enum(['assignment', 'quiz', 'exam', 'project', 'participation', 'other']).default('assignment'),
  maxScore: z.number().min(0, 'Maximum score cannot be negative'),
  score: z.number().min(0, 'Score cannot be negative'),
  weight: z.number().min(0, 'Weight cannot be negative').default(1),
  dueDate: z.string().datetime().optional(),
  submissionDate: z.string().datetime().optional(),
  feedback: z.string().optional(),
}).strict();

const updateMarkBodySchema = z.object({
  title: z.string().min(1).trim().optional(),
  type: z.enum(['assignment', 'quiz', 'exam', 'project', 'participation', 'other']).optional(),
  maxScore: z.number().min(0).optional(),
  score: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  submissionDate: z.string().datetime().optional(),
  feedback: z.string().optional(),
}).strict();

// --- Routes ---

// GET /api/v1/marks
router.get(
  '/',
  // authenticate,
  // requireRoles(['admin', 'teacher', 'student']),
  validateRequest({ query: markListQuerySchema }),
  markController.getAll,
);

// GET /api/v1/marks/:id
router.get(
  '/:id',
  // authenticate,
  validateRequest({ params: idParamsSchema }),
  markController.getById,
);

// POST /api/v1/marks
router.post(
  '/',
  // authenticate,
  // requireRoles(['admin', 'teacher']),
  validateRequest({ body: createMarkBodySchema }),
  markController.create,
);

// PUT /api/v1/marks/:id
router.put(
  '/:id',
  // authenticate,
  // requireRoles(['admin', 'teacher']),
  validateRequest({ params: idParamsSchema, body: updateMarkBodySchema }),
  markController.update,
);

// DELETE /api/v1/marks/:id
router.delete(
  '/:id',
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ params: idParamsSchema }),
  markController.remove,
);

export default router;
