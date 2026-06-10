/**
 * Unit tests for EmailService — email-unavailable detection.
 *
 * Verifies that when the underlying legacy mail transport cannot be
 * resolved (transport unavailable), `EmailService`:
 *   - reports `isAvailable() === false`, and
 *   - rejects from `sendSetupLink(...)`,
 * so the `setup_link` 502 path is detectable and the account is never
 * left with a usable credential.
 *
 * **Validates: Requirements 8.4**
 */

import { jest } from '@jest/globals';

// Mock logger to avoid import.meta.url issues in ts-jest and suppress noise.
jest.unstable_mockModule('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// The legacy CJS mail transport (`backend/services/emailService.js`) is not
// present in the unit-test environment, so the dynamic import inside
// `resolveTransporter` fails and is caught, yielding a null transport. This
// deterministically simulates the "mail transport unavailable" condition that
// Requirement 8.4 must detect.
const { EmailService } = await import('./emailService.js');

describe('EmailService — email-unavailable detection', () => {
  let service: InstanceType<typeof EmailService>;

  beforeEach(() => {
    service = new EmailService();
  });

  describe('isAvailable', () => {
    it('reports false when the mail transport cannot be resolved', async () => {
      await expect(service.isAvailable()).resolves.toBe(false);
    });

    it('never throws even when the transport is unavailable', async () => {
      await expect(service.isAvailable()).resolves.not.toThrow();
    });
  });

  describe('sendSetupLink', () => {
    it('rejects when the mail transport is unavailable', async () => {
      await expect(
        service.sendSetupLink(
          'student@school.edu',
          'https://app.example.com/account-setup/raw-token',
          'Test Student',
        ),
      ).rejects.toThrow('EMAIL_TRANSPORT_UNAVAILABLE');
    });

    it('rejects regardless of the display name provided', async () => {
      await expect(
        service.sendSetupLink(
          'faculty@school.edu',
          'https://app.example.com/account-setup/another-token',
          '',
        ),
      ).rejects.toThrow();
    });
  });
});
