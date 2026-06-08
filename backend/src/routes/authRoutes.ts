import { Router } from 'express';
import { z } from 'zod';

import { authController } from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// --- Validation Schemas ---

const loginBodySchema = z.object({
  email: z.string().email('Valid email is required').trim(),
  password: z.string().min(1, 'Password is required'),
  userType: z.enum(['student', 'teacher', 'parent', 'admin', 'faculty']).optional(),
  role: z.enum(['student', 'teacher', 'parent', 'admin', 'faculty']).optional(),
}).strict().refine(
  (data) => data.userType || data.role,
  { message: 'Either userType or role is required' }
);

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
}).strict();

const registerStudentSchema = z.object({
  email: z.string().email('Valid email is required').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  studentId: z.string().min(1, 'Student ID is required').trim(),
  grade: z.string().min(1, 'Grade is required'),
}).strict();

const registerFacultySchema = z.object({
  email: z.string().email('Valid email is required').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  employeeId: z.string().min(1, 'Employee ID is required').trim(),
  department: z.string().min(1, 'Department is required'),
}).strict();

const parentLoginSchema = z.object({
  email: z.string().email('Valid email is required').trim(),
  password: z.string().min(1, 'Password is required'),
  role: z.literal('parent').optional(),
}).strict();

const sendOtpSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required').trim(),
  studentId: z.string().optional(),
}).strict();

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required').trim(),
  otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
  otpId: z.string().min(1, 'OTP ID is required'),
}).strict();

// --- Routes ---

// POST /api/v1/auth/login
router.post(
  '/login',
  validateRequest({ body: loginBodySchema }),
  authController.login,
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  validateRequest({ body: refreshBodySchema }),
  authController.refresh,
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authMiddleware,
  authController.me,
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authMiddleware,
  authController.logout,
);

// POST /api/v1/auth/register/student
router.post(
  '/register/student',
  validateRequest({ body: registerStudentSchema }),
  authController.registerStudent,
);

// POST /api/v1/auth/register/faculty
router.post(
  '/register/faculty',
  validateRequest({ body: registerFacultySchema }),
  authController.registerFaculty,
);

// POST /api/auth/parent/login
router.post(
  '/parent/login',
  validateRequest({ body: parentLoginSchema }),
  authController.parentLogin,
);

// POST /api/auth/parent/send-otp
router.post(
  '/parent/send-otp',
  validateRequest({ body: sendOtpSchema }),
  authController.sendOtp,
);

// POST /api/auth/parent/verify-otp
router.post(
  '/parent/verify-otp',
  validateRequest({ body: verifyOtpSchema }),
  authController.verifyOtp,
);

export default router;
