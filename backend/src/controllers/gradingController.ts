import type { Request, Response } from 'express';

import { gradingService } from '../services/gradingService.js';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import type { ApiSuccessResponse } from '../types/api.js';

/**
 * Grading resource controller.
 * Handles HTTP request/response for AI grading batch operations.
 * Delegates all business logic to the GradingService.
 */
export const gradingController = {
  /**
   * POST /api/v1/grading/batch
   * Submit a batch of submissions for AI grading.
   */
  async submitBatch(req: Request, res: Response): Promise<void> {
    const { batchId, submissions, concurrency } = req.body;
    const { userId: teacherId } = (req as AuthenticatedRequest).user;

    const result = await gradingService.submitBatch({
      batchId,
      teacherId,
      submissions,
      concurrency,
    });

    const response: ApiSuccessResponse<{ jobId: string }> = { data: result };
    res.status(201).json(response);
  },

  /**
   * GET /api/v1/grading/jobs/:jobId
   * Get the current progress of a grading job.
   */
  async getProgress(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params as { jobId: string };

    const progress = await gradingService.getJobProgress(jobId);

    const response: ApiSuccessResponse<typeof progress> = { data: progress };
    res.json(response);
  },

  /**
   * POST /api/v1/grading/jobs/:jobId/cancel
   * Cancel a grading job.
   */
  async cancelJob(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params as { jobId: string };

    await gradingService.cancelJob(jobId);

    const response: ApiSuccessResponse<{ message: string }> = {
      data: { message: `Grading job '${jobId}' has been cancelled` },
    };
    res.json(response);
  },
};
