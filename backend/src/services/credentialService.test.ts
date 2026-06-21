import { describe, it, expect } from '@jest/globals';

import { CredentialService, credentialService } from './credentialService.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Unit tests for the admin password policy (Requirement 8.1):
 * `validateAdminPassword` accepts passwords of at least 8 characters and
 * rejects shorter values with an HTTP 400 (`AppError.badRequest`).
 */
describe('credentialService.validateAdminPassword', () => {
  const service = new CredentialService();

  describe('accepts passwords with >= 8 characters', () => {
    it('accepts a password exactly at the 8-character boundary', () => {
      expect(() => service.validateAdminPassword('abcdefgh')).not.toThrow();
    });

    it('accepts a password longer than 8 characters', () => {
      expect(() =>
        service.validateAdminPassword('a-very-long-secure-password'),
      ).not.toThrow();
    });

    it('accepts an 8-character password composed of mixed characters', () => {
      expect(() => service.validateAdminPassword('A1!bcdef')).not.toThrow();
    });

    it('returns undefined (no value) when the password is valid', () => {
      expect(service.validateAdminPassword('abcdefgh')).toBeUndefined();
    });
  });

  describe('rejects passwords with < 8 characters with HTTP 400', () => {
    it('rejects a 7-character password just below the boundary', () => {
      expect(() => service.validateAdminPassword('abcdefg')).toThrow(AppError);
    });

    it('rejects an empty password', () => {
      expect(() => service.validateAdminPassword('')).toThrow(AppError);
    });

    it('throws AppError with statusCode 400 and a BAD_REQUEST code', () => {
      try {
        service.validateAdminPassword('short');
        throw new Error('Expected validateAdminPassword to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.statusCode).toBe(400);
        expect(appErr.errorCode).toBe('BAD_REQUEST');
      }
    });

    it('does not include the rejected password value in the error message', () => {
      const secret = 'sneaky';
      try {
        service.validateAdminPassword(secret);
        throw new Error('Expected validateAdminPassword to throw');
      } catch (err) {
        expect((err as AppError).message).not.toContain(secret);
      }
    });

    it('rejects a non-string value with a 400 error', () => {
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service.validateAdminPassword(undefined as any),
      ).toThrow(AppError);
    });
  });

  it('exposes the same behavior via the exported singleton', () => {
    expect(() => credentialService.validateAdminPassword('abcdefgh')).not.toThrow();
    expect(() => credentialService.validateAdminPassword('short')).toThrow(AppError);
  });
});
