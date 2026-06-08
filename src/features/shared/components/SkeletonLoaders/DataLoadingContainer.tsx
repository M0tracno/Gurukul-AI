/**
 * DataLoadingContainer — Wraps a data-fetching view with skeleton
 * loading state and timeout error handling.
 *
 * While `isLoading` is true, renders the provided skeleton component.
 * If loading exceeds 10 seconds, replaces the skeleton with a timeout
 * error message and a retry button.
 *
 * Usage:
 *   <DataLoadingContainer
 *     isLoading={query.isLoading}
 *     onRetry={() => query.refetch()}
 *     skeleton={<DashboardSkeleton />}
 *   >
 *     <DashboardContent data={query.data} />
 *   </DataLoadingContainer>
 *
 * Requirements: 6.6, 6.7
 */

import { type ReactNode } from 'react';
import { useLoadingTimeout } from './useLoadingTimeout';
import { TimeoutError } from './TimeoutError';

interface DataLoadingContainerProps {
  /** Whether data is currently being fetched */
  isLoading: boolean;
  /** The skeleton placeholder to show during loading */
  skeleton: ReactNode;
  /** The actual content to render once loading completes */
  children: ReactNode;
  /** Callback to retry the data fetch on timeout */
  onRetry: () => void;
  /** Timeout duration in ms. Default: 10000 (10 seconds) */
  timeoutMs?: number;
  /** Custom timeout error message */
  timeoutMessage?: string;
}

export function DataLoadingContainer({
  isLoading,
  skeleton,
  children,
  onRetry,
  timeoutMs = 10_000,
  timeoutMessage,
}: DataLoadingContainerProps) {
  const { isTimedOut, reset } = useLoadingTimeout({ isLoading, timeoutMs });

  const handleRetry = () => {
    reset();
    onRetry();
  };

  if (isLoading && isTimedOut) {
    return <TimeoutError onRetry={handleRetry} message={timeoutMessage} />;
  }

  if (isLoading) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}
