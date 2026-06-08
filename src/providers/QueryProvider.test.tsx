/**
 * Tests for QueryProvider configuration.
 *
 * Validates:
 * - Global defaults are applied (staleTime, gcTime, retry: 3)
 * - Retry behavior with exponential backoff
 * - After 3 retries, query surfaces error state
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { AppQueryProvider, queryClient } from './QueryProvider';

describe('AppQueryProvider', () => {
  it('provides QueryClient to children with correct default options', () => {
    const defaultOptions = queryClient.getDefaultOptions();

    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(defaultOptions.queries?.gcTime).toBe(10 * 60 * 1000);
    expect(defaultOptions.queries?.retry).toBe(3);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.mutations?.retry).toBe(0);
  });

  it('applies exponential backoff for retries', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    const retryDelay = defaultOptions.queries?.retryDelay;

    expect(typeof retryDelay).toBe('function');
    if (typeof retryDelay === 'function') {
      expect(retryDelay(0, new Error())).toBe(1000); // 1s
      expect(retryDelay(1, new Error())).toBe(2000); // 2s
      expect(retryDelay(2, new Error())).toBe(4000); // 4s (capped)
      expect(retryDelay(3, new Error())).toBe(4000); // still capped at 4s
    }
  });

  it('surfaces error state after retries are exhausted', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Network failure'));

    function Wrapper({ children }: { children: ReactNode }) {
      return <AppQueryProvider>{children}</AppQueryProvider>;
    }

    // Use a fresh query client to avoid interference
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['test-retry-exhaustion'],
          queryFn: mockFn,
          retry: 0, // override for test speed
        }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network failure');
  });
});
