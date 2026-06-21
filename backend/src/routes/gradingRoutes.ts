import { Router } from 'express';
import { z } from 'zod';

import { gradingController } from '../controllers/gradingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { teacherOrAdmin } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

// --- Validation Schemas ---

const submissionSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  fileUrl: z.string().url('File URL must be a valid URL'),
  fileSize: z.number().int().positive('File size must be a positive integer'),
  mimeType: z.string().min(1, 'MIME type is required'),
}).strict();

const submitBatchBodySchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
  submissions: z.array(submissionSchema).min(1, 'At least one submission is required'),
  concurrency: z.number().int().min(1).max(20).optional(),
}).strict();

const jobIdParamsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
}).strict();

const overrideParamsSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
}).strict();

const overrideBodySchema = z.object({
  score: z.number().min(0, 'Score must be at least 0'),
  feedback: z.string().min(1, 'Feedback is required'),
}).strict();

const finalizeParamsSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
}).strict();

// --- Routes ---

// POST /api/v1/grading/batch
router.post(
  '/batch',
  authMiddleware,
  teacherOrAdmin,
  validateRequest({ body: submitBatchBodySchema }),
  gradingController.submitBatch,
);

// GET /api/v1/grading/jobs/:jobId
router.get(
  '/jobs/:jobId',
  authMiddleware,
  teacherOrAdmin,
  validateRequest({ params: jobIdParamsSchema }),
  gradingController.getProgress,
);

// POST /api/v1/grading/jobs/:jobId/cancel
router.post(
  '/jobs/:jobId/cancel',
  authMiddleware,
  teacherOrAdmin,
  validateRequest({ params: jobIdParamsSchema }),
  gradingController.cancelJob,
);

// GET /api/v1/grading/jobs/:jobId/status
// Returns the job status per the state machine: queued → processing → (completed | failed)
// Includes result reference when completed (Requirement 14.3, 14.4)
router.get(
  '/jobs/:jobId/status',
  authMiddleware,
  teacherOrAdmin,
  validateRequest({ params: jobIdParamsSchema }),
  gradingController.getJobStatus,
);

// PUT /api/v1/grading/submissions/:submissionId/answers/:questionId/override
// Allow a Teacher to override AI score/feedback before finalization (Requirement 13.4)
router.put(
  '/submissions/:submissionId/answers/:questionId/override',
  authMiddleware,
  teacherOrAdmin,
  validateRequest({ params: overrideParamsSchema, body: overrideBodySchema }),
  gradingController.overrideGradedAnswer,
);

// POST /api/v1/grading/submissions/:submissionId/finalize
// Finalize a submission after teacher review (Requirement 13.4)
router.post(
  '/submissions/:submissionId/finalize',
  authMiddleware,
  teacherOrAdmin,
  validateRequest({ params: finalizeParamsSchema }),
  gradingController.finalizeSubmission,
);

export default router;
