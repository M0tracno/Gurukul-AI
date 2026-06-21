import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler.js';
import { success } from '../utils/envelope.js';
import type { Pagination } from '../types/common.js';

/**
 * Attendance resource controller.
 * Handles HTTP request/response only; delegates business logic to the service layer.
 */
export const attendanceController = {
  /**
   * GET /api/v1/attendance
   * List attendance records with pagination and optional filters.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const pagination: Pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || 'date',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const filters = {
      enrollment: req.query.enrollment as string | undefined,
      date: req.query.date as string | undefined,
      status: req.query.status as string | undefined,
    };

    // TODO: Replace with actual service call (Task 5.6)
    // const result = await attendanceService.findAll(filters, pagination);
    const result = { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } };

    res.json(success(result.data, {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
    }));
  },

  /**
   * GET /api/v1/attendance/:id
   * Get a single attendance record by ID.
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // const attendance = await attendanceService.findById(id);
    const attendance = null as unknown;

    if (!attendance) {
      throw AppError.notFound(`Attendance record with id '${id}' not found`);
    }

    res.json(success(attendance));
  },

  /**
   * POST /api/v1/attendance
   * Create a new attendance record.
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const attendance = await attendanceService.create(data);
    const attendance = data as unknown;

    res.status(201).json(success(attendance));
  },

  /**
   * PUT /api/v1/attendance/:id
   * Update an existing attendance record.
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    // TODO: Replace with actual service call (Task 5.6)
    // const attendance = await attendanceService.update(id, data);
    const attendance = null as unknown;

    if (!attendance) {
      throw AppError.notFound(`Attendance record with id '${id}' not found`);
    }

    res.json(success(attendance));
  },

  /**
   * DELETE /api/v1/attendance/:id
   * Delete an attendance record.
   */
  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    // TODO: Replace with actual service call (Task 5.6)
    // await attendanceService.delete(id);
    void id;

    res.status(204).send();
  },
};
