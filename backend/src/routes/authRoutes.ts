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

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authMiddleware,
  authController.logout,
);

export default router;
