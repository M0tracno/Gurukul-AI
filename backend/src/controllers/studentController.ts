import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { success } from '../utils/envelope.js';
import { auditContextFrom } from '../utils/auditContext.js';
import { studentService } from '../services/studentService.js';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilters,
} from '../services/studentService.js';
import type { CredentialDeliveryMethod } from '../services/credentialService.js';
import type { Pagination } from '../types/common.js';

/**
 * Student resource controller.
 *
 * Handles HTTP request/response only; all business logic lives in
 * {@link studentService}. Admin account handlers build an {@link AuditContext}
 * from the authenticated request via {@link auditContextFrom} and delegate to
 * the service, shaping responses per `StudentResponse` / `CreateAccountResult`
 * / `ResetResult`.
 */
export const studentController = {
  /**
   * GET /api/v1/students
   * List Student_Accounts with pagination, search, and filters.
   * Delegates to {@link StudentService.list}; the password is excluded from
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

      const filters: StudentFilters = {
        grade: req.query.grade as string | undefined,
        department: req.query.department as string | undefined,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
        search: req.query.search as string | undefined,
      };

      const result = await studentService.list(filters, pagination);

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
   * GET /api/v1/students/:id
   * Get a single student by ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // const student = await studentService.findById(id, req.user.id, req.user.role);
    const student = null as unknown;

    if (!student) {
      throw AppError.notFound(`Student with id '${id}' not found`);
    }

    res.json(success(student));
  },

  /**
   * POST /api/v1/students
   * Create a Student_Account with credentials.
   * Responds 201 with the `CreateAccountResult` (the account plus, for the
   * `temporary_password` method, the one-time plaintext, or `setupLinkSent`
   * for the `setup_link` method).
   *
   * @see Requirements 4.1, 11.1
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const body = req.body;

      const input: CreateStudentInput = {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        studentId: body.studentId,
        grade: body.grade,
        credentialDeliveryMethod: body.credentialDeliveryMethod,
        password: body.password,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        parentName: body.parentName,
        parentEmail: body.parentEmail,
        parentPhone: body.parentPhone,
        address: body.address,
      };

      const result = await studentService.createWithCredentials(input, ctx);

      res.status(201).json(success(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/students/:id
   * Update an existing Student_Account profile. Responds 200 with the updated
   * `StudentResponse` (password excluded).
   *
   * @see Requirements 6.1, 11.1
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const id = String(req.params.id);
      const body = req.body;

      const patch: UpdateStudentInput = {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        grade: body.grade,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        parentName: body.parentName,
        parentEmail: body.parentEmail,
        parentPhone: body.parentPhone,
        address: body.address,
      };

      const updated = await studentService.updateAccount(id, patch, ctx);

      res.status(200).json(success(updated));
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/students/:id
   * Soft-delete (deactivate) a Student_Account. Responds 200.
   *
   * @see Requirements 7.1, 11.1
   */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const id = String(req.params.id);

      await studentService.deactivate(id, ctx);

      res.status(200).json(success({ id, active: false }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/students/:id/reactivate
   * Reactivate a previously deactivated Student_Account. Responds 200 with the
   * updated `StudentResponse`.
   *
   * @see Requirements 7.4, 11.1
   */
  async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const id = String(req.params.id);

      const result = await studentService.reactivate(id, ctx);

      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/students/:id/password-reset
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

      const result = await studentService.resetPassword(id, method, ctx, password);

      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  },
};
