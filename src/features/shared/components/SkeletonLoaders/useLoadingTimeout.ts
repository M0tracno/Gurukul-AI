/**
 * useLoadingTimeout — Hook that tracks whether a loading state has
 * exceeded a configurable timeout (default: 10 seconds).
 *
 * Returns `isTimedOut` which becomes true after the timeout elapses
 * while `isLoading` is true. Resets automatically when loading completes.
 *
 * Requirements: 6.7
 */

import { useEffect, useRef, useState } from 'react';

/** Default timeout duration in milliseconds */
const DEFAULT_TIMEOUT_MS = 10_000;

interface UseLoadingTimeoutOptions {
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Timeout duration in ms. Default: 10000 (10 seconds) */
  timeoutMs?: number;
}

interface UseLoadingTimeoutResult {
  /** Whether the loading state has exceeded the timeout */
  isTimedOut: boolean;
  /** Reset the timeout state (e.g., on retry) */
  reset: () => void;
}

export function useLoadingTimeout({
  isLoading,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseLoadingTimeoutOptions): UseLoadingTimeoutResult {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading && !isTimedOut) {
      timerRef.current = setTimeout(() => {
        setIsTimedOut(true);
      }, timeoutMs);
    }

    // Clear timer when loading finishes or on unmount
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, isTimedOut, timeoutMs]);

  // Reset timed out when loading transitions to false
  useEffect(() => {
    if (!isLoading) {
      setIsTimedOut(false);
    }
  }, [isLoading]);

  const reset = () => {
    setIsTimedOut(false);
  };

  return { isTimedOut, reset };
}
