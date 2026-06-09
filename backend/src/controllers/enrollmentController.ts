import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import { success } from '../utils/envelope.js';
import type { Pagination } from '../types/common.js';

/**
 * Enrollment resource controller.
 * Handles HTTP request/response only; delegates business logic to the service layer.
 */
export const enrollmentController = {
  /**
   * GET /api/v1/enrollments
   * List enrollments with pagination and optional filters.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const pagination: Pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || 'enrollmentDate',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const filters = {
      student: req.query.student as string | undefined,
      course: req.query.course as string | undefined,
      status: req.query.status as string | undefined,
    };

    // TODO: Replace with actual service call (Task 5.6)
    // const result = await enrollmentService.findAll(filters, pagination);
    const result = { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } };

    res.json(success(result.data, {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
    }));
  },

  /**
   * GET /api/v1/enrollments/:id
   * Get a single enrollment by ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // const enrollment = await enrollmentService.findById(id);
    const enrollment = null as unknown;

    if (!enrollment) {
      throw AppError.notFound(`Enrollment with id '${id}' not found`);
    }

    res.json(success(enrollment));
  },

  /**
   * POST /api/v1/enrollments
   * Create a new enrollment.
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const enrollment = await enrollmentService.create(data);
    const enrollment = data as unknown;

    res.status(201).json(success(enrollment));
  },

  /**
   * PUT /api/v1/enrollments/:id
   * Update an existing enrollment (e.g., change status or grade).
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const enrollment = await enrollmentService.update(id, data);
    const enrollment = null as unknown;

    if (!enrollment) {
      throw AppError.notFound(`Enrollment with id '${id}' not found`);
    }

    res.json(success(enrollment));
  },

  /**
   * DELETE /api/v1/enrollments/:id
   * Delete an enrollment (withdraw).
   */
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // await enrollmentService.delete(id);
    void id;

    res.status(204).send();
  },
};
