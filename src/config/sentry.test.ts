/**
 * Tests for Sentry frontend error reporting configuration.
 *
 * Validates: Requirements 11.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';

// Mock @sentry/react
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
}));

describe('Sentry Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(Sentry.init).mockClear();
    vi.mocked(Sentry.setUser).mockClear();
    vi.mocked(Sentry.setTag).mockClear();
    vi.mocked(Sentry.setContext).mockClear();
  });

  describe('initSentry', () => {
    it('should not initialize Sentry when DSN is not configured', async () => {
      vi.stubEnv('VITE_SENTRY_DSN', '');

      const { initSentry } = await import('./sentry');
      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();

      vi.unstubAllEnvs();
    });

    it('should initialize Sentry with correct config when DSN is present', async () => {
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('PROD', 'true');
      vi.stubEnv('VITE_APP_VERSION', '2.0.0');

      const { initSentry } = await import('./sentry');
      initSentry();

      expect(Sentry.init).toHaveBeenCalledTimes(1);
      const config = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(config).toBeDefined();
      expect(config!.dsn).toBe('https://test@sentry.io/123');
      expect(config!.release).toBe('2.0.0');
      expect(config!.sampleRate).toBe(1.0);

      vi.unstubAllEnvs();
    });

    it('should include OS and user-agent in initial scope tags', async () => {
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('MODE', 'test');

      const { initSentry } = await import('./sentry');
      initSentry();

      const config = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(config!.initialScope).toBeDefined();
      const scope = config!.initialScope as { tags: Record<string, string> };
      expect(scope.tags.os).toBeDefined();
      expect(typeof scope.tags.os).toBe('string');
      expect(scope.tags.userAgent).toBe(navigator.userAgent);

      vi.unstubAllEnvs();
    });

    it('should attach current route in beforeSend', async () => {
      vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
      vi.stubEnv('MODE', 'test');

      const { initSentry } = await import('./sentry');
      initSentry();

      const config = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(config!.beforeSend).toBeDefined();

      // Simulate an event passing through beforeSend
      const event = { tags: {} } as unknown as Sentry.ErrorEvent;
      const result = config!.beforeSend!(event, {} as Sentry.EventHint);

      expect(result).not.toBeNull();
      const processedEvent = result as Sentry.ErrorEvent;
      expect(processedEvent.contexts!.route).toBeDefined();
      expect((processedEvent.contexts!.route as Record<string, string>).pathname).toBe(
        window.location.pathname
      );
      expect((processedEvent.tags as Record<string, string>).route).toBe(window.location.pathname);
      expect((processedEvent.tags as Record<string, string>).os).toBeDefined();
      expect((processedEvent.tags as Record<string, string>).userAgent).toBe(navigator.userAgent);

      vi.unstubAllEnvs();
    });
  });

  describe('setSentryUser', () => {
    it('should set user context with user ID, email, and role', async () => {
      const { setSentryUser } = await import('./sentry');

      setSentryUser({ id: 'user-123', email: 'test@example.com', role: 'student' });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        role: 'student',
      });
      expect(Sentry.setTag).toHaveBeenCalledWith('userRole', 'student');
    });

    it('should clear user context when null is provided', async () => {
      const { setSentryUser } = await import('./sentry');

      setSentryUser(null);

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
      expect(Sentry.setTag).toHaveBeenCalledWith('userRole', 'anonymous');
    });
  });

  describe('setSentryRoute', () => {
    it('should update route tag and context', async () => {
      const { setSentryRoute } = await import('./sentry');

      setSentryRoute('/student-dashboard');

      expect(Sentry.setTag).toHaveBeenCalledWith('route', '/student-dashboard');
      expect(Sentry.setContext).toHaveBeenCalledWith('route', {
        pathname: '/student-dashboard',
        url: window.location.href,
      });
    });
  });
});
