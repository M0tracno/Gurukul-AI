import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { parentLinkageService } from '../services/parentLinkageService.js';
import { auditContextFrom } from '../utils/auditContext.js';
import { success } from '../utils/envelope.js';
import type { UserRole } from '../types/common.js';

/**
 * Admin-only parent-child linkage controller (Requirement 7).
 *
 * HTTP-thin: each handler reads identity from `req.user` (attached by
 * `authMiddleware`), builds an {@link AuditContext} via {@link auditContextFrom},
 * delegates to {@link parentLinkageService}, and wraps the result in the
 * canonical success envelope. RBAC (`adminOnly`, Req 7.4) and Zod validation
 * are enforced at the route layer. Errors are forwarded to the global error
 * handler via `next`.
 */
export const parentLinkageController = {
  /**
   * POST /api/admin/parent-linkages
   *
   * Establish a Parent_Child_Linkage. The phone is normalized and stored
   * canonically; the operation is idempotent on `(studentId, normalized phone)`
   * (Requirements 7.1, 7.3). Responds 201 with the {@link LinkageDTO}.
   */
  async createLinkage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { parentId, studentId, phoneNumber } = req.body as {
        parentId: string;
        studentId: string;
        phoneNumber: string;
      };
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const data = await parentLinkageService.link(parentId, studentId, phoneNumber, ctx);
      res.status(201).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/admin/parent-linkages/:relationId
   *
   * Deactivate a Parent_Child_Linkage (sets `isActive=false`) so subsequent
   * OTP_Requests for that pair are treated as non-matching (Requirement 7.2).
   * Responds 200.
   */
  async deactivateLinkage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { relationId } = req.params as { relationId: string };
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      await parentLinkageService.unlink(relationId, ctx);
      res.status(200).json(success({ relationId, isActive: false }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/parent-linkages?studentId=...
   *
   * List the linkages for a student. The viewer role is forwarded so phone
   * masking applies for non-admin viewers; admin viewers receive the full
   * value (Requirement 7.5).
   */
  async listLinkages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = (req as AuthenticatedRequest).user;
      const { studentId } = req.query as { studentId: string };
      const data = await parentLinkageService.listForStudent(studentId, role as UserRole);
      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },
};
