import { Router } from 'express';
import { z } from 'zod';

import { parentLinkageController } from '../controllers/parentLinkageController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// --- Validation Schemas ---

/** Mongo ObjectId-ish: a 24-character hex string. */
const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid 24-character hex id');

// POST body: link a parent to a specific student via a phone number (Req 7.1).
const createLinkageBodySchema = z
  .object({
    parentId: objectIdSchema,
    studentId: objectIdSchema,
    phoneNumber: z.string().trim().min(1, 'Phone number is required'),
  })
  .strict();

// DELETE param: the relation id to deactivate (Req 7.2).
const relationIdParamSchema = z
  .object({
    relationId: objectIdSchema,
  })
  .strict();

// GET query: the student whose linkages to list (Req 7.5).
const listLinkagesQuerySchema = z
  .object({
    studentId: objectIdSchema,
  })
  .strict();

// --- Routes ---
// Pipeline (design §Architecture): authMiddleware → adminOnly → validateRequest
// → controller. `adminOnly` returns 403 for any non-admin caller (Req 7.4).

// POST /api/admin/parent-linkages — create (idempotent) a linkage.
router.post(
  '/',
  authMiddleware,
  adminOnly,
  validateRequest({ body: createLinkageBodySchema }),
  parentLinkageController.createLinkage,
);

// GET /api/admin/parent-linkages?studentId=... — list a student's linkages.
router.get(
  '/',
  authMiddleware,
  adminOnly,
  validateRequest({ query: listLinkagesQuerySchema }),
  parentLinkageController.listLinkages,
);

// DELETE /api/admin/parent-linkages/:relationId — deactivate a linkage.
router.delete(
  '/:relationId',
  authMiddleware,
  adminOnly,
  validateRequest({ params: relationIdParamSchema }),
  parentLinkageController.deactivateLinkage,
);

export default router;
