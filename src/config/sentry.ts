/**
 * Sentry SDK Configuration — Frontend Error Reporting
 *
 * Initializes Sentry to capture uncaught JavaScript errors and unhandled
 * promise rejections. Enriches error reports with user ID, current route,
 * browser user-agent, and operating system.
 *
 * Requirements: 11.2
 */

import * as Sentry from '@sentry/react';

/**
 * Detect OS from the user-agent string.
 */
function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

/**
 * Initialize Sentry SDK for frontend error reporting.
 *
 * Should be called as early as possible in the application lifecycle
 * (before React renders) so that errors during bootstrap are captured.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Skip initialization if no DSN is configured (e.g., local development)
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No DSN configured — error reporting disabled.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Capture 100% of error events
    sampleRate: 1.0,

    // Performance tracing sample rate (10% in production)
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Attach global context tags
    initialScope: {
      tags: {
        os: detectOS(),
        userAgent: navigator.userAgent,
      },
    },

    // Filter out known noise
    ignoreErrors: [
      // Browser extension errors
      'ResizeObserver loop',
      // Network errors that are not actionable
      'Failed to fetch',
      'NetworkError',
      'Load failed',
    ],

    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
    ],

    // Before sending an event, enrich with current route
    beforeSend(event) {
      // Attach current route/URL context
      if (event.contexts) {
        event.contexts.route = {
          url: window.location.href,
          pathname: window.location.pathname,
        };
      } else {
        event.contexts = {
          route: {
            url: window.location.href,
            pathname: window.location.pathname,
          },
        };
      }

      // Attach browser user-agent and OS as tags (redundant with initialScope
      // but ensures they are always present even after scope changes)
      if (!event.tags) {
        event.tags = {};
      }
      event.tags.os = detectOS();
      event.tags.userAgent = navigator.userAgent;
      event.tags.route = window.location.pathname;

      return event;
    },
  });
}

/**
 * Set the authenticated user context on Sentry.
 * Call this after login or when user identity is established.
 */
export function setSentryUser(
  user: {
    id: string;
    email?: string;
    role?: string;
  } | null
): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    } as Sentry.User);
    Sentry.setTag('userRole', user.role || 'unknown');
  } else {
    Sentry.setUser(null);
    Sentry.setTag('userRole', 'anonymous');
  }
}

/**
 * Update the current route tag on Sentry scope.
 * Can be called on route changes to keep context accurate.
 */
export function setSentryRoute(pathname: string): void {
  Sentry.setTag('route', pathname);
  Sentry.setContext('route', {
    pathname,
    url: window.location.href,
  });
}
