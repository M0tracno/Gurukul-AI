import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import { success } from '../utils/envelope.js';
import type { Pagination } from '../types/common.js';

/**
 * Student resource controller.
 * Handles HTTP request/response only; delegates business logic to the service layer.
 */
export const studentController = {
  /**
   * GET /api/v1/students
   * List students with pagination and optional filters.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const pagination: Pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const filters = {
      grade: req.query.grade as string | undefined,
      active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    // TODO: Replace with actual service call (Task 5.6)
    // const result = await studentService.findAll(filters, pagination);
    const result = { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } };

    res.json(success(result.data, {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
    }));
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
   * Create a new student.
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const student = await studentService.create(data);
    const student = data as unknown;

    res.status(201).json(success(student));
  },

  /**
   * PUT /api/v1/students/:id
   * Update an existing student.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const student = await studentService.update(id, data);
    const student = null as unknown;

    if (!student) {
      throw AppError.notFound(`Student with id '${id}' not found`);
    }

    res.json(success(student));
  },

  /**
   * DELETE /api/v1/students/:id
   * Soft-delete a student.
   */
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // await studentService.softDelete(id);
    void id;

    res.status(204).send();
  },
};
