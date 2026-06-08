import { Router } from 'express';
import { z } from 'zod';

import { courseController } from '../controllers/courseController.js';
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

const courseListQuerySchema = paginationQuerySchema.extend({
  faculty: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).strict();

const scheduleItemSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  room: z.string().optional(),
});

const createCourseBodySchema = z.object({
  title: z.string().min(1, 'Course title is required').trim(),
  code: z.string().min(1, 'Course code is required').trim(),
  description: z.string().min(1, 'Course description is required'),
  faculty: z.string().min(1, 'Faculty ID is required'),
  startDate: z.string().datetime({ message: 'Valid start date is required' }),
  endDate: z.string().datetime({ message: 'Valid end date is required' }),
  schedule: z.array(scheduleItemSchema).optional(),
  credits: z.number().min(0, 'Credits cannot be negative'),
  maxStudents: z.number().int().positive().optional(),
}).strict();

const updateCourseBodySchema = z.object({
  title: z.string().min(1).trim().optional(),
  code: z.string().min(1).trim().optional(),
  description: z.string().min(1).optional(),
  faculty: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  schedule: z.array(scheduleItemSchema).optional(),
  credits: z.number().min(0).optional(),
  maxStudents: z.number().int().positive().optional(),
  active: z.boolean().optional(),
}).strict();

// --- Routes ---

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: List all courses
 *     description: Retrieve a paginated list of courses with optional filtering.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: faculty
 *         schema:
 *           type: string
 *         description: Filter by faculty ID
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or code
 *     responses:
 *       200:
 *         description: A paginated list of courses
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
 *                     $ref: '#/components/schemas/Course'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  // authenticate,
  validateRequest({ query: courseListQuerySchema }),
  courseController.getAll,
);

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     summary: Get a course by ID
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course MongoDB ID
 *     responses:
 *       200:
 *         description: Course details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       404:
 *         description: Course not found
 */
router.get(
  '/:id',
  // authenticate,
  validateRequest({ params: idParamsSchema }),
  courseController.getById,
);

/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Create a new course
 *     description: Create a new course. Requires admin or teacher role.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - code
 *               - description
 *               - faculty
 *               - startDate
 *               - endDate
 *               - credits
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Mathematics 101"
 *               code:
 *                 type: string
 *                 example: "MATH-101"
 *               description:
 *                 type: string
 *                 example: "Introduction to algebra and calculus"
 *               faculty:
 *                 type: string
 *                 description: Faculty member's MongoDB ID
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               schedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     room:
 *                       type: string
 *               credits:
 *                 type: number
 *                 minimum: 0
 *                 example: 3
 *               maxStudents:
 *                 type: integer
 *                 minimum: 1
 *                 example: 30
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Course'
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  // authenticate,
  // requireRoles(['admin', 'teacher']),
  validateRequest({ body: createCourseBodySchema }),
  courseController.create,
);

/**
 * @swagger
 * /courses/{id}:
 *   put:
 *     summary: Update a course
 *     description: Update an existing course. Requires admin or teacher role.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               faculty:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               schedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     room:
 *                       type: string
 *               credits:
 *                 type: number
 *               maxStudents:
 *                 type: integer
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       404:
 *         description: Course not found
 */
router.put(
  '/:id',
  // authenticate,
  // requireRoles(['admin', 'teacher']),
  validateRequest({ params: idParamsSchema, body: updateCourseBodySchema }),
  courseController.update,
);

/**
 * @swagger
 * /courses/{id}:
 *   delete:
 *     summary: Delete a course
 *     description: Soft-delete a course. Requires admin role.
 *     tags: [Courses]
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
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 */
router.delete(
  '/:id',
  // authenticate,
  // requireRoles(['admin']),
  validateRequest({ params: idParamsSchema }),
  courseController.remove,
);

export default router;
