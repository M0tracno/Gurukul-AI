/**
 * RouteLoadingSkeleton — Skeleton loading fallback for lazy-loaded routes.
 *
 * Mirrors the layout structure of typical pages (header area, sidebar hint,
 * content blocks) rather than showing a blank screen or a spinner.
 * Used as the Suspense fallback throughout the route tree.
 *
 * Requirements: 6.6 (skeleton loading states)
 */

import React from 'react';

interface RouteLoadingSkeletonProps {
  /** Optional label displayed as accessible text for screen readers */
  label?: string;
}

/**
 * Skeleton block — a pulsing placeholder rectangle.
 */
function SkeletonBlock({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  marginBottom = '0.75rem',
}: {
  width?: string;
  height?: string;
  borderRadius?: string;
  marginBottom?: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        marginBottom,
        background: 'linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  );
}

export function RouteLoadingSkeleton({ label }: RouteLoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label ? `Loading ${label}...` : 'Loading page...'}
      aria-busy="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        padding: '0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid #e0e0e0',
          gap: '1rem',
        }}
      >
        <SkeletonBlock width="140px" height="2rem" marginBottom="0" />
        <div style={{ flex: 1 }} />
        <SkeletonBlock width="32px" height="32px" borderRadius="50%" marginBottom="0" />
        <SkeletonBlock width="80px" height="1.5rem" marginBottom="0" />
      </div>

      {/* Body area */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar skeleton */}
        <div
          style={{
            width: '240px',
            padding: '1.5rem 1rem',
            borderRight: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <SkeletonBlock width="100%" height="2rem" />
          <SkeletonBlock width="90%" height="2rem" />
          <SkeletonBlock width="85%" height="2rem" />
          <SkeletonBlock width="95%" height="2rem" />
          <SkeletonBlock width="80%" height="2rem" />
        </div>

        {/* Main content skeleton */}
        <div style={{ flex: 1, padding: '2rem' }}>
          {/* Page title */}
          <SkeletonBlock width="240px" height="1.75rem" marginBottom="1.5rem" />

          {/* Content cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <SkeletonBlock width="60%" height="1rem" />
                <SkeletonBlock width="40%" height="2rem" />
                <SkeletonBlock width="80%" height="0.75rem" />
              </div>
            ))}
          </div>

          {/* Table-like rows */}
          <SkeletonBlock width="100%" height="2.5rem" marginBottom="0.25rem" />
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={i} width="100%" height="3rem" marginBottom="0.25rem" />
          ))}
        </div>
      </div>

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes skeleton-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

