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

export default router;
