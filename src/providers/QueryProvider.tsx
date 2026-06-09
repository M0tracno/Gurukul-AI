/**
 * QueryProvider — TanStack React Query configuration.
 *
 * Sets up a global QueryClient with sensible defaults:
 * - Queries: 5 min staleTime, 10 min gcTime, 3 retries with exponential backoff
 * - Mutations: no retries (user should be informed immediately)
 * - After 3 failed retries, queries surface isError to display inline error + retry
 *
 * Validates: Requirements 5.2, 5.7
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

/**
 * Exponential backoff for retries: 1s, 2s, 4s
 * Capped at 4 seconds to keep total wait reasonable.
 */
function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 4000);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Exported for testing purposes */
export { queryClient };

interface QueryProviderProps {
  children: ReactNode;
}

export function AppQueryProvider({ children }: QueryProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
