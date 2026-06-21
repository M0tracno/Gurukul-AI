/**
 * AppErrorBoundary — Layout-level error boundary.
 *
 * Wraps all page content. If an unhandled error crashes the React tree,
 * this boundary catches it, reports to Sentry, and renders a full-page
 * fallback with a reload action.
 */

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import * as Sentry from '@sentry/react';
import { type ReactNode } from 'react';

function FullPageErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#d32f2f' }}>
        Something went wrong
      </h1>
      <p style={{ marginBottom: '1.5rem', color: '#555', maxWidth: '480px' }}>
        An unexpected error occurred. Please try reloading the page. If the problem persists,
        contact support.
      </p>
      <pre
        style={{
          background: '#f5f5f5',
          padding: '1rem',
          borderRadius: '4px',
          maxWidth: '600px',
          overflow: 'auto',
          fontSize: '0.75rem',
          marginBottom: '1.5rem',
          color: '#333',
        }}
      >
        {error.message}
      </pre>
      <button
        type="button"
        onClick={resetErrorBoundary}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '4px',
          border: 'none',
          background: '#1976d2',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Reload Page
      </button>
    </div>
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={FullPageErrorFallback}
      onError={(error, info) => {
        Sentry.captureException(error, {
          extra: { componentStack: info.componentStack },
        });
      }}
      onReset={() => {
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
