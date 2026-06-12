import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from '../middleware/rbacMiddleware.js';
import { success } from '../utils/envelope.js';
import { auditContextFrom } from '../utils/auditContext.js';
import { feedbackService } from '../services/feedbackService.js';
import type {
  SubmitFeedbackInput,
  RequestFeedbackInput,
} from '../services/feedbackService.js';

/**
 * Feedback resource controller.
 *
 * HTTP-thin: every handler derives the actor identity (author / target /
 * responder) solely from `req.user` (attached by `authMiddleware`) and NEVER
 * from a client-supplied identifier (Requirements 6.4, 7.3, 8.3, 9.x). Write
 * handlers build an {@link AuditContext} via {@link auditContextFrom} and
 * forward it to {@link feedbackService}; every result is wrapped in the
 * canonical success envelope. RBAC (`requireRoles`) and Zod validation are
 * enforced at the route layer; errors are forwarded to the global error
 * handler via `next`.
 */
export const feedbackController = {
  /**
   * POST /api/feedback — submit feedback about a teacher or course.
   *
   * The author identity (`authorId`/role) is taken from `req.user`; only the
   * target and rating/comment come from the body. Returns 201 once the service
   * confirms persistence.
   *
   * @see Requirements 6.3, 12.2
   */
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const input = req.body as SubmitFeedbackInput;

      const data = await feedbackService.submit(userId, role, input, ctx);
      res.status(201).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/feedback/me — list the feedback authored by the authenticated
   * user, paginated. The author scope is read from `req.user` only.
   *
   * @see Requirements 7.3, 7.5, 12.2
   */
  async listOwn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role } = (req as AuthenticatedRequest).user;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await feedbackService.listOwn(userId, role, page, limit);

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
   * GET /api/feedback/received — list the feedback addressed to the
   * authenticated teacher with aggregate statistics. The target scope is read
   * from `req.user` only; the response carries
   * `meta: { page, limit, total, stats }`.
   *
   * @see Requirements 8.5, 12.2
   */
  async listReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await feedbackService.listReceived(userId, page, limit);

      // `stats` rides alongside the pagination metadata for `/received`; built
      // as a variable so it is carried through the success envelope without an
      // object-literal excess-property check against EnvelopeMeta.
      const meta = {
        page,
        limit,
        total: result.total,
        stats: result.stats,
      };

      res.status(200).json(success(result.data, meta));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/feedback/:feedbackId/replies — persist a faculty reply to a
   * feedback addressed to them. The responder is derived from `req.user`;
   * returns 201 once the service confirms persistence.
   *
   * @see Requirements 9.4, 9.5, 12.2
   */
  async reply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const { feedbackId } = req.params as { feedbackId: string };
      const { message } = req.body as { message: string };

      const data = await feedbackService.reply(userId, feedbackId, message, ctx);
      res.status(201).json(success(data));
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/feedback/requests — request feedback from the people eligible to
   * give it to the authenticated teacher. The sender is derived from
   * `req.user`; returns 201 with the count of recipients notified.
   *
   * @see Requirements 9.4, 9.5, 12.2
   */
  async requestFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const ctx = auditContextFrom(req as AuthenticatedRequest);
      const input = req.body as RequestFeedbackInput;

      const data = await feedbackService.requestFeedback(userId, input, ctx);
      res.status(201).json(success(data));
    } catch (error) {
      next(error);
    }
  },
};
