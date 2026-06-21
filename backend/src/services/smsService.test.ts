/**
 * Unit tests for the pluggable SMS service — transport selection and redaction.
 *
 * Verifies that:
 *   - `selectSmsTransport()` returns the console transport by default outside
 *     production, the Twilio transport when `SMS_PROVIDER=twilio`, the console
 *     transport when `SMS_PROVIDER=console`, and throws when no provider is
 *     configured in production (Req 4.5).
 *   - `ConsoleSmsTransport.send(...)` logs only a redacted line and NEVER passes
 *     the message body (which carries the OTP) or the full destination phone to
 *     the logger (Req 8.4).
 *
 * **Validates: Requirements 4.5, 8.4**
 */

import { jest } from '@jest/globals';

// Mock logger to avoid import.meta.url issues in ts-jest and to spy on calls.
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: mockLoggerDebug,
  },
}));

const { selectSmsTransport, ConsoleSmsTransport, TwilioSmsTransport } =
  await import('./smsService.js');

describe('smsService — transport selection and redaction', () => {
  // Save/restore process.env between tests so env mutations don't leak.
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Fresh, isolated copy of the environment for each test.
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('selectSmsTransport', () => {
    it('returns the console transport by default outside production', () => {
      delete process.env.SMS_PROVIDER;
      process.env.NODE_ENV = 'test';

      const transport = selectSmsTransport();

      expect(transport).toBeInstanceOf(ConsoleSmsTransport);
    });

    it('returns the console transport by default when NODE_ENV is development', () => {
      delete process.env.SMS_PROVIDER;
      process.env.NODE_ENV = 'development';

      const transport = selectSmsTransport();

      expect(transport).toBeInstanceOf(ConsoleSmsTransport);
    });

    it('returns the Twilio transport when SMS_PROVIDER=twilio', () => {
      process.env.SMS_PROVIDER = 'twilio';

      const transport = selectSmsTransport();

      expect(transport).toBeInstanceOf(TwilioSmsTransport);
    });

    it('is case- and whitespace-insensitive for the provider value', () => {
      process.env.SMS_PROVIDER = '  TWILIO  ';

      const transport = selectSmsTransport();

      expect(transport).toBeInstanceOf(TwilioSmsTransport);
    });

    it('returns the console transport when SMS_PROVIDER=console', () => {
      process.env.SMS_PROVIDER = 'console';
      // Even in production an explicit console provider is honored.
      process.env.NODE_ENV = 'production';

      const transport = selectSmsTransport();

      expect(transport).toBeInstanceOf(ConsoleSmsTransport);
    });

    it('throws when no provider is configured in production', () => {
      delete process.env.SMS_PROVIDER;
      process.env.NODE_ENV = 'production';

      expect(() => selectSmsTransport()).toThrow(/SMS_PROVIDER_REQUIRED/);
    });
  });

  describe('ConsoleSmsTransport redaction', () => {
    const OTP_BODY = 'Your verification code is 482913';
    const PHONE = '+14155550123';

    it('logs a redacted line and never the OTP body', async () => {
      const transport = new ConsoleSmsTransport();

      await transport.send(PHONE, OTP_BODY);

      expect(mockLoggerInfo).toHaveBeenCalledTimes(1);

      // Inspect every argument passed to the logger and assert that neither the
      // OTP body nor the OTP digits ever appear anywhere in the logged payload.
      const loggedSerialized = mockLoggerInfo.mock.calls
        .map((call) => JSON.stringify(call))
        .join(' ');

      expect(loggedSerialized).not.toContain(OTP_BODY);
      expect(loggedSerialized).not.toContain('482913');
    });

    it('never logs the full destination phone number', async () => {
      const transport = new ConsoleSmsTransport();

      await transport.send(PHONE, OTP_BODY);

      const loggedSerialized = mockLoggerInfo.mock.calls
        .map((call) => JSON.stringify(call))
        .join(' ');

      // Full number must not appear; only a masked form ending in the last two
      // digits is permitted.
      expect(loggedSerialized).not.toContain(PHONE);
      expect(loggedSerialized).not.toContain('4155550123');

      // The redacted metadata exposes only a masked destination and body length.
      const meta = mockLoggerInfo.mock.calls[0]?.[1] as
        | { to?: string; bodyLength?: number }
        | undefined;
      expect(meta?.to).toBe('••••23');
      expect(meta?.bodyLength).toBe(OTP_BODY.length);
    });

    it('resolves without throwing', async () => {
      const transport = new ConsoleSmsTransport();

      await expect(transport.send(PHONE, OTP_BODY)).resolves.toBeUndefined();
    });
  });
});
