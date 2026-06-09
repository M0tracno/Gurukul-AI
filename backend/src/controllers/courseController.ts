import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import { success } from '../utils/envelope.js';
import type { Pagination } from '../types/common.js';

/**
 * Course resource controller.
 * Handles HTTP request/response only; delegates business logic to the service layer.
 */
export const courseController = {
  /**
   * GET /api/v1/courses
   * List courses with pagination and optional filters.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const pagination: Pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const filters = {
      faculty: req.query.faculty as string | undefined,
      active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    // TODO: Replace with actual service call (Task 5.6)
    // const result = await courseService.findAll(filters, pagination);
    const result = { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } };

    res.json(success(result.data, {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
    }));
  },

  /**
   * GET /api/v1/courses/:id
   * Get a single course by ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // const course = await courseService.findById(id);
    const course = null as unknown;

    if (!course) {
      throw AppError.notFound(`Course with id '${id}' not found`);
    }

    res.json(success(course));
  },

  /**
   * POST /api/v1/courses
   * Create a new course.
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const course = await courseService.create(data);
    const course = data as unknown;

    res.status(201).json(success(course));
  },

  /**
   * PUT /api/v1/courses/:id
   * Update an existing course.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const course = await courseService.update(id, data);
    const course = null as unknown;

    if (!course) {
      throw AppError.notFound(`Course with id '${id}' not found`);
    }

    res.json(success(course));
  },

  /**
   * DELETE /api/v1/courses/:id
   * Soft-delete a course.
   */
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // await courseService.softDelete(id);
    void id;

    res.status(204).send();
  },
};
