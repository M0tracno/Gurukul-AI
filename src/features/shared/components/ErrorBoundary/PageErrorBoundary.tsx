/**
 * PageErrorBoundary — Page-level error boundary.
 *
 * Wraps individual route/page content. If a page component crashes,
 * this boundary catches it, reports to Sentry, and renders an inline
 * error fallback with a retry button (no full-page reload needed).
 */

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import * as Sentry from '@sentry/react';
import { type ReactNode } from 'react';

function InlineErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#d32f2f' }}>
        This page encountered an error
      </h2>
      <p style={{ marginBottom: '1rem', color: '#555', maxWidth: '400px' }}>
        Something went wrong loading this page. You can try again or navigate to a different
        section.
      </p>
      <pre
        style={{
          background: '#f5f5f5',
          padding: '0.75rem',
          borderRadius: '4px',
          maxWidth: '500px',
          overflow: 'auto',
          fontSize: '0.75rem',
          marginBottom: '1rem',
          color: '#333',
        }}
      >
        {error.message}
      </pre>
      <button
        type="button"
        onClick={resetErrorBoundary}
        style={{
          padding: '0.5rem 1.25rem',
          fontSize: '0.875rem',
          borderRadius: '4px',
          border: '1px solid #1976d2',
          background: 'transparent',
          color: '#1976d2',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  );
}

interface PageErrorBoundaryProps {
  children: ReactNode;
}

export function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={InlineErrorFallback}
      onError={(error, info) => {
        Sentry.captureException(error, {
          extra: { componentStack: info.componentStack },
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
