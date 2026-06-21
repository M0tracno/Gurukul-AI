import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { success } from '../utils/envelope.js';
import { auditContextFrom } from '../utils/auditContext.js';
import { facultyService } from '../services/facultyService.js';
import type {
  CreateFacultyInput,
  UpdateFacultyInput,
  FacultyFilters,
} from '../services/facultyService.js';
import type { CredentialDeliveryMethod } from '../services/credentialService.js';
import type { Pagination } from '../types/common.js';

/**
 * Faculty resource controller.
 *
 * Handles HTTP request/response only; all business logic lives in
 * {@link facultyService}. Admin account handlers build an {@link AuditContext}
 * from the authenticated request via {@link auditContextFrom} and delegate to
 * the service, shaping responses per `FacultyResponse` /
 * `CreateFacultyAccountResult` / `ResetResult`.
 */
export const facultyController = {
  /**
   * GET /api/v1/faculty
   * List Faculty_Accounts with pagination, search, and filters.
   * Delegates to {@link FacultyService.list}; the password is excluded from
   * every entry.
   *
   * @see Requirement 10.1
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination: Pagination = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const filters: FacultyFilters = {
        department: req.query.department as string | undefined,
        grade: req.query.grade as string | undefined,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await facultyService.list(filters, pagination);

      res.status(200).json(
        success(result.data, {
          page: result.meta.page,
          limit: result.meta.limit,
          total: result.meta.total,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/faculty/:id
   * Get a single faculty member by ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // const faculty = await facultyService.findById(id);
    const faculty = null as unknown;

    if (!faculty) {
      throw AppError.notFound(`Faculty member with id '${id}' not found`);
    }

    res.json(success(faculty));
  },

  /**
   * POST /api/v1/faculty
   * Create a Faculty_Account with credentials.
   * Responds 201 with the `CreateFacultyAccountResult` (the account plus, for
   * the `temporary_password` method, the one-time plaintext, or `setupLinkSent`
   * for the `setup_link` method).
   *
   * @see Requirements 5.1, 11.1
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const body = req.body;

      const input: CreateFacultyInput = {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        employeeId: body.employeeId,
        department: body.department,
        credentialDeliveryMethod: body.credentialDeliveryMethod,
        password: body.password,
        title: body.title,
        phone: body.phone,
        bio: body.bio,
        isAdmin: body.isAdmin,
      };

      const result = await facultyService.createWithCredentials(input, ctx);

      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/faculty/:id
   * Update an existing Faculty_Account profile. Responds 200 with the updated
   * `FacultyResponse` (password excluded).
   *
   * @see Requirements 6.1, 11.1
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const id = String(req.params.id);
      const body = req.body;

      const patch: UpdateFacultyInput = {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        department: body.department,
        title: body.title,
        phone: body.phone,
        bio: body.bio,
      };

      const updated = await facultyService.updateAccount(id, patch, ctx);

      res.status(200).json(success(updated));
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/faculty/:id
   * Soft-delete (deactivate) a Faculty_Account. Responds 200.
   *
   * @see Requirements 7.1, 11.1
   */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const id = String(req.params.id);

      await facultyService.deactivate(id, ctx);

      res.status(200).json(success({ id, active: false }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/faculty/:id/reactivate
   * Reactivate a previously deactivated Faculty_Account. Responds 200 with the
   * updated `FacultyResponse`.
   *
   * @see Requirements 7.4, 11.1
   */
  async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const id = String(req.params.id);

      const result = await facultyService.reactivate(id, ctx);

      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/faculty/:id/password-reset
   * Admin-initiated password reset. Responds 200 with the `ResetResult` (the
   * one-time plaintext for `temporary_password`, or `setupLinkSent` for
   * `setup_link`; no password data otherwise).
   *
   * @see Requirements 9.1, 11.2
   */
  async passwordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const id = String(req.params.id);
      const method = req.body.credentialDeliveryMethod as CredentialDeliveryMethod;
      const password = req.body.password as string | undefined;

      const result = await facultyService.resetPassword(id, method, ctx, password);

      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  },
};
