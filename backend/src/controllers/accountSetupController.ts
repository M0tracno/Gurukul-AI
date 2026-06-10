import type { Request, Response } from 'express';

import { success } from '../utils/envelope.js';
import { accountSetupService } from '../services/accountSetupService.js';

/**
 * Public account-setup controller (Requirement 8.6).
 *
 * Handles consumption of single-use setup-link tokens. This endpoint is
 * intentionally PUBLIC (no authentication): the bearer of a valid, unexpired,
 * unused setup token proves their right to set the account's initial password.
 *
 * Business logic lives in {@link accountSetupService}; this controller only
 * adapts the HTTP request/response. The service rejects with HTTP 400 when the
 * token is invalid, expired, or already used (leaving the password unchanged),
 * and that rejection propagates to the central error handler.
 */
export const accountSetupController = {
  /**
   * POST /api/account-setup/:token
   *
   * Consumes the setup token from the URL and sets the account password from
   * the request body. Responds 200 with the resolved account on success.
   */
  async consume(req: Request, res: Response): Promise<void> {
    // Express may type a route param as `string | string[]`; normalize to a
    // single string. The service treats a non-string/empty token as invalid.
    const rawToken = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;
    const { password } = req.body as { password?: string };

    // Delegate validation and mutation to the service. It enforces the
    // password policy and rejects invalid/expired/used tokens with HTTP 400.
    const result = await accountSetupService.consumeSetupToken(
      rawToken as string,
      password as string,
    );

    res.status(200).json(
      success({
        resource: result.resource,
        accountId: result.accountId,
      }),
    );
  },
};
