import { Router } from 'express';
import { z } from 'zod';

import { facultyController } from '../controllers/facultyController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminOnly, requireRoles } from '../middleware/rbacMiddleware.js';
import { adminManagementRateLimit } from '../middleware/rateLimiter.js';

const router = Router();

// Stricter, source-IP keyed rate limiting + failed-auth audit logging applied
// ahead of authMiddleware for every admin-management endpoint (including the
// password-reset routes). Counts only failed responses, so legitimate admin
// traffic is never throttled while repeated 401/404 probes from one source are
// cut off and logged for enumeration prevention (Requirements 1.6, 9.4).
router.use(adminManagementRateLimit);

// --- Validation Schemas ---

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).strict();

// List query: pagination + faculty filters. `grade` is accepted only so the
// handler can detect and reject the conflicting grade+department combination
// with HTTP 400 (Requirement 10.5). `limit` is bounded to 1..100 via the
// inherited `.int().positive().max(100)` (Requirements 10.7, 12.1).
export const facultyListQuerySchema = paginationQuerySchema.extend({
  department: z.string().optional(),
  grade: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
}).strict();

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).strict();

/**
 * Password-reset body (Requirements 9.1, 9.2). The admin selects the
 * Credential_Delivery_Method; `admin_set` requires a password of at least 8
 * characters, `temporary_password` and `setup_link` carry no password.
 */
const passwordResetBodySchema = z.discriminatedUnion('credentialDeliveryMethod', [
  z.object({
    credentialDeliveryMethod: z.literal('admin_set'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
  z.object({ credentialDeliveryMethod: z.literal('temporary_password') }),
  z.object({ credentialDeliveryMethod: z.literal('setup_link') }),
]);

/**
 * Credential-delivery discriminated union (Requirements 8.1, 5.6).
 * `admin_set` requires an admin-supplied password of at least 8 characters;
 * `temporary_password` and `setup_link` carry no password (the System
 * generates the secret).
 */
const credentialDeliverySchema = z.discriminatedUnion('credentialDeliveryMethod', [
  z.object({
    credentialDeliveryMethod: z.literal('admin_set'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
  z.object({ credentialDeliveryMethod: z.literal('temporary_password') }),
  z.object({ credentialDeliveryMethod: z.literal('setup_link') }),
]);

// Profile fields for faculty creation; credential material is supplied via the
// credentialDeliverySchema union and merged below.
const createFacultyProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Valid email is required').trim(),
  employeeId: z.string().min(1, 'Employee ID is required').trim(),
  department: z.string().min(1, 'Department is required'),
  title: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

// Creation body = profile fields ∧ credential-delivery union (Requirement 5.6).
export const createFacultyBodySchema = z.intersection(
  createFacultyProfileSchema,
  credentialDeliverySchema,
);

// Update body excludes credential material and the immutable `employeeId`;
// password changes flow through the password-reset path (Requirement 6.5).
export const updateFacultyBodySchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  email: z.string().email().trim().optional(),
  department: z.string().min(1).optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
}).strict();

// --- Routes ---

// GET /api/faculty
router.get(
  '/',
  authMiddleware,
  requireRoles('admin', 'teacher'),
  validateRequest({ query: facultyListQuerySchema }),
  facultyController.getAll,
);

// GET /api/faculty/:id
router.get(
  '/:id',
  authMiddleware,
  requireRoles('admin', 'teacher'),
  validateRequest({ params: idParamsSchema }),
  facultyController.getById,
);

// POST /api/faculty
router.post(
  '/',
  authMiddleware,
  adminOnly,
  validateRequest({ body: createFacultyBodySchema }),
  facultyController.create,
);

// PUT /api/faculty/:id
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema, body: updateFacultyBodySchema }),
  facultyController.update,
);

// DELETE /api/faculty/:id
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema }),
  facultyController.remove,
);

// POST /api/faculty/:id/reactivate
router.post(
  '/:id/reactivate',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema }),
  facultyController.reactivate,
);

// POST /api/faculty/:id/password-reset
router.post(
  '/:id/password-reset',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema, body: passwordResetBodySchema }),
  facultyController.passwordReset,
);

export default router;
