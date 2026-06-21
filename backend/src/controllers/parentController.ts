import type { Request, Response, NextFunction } from 'express';

import { success } from '../utils/envelope.js';
import { parentService } from '../services/parentService.js';
import type { ParentFilters } from '../services/parentService.js';
import type { Pagination } from '../types/common.js';

/**
 * Admin parents resource controller.
 *
 * Handles HTTP request/response only; all business logic lives in
 * {@link parentService}. The list handler reads pagination and filters from the
 * query string, delegates to the service, and wraps the result in a success
 * Envelope with `page`/`limit`/`total` in `meta`.
 */
export const parentController = {
  /**
   * GET /api/parents
   * List Parent records with pagination, search, and filters for the admin
   * user-management surface. Delegates to {@link ParentService.list}; the
   * password is excluded from every entry and the effective page size is
   * bounded to a maximum of 100.
   *
   * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 12.2
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination: Pagination = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        sortBy: (req.query.sortBy as string) || 'createdAt',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const filters: ParentFilters = {
        search: req.query.search as string | undefined,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
      };

      const result = await parentService.list(filters, pagination);

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
};
