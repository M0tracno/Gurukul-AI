import { Router } from 'express';
import { z } from 'zod';

import { studentController } from '../controllers/studentController.js';
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

// List query: pagination + student filters. `department` is accepted only so
// the handler can detect and reject the conflicting grade+department
// combination with HTTP 400 (Requirement 10.5). `limit` is bounded to 1..100
// via the inherited `.int().positive().max(100)` (Requirements 10.7, 12.1).
export const studentListQuerySchema = paginationQuerySchema.extend({
  grade: z.string().optional(),
  department: z.string().optional(),
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
 * Credential-delivery discriminated union (Requirements 8.1, 4.6).
 * `admin_set` requires an admin-supplied password of at least 8 characters;
 * `temporary_password` and `setup_link` carry no password (the System
 * generates the secret). Shared by student and faculty create/reset schemas.
 */
const credentialDeliverySchema = z.discriminatedUnion('credentialDeliveryMethod', [
  z.object({
    credentialDeliveryMethod: z.literal('admin_set'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
  z.object({ credentialDeliveryMethod: z.literal('temporary_password') }),
  z.object({ credentialDeliveryMethod: z.literal('setup_link') }),
]);

// Profile fields for student creation; credential material is supplied via the
// credentialDeliverySchema union and merged below.
const createStudentProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Valid email is required').trim(),
  studentId: z.string().min(1, 'Student ID is required').trim(),
  grade: z.string().min(1, 'Grade level is required'),
  dateOfBirth: z.string().datetime().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
});

// Creation body = profile fields ∧ credential-delivery union (Requirement 4.6).
export const createStudentBodySchema = z.intersection(
  createStudentProfileSchema,
  credentialDeliverySchema,
);

// Update body excludes credential material and the immutable `studentId`;
// password changes flow through the password-reset path (Requirement 6.5).
export const updateStudentBodySchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  email: z.string().email().trim().optional(),
  grade: z.string().min(1).optional(),
  dateOfBirth: z.string().datetime().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
}).strict();

// --- Routes ---

/**
 * @swagger
 * /students:
 *   get:
 *     summary: List all students
 *     description: Retrieve a paginated list of students with optional filtering by grade, active status, or search term.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: grade
 *         schema:
 *           type: string
 *         description: Filter by grade level
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: A paginated list of students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *             example:
 *               success: true
 *               data:
 *                 - _id: "507f1f77bcf86cd799439011"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   email: "john.doe@school.edu"
 *                   studentId: "STU-2024-001"
 *                   grade: "10"
 *                   active: true
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 45
 *                 totalPages: 3
 *       401:
 *         description: Unauthorized — missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  authMiddleware,
  requireRoles('admin', 'teacher'),
  validateRequest({ query: studentListQuerySchema }),
  studentController.getAll,
);

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     summary: Get a student by ID
 *     description: Retrieve a single student's full details by their MongoDB ID.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student MongoDB ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Student details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  authMiddleware,
  requireRoles('admin', 'teacher'),
  validateRequest({ params: idParamsSchema }),
  studentController.getById,
);

/**
 * @swagger
 * /students:
 *   post:
 *     summary: Create a new student
 *     description: Register a new student in the system. Requires admin role.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - studentId
 *               - grade
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@school.edu"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "securePass123"
 *               studentId:
 *                 type: string
 *                 example: "STU-2024-001"
 *               grade:
 *                 type: string
 *                 example: "10"
 *               dateOfBirth:
 *                 type: string
 *                 format: date-time
 *               parentName:
 *                 type: string
 *               parentEmail:
 *                 type: string
 *                 format: email
 *               parentPhone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Student with this email or studentId already exists
 */
router.post(
  '/',
  authMiddleware,
  adminOnly,
  validateRequest({ body: createStudentBodySchema }),
  studentController.create,
);

/**
 * @swagger
 * /students/{id}:
 *   put:
 *     summary: Update a student
 *     description: Update an existing student's information. Requires admin role.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student MongoDB ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               studentId:
 *                 type: string
 *               grade:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date-time
 *               parentName:
 *                 type: string
 *               parentEmail:
 *                 type: string
 *                 format: email
 *               parentPhone:
 *                 type: string
 *               address:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Student updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found
 */
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema, body: updateStudentBodySchema }),
  studentController.update,
);

/**
 * @swagger
 * /students/{id}:
 *   delete:
 *     summary: Delete a student
 *     description: Soft-delete a student record. Requires admin role.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student MongoDB ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Student deleted successfully"
 *       404:
 *         description: Student not found
 */
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema }),
  studentController.remove,
);

/**
 * @swagger
 * /students/{id}/reactivate:
 *   post:
 *     summary: Reactivate a student
 *     description: Reactivate a previously deactivated student account. Requires admin role.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student reactivated successfully
 *       404:
 *         description: Student not found
 */
router.post(
  '/:id/reactivate',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema }),
  studentController.reactivate,
);

/**
 * @swagger
 * /students/{id}/password-reset:
 *   post:
 *     summary: Reset a student's password
 *     description: Admin-initiated password reset using the selected credential delivery method. Requires admin role.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset completed
 *       404:
 *         description: Student not found
 */
router.post(
  '/:id/password-reset',
  authMiddleware,
  adminOnly,
  validateRequest({ params: idParamsSchema, body: passwordResetBodySchema }),
  studentController.passwordReset,
);

export default router;
