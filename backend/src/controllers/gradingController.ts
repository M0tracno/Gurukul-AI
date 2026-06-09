import type { Request, Response } from 'express';

import { gradingService } from '../services/gradingService.js';
import { success } from '../utils/envelope.js';
import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';

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

    res.status(201).json(success(result));
  },

  /**
   * GET /api/v1/grading/jobs/:jobId
   * Get the current progress of a grading job.
   */
  async getProgress(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params as { jobId: string };

    const progress = await gradingService.getJobProgress(jobId);

    res.json(success(progress));
  },

  /**
   * POST /api/v1/grading/jobs/:jobId/cancel
   * Cancel a grading job.
   */
  async cancelJob(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params as { jobId: string };

    await gradingService.cancelJob(jobId);

    res.json(success({ message: `Grading job '${jobId}' has been cancelled` }));
  },

  /**
   * GET /api/v1/grading/jobs/:jobId/status
   * Get the current status of a grading job following the state machine:
   * queued → processing → (completed | failed)
   * Returns a result reference when completed.
   * Requirements: 14.3, 14.4
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params as { jobId: string };

    const status = await gradingService.getJobStatus(jobId);

    res.json(success(status));
  },

  /**
   * PUT /api/v1/grading/submissions/:submissionId/answers/:questionId/override
   * Allow a Teacher to override AI-generated score/feedback for a specific
   * graded answer before the submission is finalized.
   * Requirement 13.4
   */
  async overrideGradedAnswer(req: Request, res: Response): Promise<void> {
    const { submissionId, questionId } = req.params as { submissionId: string; questionId: string };
    const { score, feedback } = req.body;
    const { userId: teacherId } = (req as AuthenticatedRequest).user;

    const result = await gradingService.overrideGradedAnswer({
      submissionId,
      questionId,
      teacherId,
      score,
      feedback,
    });

    res.json(success(result));
  },

  /**
   * POST /api/v1/grading/submissions/:submissionId/finalize
   * Finalize a submission after teacher review. Once finalized, no further
   * overrides are allowed.
   * Requirement 13.4
   */
  async finalizeSubmission(req: Request, res: Response): Promise<void> {
    const { submissionId } = req.params as { submissionId: string };
    const { userId: teacherId } = (req as AuthenticatedRequest).user;

    const result = await gradingService.finalizeSubmission(submissionId, teacherId);

    res.json(success(result));
  },
};
