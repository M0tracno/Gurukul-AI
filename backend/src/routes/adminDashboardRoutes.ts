import { Router } from 'express';

import { dashboardController } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/rbacMiddleware.js';

const router = Router();

/**
 * Admin dashboard summary route, mounted under `/api/admin` (Req 2.1, 3.1).
 *
 * Mounted alongside `/api/admin/parent-linkages`; the `/dashboard` path does
 * not collide. Enforces the fixed pipeline
 *   `authMiddleware → adminOnly → controller`
 * so an unauthenticated caller is rejected with 401 (Req 2.7) and any
 * non-admin caller is rejected with 403 (Req 2.8) before the handler runs.
 */

// GET /api/admin/dashboard — management aggregate over authoritative records.
router.get(
  '/dashboard',
  authMiddleware,
  adminOnly,
  dashboardController.getAdminDashboard,
);

export default router;
