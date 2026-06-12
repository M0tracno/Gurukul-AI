import { Router } from 'express';
import { z } from 'zod';

import { feedbackController } from '../controllers/feedbackController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import { writeRateLimit } from '../middleware/rateLimiter.js';
import { RATING_MIN, RATING_MAX, COMMENT_MAX_LENGTH } from '../config/index.js';

const router = Router();

// --- Validation Schemas ---

/**
 * Submit-feedback body (Requirement 6.2). The Feedback_Author identity is
 * derived from `req.user` at the controller/service layer and is NEVER read
 * from the body, so only the target and rating/comment are accepted here.
 *
 * - `targetType` must be `teacher` or `course`.
 * - `targetId` is a required, non-empty identifier.
 * - `rating` is an integer within `[RATING_MIN, RATING_MAX]`.
 * - `comment` is bounded to `COMMENT_MAX_LENGTH` characters.
 */
export const submitFeedbackBodySchema = z
  .object({
    targetType: z.enum(['teacher', 'course']),
    targetId: z.string().min(1, 'A feedback target identifier is required'),
    rating: z
      .number()
      .int('Rating must be a whole number')
      .min(RATING_MIN, `Rating must be at least ${RATING_MIN}`)
      .max(RATING_MAX, `Rating must be at most ${RATING_MAX}`),
    comment: z
      .string()
      .max(
        COMMENT_MAX_LENGTH,
        `Comment must be at most ${COMMENT_MAX_LENGTH} characters`,
      ),
  })
  .strict();

/**
 * Reply body (Requirement 9.x). Only the faculty reply text is accepted; the
 * responder identity is derived from `req.user`.
 */
const replyBodySchema = z
  .object({
    message: z
      .string()
      .min(1, 'A reply message is required')
      .max(
        COMMENT_MAX_LENGTH,
        `Reply must be at most ${COMMENT_MAX_LENGTH} characters`,
      ),
  })
  .strict();

/**
 * Request-feedback body (Requirement 9.x). All fields are optional; the
 * teacher (sender) is derived from `req.user`. An optional `courseId` scopes
 * the request to a single course owned by the teacher.
 */
const requestFeedbackBodySchema = z
  .object({
    subject: z.string().max(200).optional(),
    message: z.string().max(COMMENT_MAX_LENGTH).optional(),
    courseId: z.string().min(1).optional(),
  })
  .strict();

const feedbackIdParamsSchema = z
  .object({
    feedbackId: z.string().min(1, 'Feedback ID is required'),
  })
  .strict();

// --- Routes ---

// POST /api/feedback — submit feedback (student/parent). Write-rate-limited:
// the limiter precedes auth so the order is
// `Rate_Limiter → auth → rbac → validate → controller` (Requirements 6.5, 12.8).
router.post(
  '/',
  writeRateLimit,
  authMiddleware,
  requireRoles('student', 'parent'),
  validateRequest({ body: submitFeedbackBodySchema }),
  feedbackController.submit,
);

// GET /api/feedback/me — list the authenticated author's own feedback
// (student/parent). Not rate-limited (read-only).
router.get(
  '/me',
  authMiddleware,
  requireRoles('student', 'parent'),
  feedbackController.listOwn,
);

// GET /api/feedback/received — list feedback addressed to the authenticated
// teacher with aggregate stats. Not rate-limited (read-only).
router.get(
  '/received',
  authMiddleware,
  requireRoles('teacher'),
  feedbackController.listReceived,
);

// POST /api/feedback/:feedbackId/replies — faculty reply to a feedback
// addressed to them (teacher). Write-rate-limited (Requirements 9.6, 12.8).
router.post(
  '/:feedbackId/replies',
  writeRateLimit,
  authMiddleware,
  requireRoles('teacher'),
  validateRequest({ params: feedbackIdParamsSchema, body: replyBodySchema }),
  feedbackController.reply,
);

// POST /api/feedback/requests — request feedback from eligible recipients
// (teacher). Write-rate-limited (Requirements 9.6, 12.8).
router.post(
  '/requests',
  writeRateLimit,
  authMiddleware,
  requireRoles('teacher'),
  validateRequest({ body: requestFeedbackBodySchema }),
  feedbackController.requestFeedback,
);

export default router;
