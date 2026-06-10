import { logger } from '../utils/logger.js';

/**
 * Typed abstraction over the legacy CJS mail transport.
 *
 * The existing `passwordService` reaches into a legacy `emailService.js`
 * (CJS module) via dynamic import to obtain a Nodemailer-style
 * `transporter.sendMail` function. That ad-hoc access swallows failures,
 * which makes the "email unavailable" condition impossible to detect.
 *
 * This wrapper exposes a small, typed surface so callers can:
 *   - detect transport availability (`isAvailable`), and
 *   - send a setup link and observe a rejection when the transport is
 *     unavailable (`sendSetupLink`).
 *
 * The account-creation / password-reset services translate a
 * `sendSetupLink` rejection into `AppError(502, 'EMAIL_UNAVAILABLE', …)`
 * so the `setup_link` 502 path (Requirement 8.4) is reachable and the
 * account is never left with a usable credential.
 *
 * Secret hygiene (Requirement 8.5): the raw setup token is embedded in
 * `setupUrl`. This module never logs `setupUrl` or any token value.
 */
export interface IEmailService {
  /**
   * Send a single-use account-setup link to the account holder.
   * Resolves on a successful send; rejects when the mail transport is
   * unavailable or the send fails.
   */
  sendSetupLink(to: string, setupUrl: string, displayName: string): Promise<void>;

  /**
   * Report whether the underlying mail transport is currently usable.
   * Never throws; returns `false` when the transport cannot be resolved.
   */
  isAvailable(): Promise<boolean>;
}

/** Minimal shape of the legacy transport we depend on. */
interface LegacyTransporter {
  sendMail: (options: Record<string, unknown>) => Promise<unknown>;
}

interface LegacyEmailModule {
  transporter?: LegacyTransporter;
}

/**
 * Resolve the legacy mail transport (CJS module) via dynamic import.
 *
 * Mirrors the resolution convention used by `passwordService`. Returns
 * `null` when the module cannot be loaded or does not expose a usable
 * `transporter.sendMail` function. Never throws.
 */
async function resolveTransporter(): Promise<LegacyTransporter | null> {
  try {
    // Legacy email service is a CJS module resolved relative to backend root.
    const emailServicePath = '../../services/emailService.js';
    const emailModule = (await import(
      /* @vite-ignore */ emailServicePath
    )) as Record<string, unknown>;

    const service = (emailModule.default || emailModule) as LegacyEmailModule;

    if (service && typeof service.transporter?.sendMail === 'function') {
      return service.transporter;
    }

    return null;
  } catch {
    // Transport module is optional/best-effort to load; treat as unavailable.
    return null;
  }
}

export class EmailService implements IEmailService {
  async isAvailable(): Promise<boolean> {
    const transporter = await resolveTransporter();
    return transporter !== null;
  }

  async sendSetupLink(
    to: string,
    setupUrl: string,
    displayName: string,
  ): Promise<void> {
    const transporter = await resolveTransporter();

    if (!transporter) {
      // Surface the unavailable transport so the service layer can map it
      // to a 502 and avoid leaving the account with a usable credential.
      logger.warn('Email transport unavailable for setup link', { to });
      throw new Error('EMAIL_TRANSPORT_UNAVAILABLE');
    }

    const name = displayName?.trim() || 'there';

    // Note: `setupUrl` carries the raw single-use token and MUST NOT be
    // logged anywhere (Requirement 8.5). It is only placed in the email body.
    await transporter.sendMail({
      from: {
        name: 'GDC Academic System',
        address: process.env.EMAIL_FROM || 'noreply@gdc-system.com',
      },
      to,
      subject: 'Set up your GDC Academic System account',
      html: `
          <h2>Welcome to GDC Academic System</h2>
          <p>Hello ${name},</p>
          <p>An account has been created for you. Use the secure link below to set your password. This link is single-use and expires within 24 hours.</p>
          <p><a href="${setupUrl}">Set up your account</a></p>
          <p>If you did not expect this email, please contact your administrator.</p>
          <p>— GDC Academic System</p>
        `,
      text: `Hello ${name},\n\nAn account has been created for you. Use the secure link below to set your password. This link is single-use and expires within 24 hours.\n\n${setupUrl}\n\nIf you did not expect this email, please contact your administrator.\n\n— GDC Academic System`,
    });

    logger.info('Setup link email sent', { to });
  }
}

// Export a singleton instance for convenience (matches sibling services).
export const emailService = new EmailService();
