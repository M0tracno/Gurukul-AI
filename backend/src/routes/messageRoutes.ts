import { Router } from 'express';
import { z } from 'zod';

import { messageController } from '../controllers/messageController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/rbacMiddleware.js';
import { writeRateLimit } from '../middleware/rateLimiter.js';

const router = Router();

// --- Validation Schemas ---

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict();

const conversationIdParamsSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
}).strict();

const messageIdParamsSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
}).strict();

/**
 * Send-message body schema (Requirements 3.2, 12.1).
 *
 * `subject` and `content` are non-empty and bounded (≤200 / ≤2000 chars);
 * `recipientId`/`studentId` are required non-empty identifiers; `recipientModel`
 * is constrained to the two participant models the messaging domain recognises.
 * The sender is NEVER taken from the body — it is derived from `req.user` in the
 * controller (Req 12.5) — so no sender fields are accepted here. Optional
 * `messageType`/`priority` mirror the `Message` model enums.
 */
export const sendMessageBodySchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject must be at most 200 characters'),
  content: z.string().trim().min(1, 'Content is required').max(2000, 'Content must be at most 2000 characters'),
  recipientId: z.string().min(1, 'Recipient ID is required'),
  recipientModel: z.enum(['Parent', 'Faculty']),
  studentId: z.string().min(1, 'Student ID is required'),
  messageType: z.enum(['general', 'academic', 'behavioral', 'attendance', 'urgent']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
}).strict();

// --- Routes ---

// GET /api/messages/conversations — list the authenticated user's conversations
// (Requirements 1.4, 1.5, 1.6, 12.1).
router.get(
  '/conversations',
  authMiddleware,
  requireRoles('teacher', 'parent'),
  validateRequest({ query: paginationQuerySchema }),
  messageController.getConversations,
);

// GET /api/messages/conversations/:conversationId — fetch a conversation thread
// (Requirements 2.4, 2.5, 12.1).
router.get(
  '/conversations/:conversationId',
  authMiddleware,
  requireRoles('teacher', 'parent'),
  validateRequest({ params: conversationIdParamsSchema, query: paginationQuerySchema }),
  messageController.getThread,
);

// POST /api/messages — send a message. Write-rate-limited ahead of auth so the
// limiter is the earliest gate (order: Rate_Limiter → auth → rbac → validate →
// controller) (Requirements 3.2, 3.7, 3.8, 3.9, 12.1, 12.8).
router.post(
  '/',
  writeRateLimit,
  authMiddleware,
  requireRoles('teacher', 'parent'),
  validateRequest({ body: sendMessageBodySchema }),
  messageController.send,
);

// PATCH /api/messages/:messageId/read — mark a message as read
// (Requirements 4.5, 4.7, 12.1).
router.patch(
  '/:messageId/read',
  authMiddleware,
  requireRoles('teacher', 'parent'),
  validateRequest({ params: messageIdParamsSchema }),
  messageController.markRead,
);

// DELETE /api/messages/:messageId — soft-delete a message. Write-rate-limited
// ahead of auth so the chain is Rate_Limiter → auth → rbac → (existence/ownership
// in the service); when several failures coincide the earliest gate wins
// (Requirements 5.7, 5.8, 5.9, 12.1, 12.8).
router.delete(
  '/:messageId',
  writeRateLimit,
  authMiddleware,
  requireRoles('teacher', 'parent'),
  validateRequest({ params: messageIdParamsSchema }),
  messageController.remove,
);

export default router;
