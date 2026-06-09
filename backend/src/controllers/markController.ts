import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import { success } from '../utils/envelope.js';
import type { Pagination } from '../types/common.js';

/**
 * Mark resource controller.
 * Handles HTTP request/response only; delegates business logic to the service layer.
 */
export const markController = {
  /**
   * GET /api/v1/marks
   * List marks with pagination and optional filters.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const pagination: Pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const filters = {
      enrollment: req.query.enrollment as string | undefined,
      type: req.query.type as string | undefined,
    };

    // TODO: Replace with actual service call (Task 5.6)
    // const result = await markService.findAll(filters, pagination);
    const result = { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } };

    res.json(success(result.data, {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
    }));
  },

  /**
   * GET /api/v1/marks/:id
   * Get a single mark by ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // const mark = await markService.findById(id);
    const mark = null as unknown;

    if (!mark) {
      throw AppError.notFound(`Mark with id '${id}' not found`);
    }

    res.json(success(mark));
  },

  /**
   * POST /api/v1/marks
   * Create a new mark entry.
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const mark = await markService.create(data);
    const mark = data as unknown;

    res.status(201).json(success(mark));
  },

  /**
   * PUT /api/v1/marks/:id
   * Update an existing mark.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const mark = await markService.update(id, data);
    const mark = null as unknown;

    if (!mark) {
      throw AppError.notFound(`Mark with id '${id}' not found`);
    }

    res.json(success(mark));
  },

  /**
   * DELETE /api/v1/marks/:id
   * Delete a mark entry.
   */
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // await markService.delete(id);
    void id;

    res.status(204).send();
  },
};
