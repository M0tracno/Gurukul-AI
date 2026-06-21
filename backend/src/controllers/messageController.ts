import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { messageService } from '../services/messageService.js';
import type { SendMessageInput } from '../services/messageService.js';
import { auditContextFrom } from '../utils/auditContext.js';
import { success } from '../utils/envelope.js';

/**
 * Messaging resource controller (Requirements 1.4, 2.4, 3.5, 4.5, 5.6, 12.2,
 * 12.5).
 *
 * HTTP-thin: every handler derives the participant identity from `req.user`
 * (attached by `authMiddleware`) and NEVER from a client-supplied identifier
 * (Req 12.5), delegates to {@link messageService}, and wraps the result in the
 * canonical success Envelope. Write handlers (`send`, `remove`) build an
 * {@link AuditContext} via {@link auditContextFrom} and pass it to the service
 * so audit entries are recorded HTTP-agnostically. RBAC
 * (`requireRoles('teacher','parent')`), per-endpoint rate limiting, and Zod
 * validation are enforced at the route layer; errors are forwarded to the
 * global error handler via `next(error)`.
 */
export const messageController = {
  /**
   * GET /api/messages/conversations — list the Conversations the authenticated
   * user participates in, paginated. Returns `page`/`limit`/`total` in the
   * Envelope `meta` field (Requirements 1.4, 12.2).
   */
  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await messageService.listConversations(userId, role, page, limit);

      res.status(200).json(
        success(result.data, {
          page,
          limit,
          total: result.total,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/messages/conversations/:conversationId — fetch a Conversation
   * thread, paginated. Returns `page`/`limit`/`total` plus `conversationExists`
   * in the Envelope `meta` field so a conversation that exists but has no
   * viewable messages is distinct from a non-existent one (Requirements 2.4,
   * 2.7, 12.2).
   */
  async getThread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const { conversationId } = req.params as { conversationId: string };
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await messageService.getThread(userId, role, conversationId, page, limit);

      res.status(200).json(
        success(result.data, {
          page,
          limit,
          total: result.total,
          conversationExists: result.conversationExists,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/messages — send a new message. The sender is derived from
   * `req.user`; on a confirmed write the service records an audit entry from
   * the {@link AuditContext}. Returns HTTP 201 with the created message
   * (Requirements 3.5, 12.2).
   */
  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const input = req.body as SendMessageInput;

      const data = await messageService.send(userId, role, input, ctx);

      res.status(201).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/messages/:messageId/read — mark a message as read. Recipient
   * scope is verified by the service from `req.user`. Returns HTTP 200 with the
   * updated message (Requirements 4.5, 12.2).
   */
  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const { messageId } = req.params as { messageId: string };

      const data = await messageService.markRead(userId, role, messageId);

      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/messages/:messageId — soft-delete a message the authenticated
   * user sent or received. The service records an audit entry from the
   * {@link AuditContext} on a confirmed write. Returns HTTP 200 (Requirements
   * 5.6, 12.2).
   */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const { messageId } = req.params as { messageId: string };
      const ctx = auditContextFrom(req as AuthenticatedRequest);

      await messageService.softDelete(userId, role, messageId, ctx);

      res.status(200).json(success({ messageId, isDeleted: true }));
    } catch (error) {
      next(error);
    }
  },
};
