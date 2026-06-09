import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import { success } from '../utils/envelope.js';
import type { Pagination } from '../types/common.js';

/**
 * Faculty resource controller.
 * Handles HTTP request/response only; delegates business logic to the service layer.
 */
export const facultyController = {
  /**
   * GET /api/v1/faculty
   * List faculty members with pagination and optional filters.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const pagination: Pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const filters = {
      department: req.query.department as string | undefined,
      active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    // TODO: Replace with actual service call (Task 5.6)
    // const result = await facultyService.findAll(filters, pagination);
    const result = { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } };

    res.json(success(result.data, {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
    }));
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
   * Create a new faculty member.
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const faculty = await facultyService.create(data);
    const faculty = data as unknown;

    res.status(201).json(success(faculty));
  },

  /**
   * PUT /api/v1/faculty/:id
   * Update an existing faculty member.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const faculty = await facultyService.update(id, data);
    const faculty = null as unknown;

    if (!faculty) {
      throw AppError.notFound(`Faculty member with id '${id}' not found`);
    }

    res.json(success(faculty));
  },

  /**
   * DELETE /api/v1/faculty/:id
   * Soft-delete a faculty member.
   */
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // await facultyService.softDelete(id);
    void id;

    res.status(204).send();
  },
};
