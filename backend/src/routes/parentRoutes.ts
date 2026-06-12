import { Router } from 'express';
import { z } from 'zod';

import { parentController } from '../controllers/parentController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/rbacMiddleware.js';
import { adminManagementRateLimit } from '../middleware/rateLimiter.js';

const router = Router();

// Stricter, source-IP keyed rate limiting + failed-auth audit logging applied
// ahead of authMiddleware for the admin-management parents endpoint, mirroring
// `facultyRoutes`. Counts only failed responses, so legitimate admin traffic is
// never throttled while repeated 401/403 probes from one source are cut off and
// logged for enumeration prevention (Requirements 10.6, 10.7, 12.1).
router.use(adminManagementRateLimit);

// --- Validation Schemas ---

// List query: pagination + parent filters. `limit` is bounded to 1..100 via the
// inherited `.int().positive().max(100)` (Requirements 10.2, 12.1). `search`
// matches firstName/lastName/email/phoneNumber/parentId in the service layer
// (Requirement 10.3).
export const parentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
}).strict();

// --- Routes ---

// GET /api/parents — admin parents list (Requirements 10.6, 10.7, 10.8).
router.get(
  '/',
  authMiddleware,
  adminOnly,
  validateRequest({ query: parentListQuerySchema }),
  parentController.getAll,
);

export default router;
