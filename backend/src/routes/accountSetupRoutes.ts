import { Router } from 'express';
import { z } from 'zod';

import { accountSetupController } from '../controllers/accountSetupController.js';
import { validateRequest } from '../middleware/validateRequest.js';

/**
 * Public account-setup routes (Requirement 8.6).
 *
 * This router is intentionally PUBLIC — it carries NO authentication or RBAC
 * middleware. The bearer of a valid, unexpired, unused setup token proves their
 * right to set the account's initial password; the token in the URL is the
 * credential. The service rejects invalid/expired/used tokens with HTTP 400.
 */
const router = Router();

// --- Validation Schemas ---

const tokenParamsSchema = z.object({
  token: z.string().min(1, 'Setup token is required'),
}).strict();

// Password policy mirrors the service (>= 8 chars, Requirement 8.1/8.6).
const accountSetupBodySchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
}).strict();

// --- Routes ---

// POST /api/account-setup/:token — consume a single-use setup link (public).
router.post(
  '/:token',
  validateRequest({ params: tokenParamsSchema, body: accountSetupBodySchema }),
  accountSetupController.consume,
);

export default router;
