import { Router } from 'express';
import { z } from 'zod';

import { facultyController } from '../controllers/facultyController.js';
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

const facultyListQuerySchema = paginationQuerySchema.extend({
  department: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).strict();

const createFacultyBodySchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Valid email is required').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  employeeId: z.string().min(1, 'Employee ID is required').trim(),
  department: z.string().min(1, 'Department is required'),
  title: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
}).strict();

const updateFacultyBodySchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  email: z.string().email().trim().optional(),
  employeeId: z.string().min(1).trim().optional(),
  department: z.string().min(1).optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  active: z.boolean().optional(),
}).strict();

// --- Routes ---

// GET /api/v1/faculty
router.get(
  '/',
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ query: facultyListQuerySchema }),
  facultyController.getAll,
);

// GET /api/v1/faculty/:id
router.get(
  '/:id',
  // authenticate,
  // requireRoles(['admin', 'teacher']),
  validateRequest({ params: idParamsSchema }),
  facultyController.getById,
);

// POST /api/v1/faculty
router.post(
  '/',
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ body: createFacultyBodySchema }),
  facultyController.create,
);

// PUT /api/v1/faculty/:id
router.put(
  '/:id',
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ params: idParamsSchema, body: updateFacultyBodySchema }),
  facultyController.update,
);

// DELETE /api/v1/faculty/:id
router.delete(
  '/:id',
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ params: idParamsSchema }),
  facultyController.remove,
);

export default router;
