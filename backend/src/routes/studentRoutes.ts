import { Router } from 'express';
import { z } from 'zod';

import { studentController } from '../controllers/studentController.js';
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

const studentListQuerySchema = paginationQuerySchema.extend({
  grade: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).strict();

const createStudentBodySchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Valid email is required').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  studentId: z.string().min(1, 'Student ID is required').trim(),
  grade: z.string().min(1, 'Grade level is required'),
  dateOfBirth: z.string().datetime().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
}).strict();

const updateStudentBodySchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  email: z.string().email().trim().optional(),
  studentId: z.string().min(1).trim().optional(),
  grade: z.string().min(1).optional(),
  dateOfBirth: z.string().datetime().optional(),
  parentName: z.string().optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().optional(),
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
  // authenticate,
  // requireRoles(['admin', 'teacher']),
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
  // authenticate,
  // requireRoles(['admin', 'teacher', 'student']),
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
  // authenticate,
  // requireRoles(['admin']),
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
  // authenticate,
  // requireRoles(['admin']),
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
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ params: idParamsSchema }),
  studentController.remove,
);

export default router;
