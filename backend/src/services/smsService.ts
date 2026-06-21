/**
 * Pluggable outbound SMS delivery service.
 *
 * The verified parent OTP login flow (Req 4) delivers a one-time passcode to a
 * Linkage_Phone. The delivery channel is intentionally abstracted behind a
 * small `ISmsTransport` interface so the concrete provider can be swapped via
 * the `SMS_PROVIDER` environment variable without any caller changes
 * (resolved Open Question 1).
 *
 * Two transports ship:
 *
 *  - {@link ConsoleSmsTransport} — the default outside production. It logs a
 *    single redacted line (masked destination only) and NEVER logs the message
 *    body, because the body carries the OTP code (Req 8.4). Useful for local
 *    development and tests.
 *  - {@link TwilioSmsTransport} — an environment-configured adapter selected
 *    when `SMS_PROVIDER=twilio`. The `twilio` SDK is loaded lazily so the
 *    package is only required when the transport is actually used; a clear
 *    error is thrown when the SDK or credentials are missing.
 *
 * {@link selectSmsTransport} reads `SMS_PROVIDER` and defaults to the console
 * transport outside production.
 *
 * Secret hygiene (Req 8.4): no transport in this module ever logs the message
 * body or the full destination phone number at any level.
 *
 * @see Requirements 4.2, 4.5, 8.4
 */

import { logger } from '../utils/logger.js';

/**
 * Outbound SMS transport abstraction.
 *
 * Implementations resolve on a successful hand-off to the delivery channel and
 * reject when the channel is unavailable or rejects the message. Callers
 * (notably `otpService`) catch rejections, record the failure server-side, and
 * never surface delivery details to the end caller (Req 4.5).
 */
export interface ISmsTransport {
  /**
   * Deliver `body` to `toPhone`.
   *
   * @param toPhone - Destination phone number (canonical/E.164-style).
   * @param body - The message body. MUST be treated as sensitive: it carries
   *   the OTP code and must never be logged.
   */
  send(toPhone: string, body: string): Promise<void>;
}

/** Identifiers accepted by the `SMS_PROVIDER` environment variable. */
export type SmsProvider = 'console' | 'twilio';

/**
 * Mask a phone number for safe logging: keep only the last two digits, replace
 * everything else with a bullet. Never reveals the full destination (Req 8.4).
 */
function maskPhone(toPhone: string): string {
  const digits = String(toPhone ?? '').replace(/\D/g, '');
  if (digits.length <= 2) {
    return '••';
  }
  return `••••${digits.slice(-2)}`;
}

/**
 * Development/test transport.
 *
 * Logs a single redacted line confirming a send was requested. It logs only a
 * masked destination and the body length — never the body itself (which holds
 * the OTP) and never the full phone number (Req 8.4).
 */
export class ConsoleSmsTransport implements ISmsTransport {
  async send(toPhone: string, body: string): Promise<void> {
    // IMPORTANT: never log `body` (contains the OTP) or the full phone number.
    logger.info('SMS dispatch (console transport)', {
      to: maskPhone(toPhone),
      bodyLength: typeof body === 'string' ? body.length : 0,
    });
  }
}

/** Minimal shape of the Twilio client surface this adapter depends on. */
interface TwilioMessagesApi {
  create(options: {
    to: string;
    body: string;
    from?: string;
    messagingServiceSid?: string;
  }): Promise<unknown>;
}

interface TwilioClient {
  messages: TwilioMessagesApi;
}

type TwilioFactory = (accountSid: string, authToken: string) => TwilioClient;

/**
 * Production transport backed by Twilio.
 *
 * Configuration is read from the environment:
 *  - `TWILIO_ACCOUNT_SID` (required)
 *  - `TWILIO_AUTH_TOKEN` (required)
 *  - `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` (one required)
 *
 * The `twilio` SDK is imported lazily so the dependency is only needed when
 * this transport is actually exercised. A missing SDK or missing credentials
 * produces a clear, actionable error rather than a silent failure.
 */
export class TwilioSmsTransport implements ISmsTransport {
  async send(toPhone: string, body: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken) {
      throw new Error(
        'TWILIO_NOT_CONFIGURED: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set to use the Twilio SMS transport',
      );
    }

    if (!fromNumber && !messagingServiceSid) {
      throw new Error(
        'TWILIO_NOT_CONFIGURED: one of TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID must be set to use the Twilio SMS transport',
      );
    }

    const createClient = await this.resolveTwilioFactory();
    const client = createClient(accountSid, authToken);

    // Note: `body` carries the OTP and MUST NOT be logged here or anywhere.
    await client.messages.create({
      to: toPhone,
      body,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: fromNumber }),
    });

    // Log only a redacted confirmation (masked destination, no body/no full phone).
    logger.info('SMS dispatch (twilio transport)', { to: maskPhone(toPhone) });
  }

  /**
   * Lazily resolve the Twilio SDK factory. Throws a clear error when the
   * package is not installed so the misconfiguration is obvious.
   */
  private async resolveTwilioFactory(): Promise<TwilioFactory> {
    try {
      // Indirect specifier so the optional `twilio` dependency is not resolved
      // at compile time; it is only required when this transport is used.
      const moduleName = 'twilio';
      const mod = (await import(/* @vite-ignore */ moduleName)) as Record<string, unknown>;
      const factory = (mod.default ?? mod) as unknown;
      if (typeof factory !== 'function') {
        throw new Error('not-a-factory');
      }
      return factory as TwilioFactory;
    } catch {
      throw new Error(
        'TWILIO_SDK_UNAVAILABLE: the "twilio" package is not installed; run `npm install twilio` to use the Twilio SMS transport',
      );
    }
  }
}

/**
 * Select the SMS transport from the `SMS_PROVIDER` environment variable.
 *
 * Resolution rules:
 *  - `SMS_PROVIDER=twilio` → {@link TwilioSmsTransport}
 *  - `SMS_PROVIDER=console` → {@link ConsoleSmsTransport}
 *  - unset and not production → {@link ConsoleSmsTransport} (default)
 *  - unset and production → throws, requiring an explicit provider so the
 *    console transport is never used by accident in production
 *
 * @returns The selected transport instance.
 */
export function selectSmsTransport(): ISmsTransport {
  const provider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();

  if (provider === 'twilio') {
    return new TwilioSmsTransport();
  }

  if (provider === 'console') {
    return new ConsoleSmsTransport();
  }

  // No explicit provider configured.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SMS_PROVIDER_REQUIRED: SMS_PROVIDER must be set explicitly in production (e.g. "twilio")',
    );
  }

  // Default outside production.
  return new ConsoleSmsTransport();
}

/**
 * Conveniently shared transport instance, selected once from the environment.
 * Matches the singleton-export convention used by sibling services.
 */
export const smsService: ISmsTransport = selectSmsTransport();
