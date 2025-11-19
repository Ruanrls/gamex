import { QueryClient } from "@tanstack/react-query";

/**
 * Create and configure the React Query client
 * Optimized for blockchain calls with appropriate cache times
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 1000 * 60 * 5, // 5 minutes default

      // Cache time: how long inactive data stays in cache
      gcTime: 1000 * 60 * 10, // 10 minutes (was cacheTime in v4)

      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (useful for blockchain state changes)
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,

      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
    },
  },
});
