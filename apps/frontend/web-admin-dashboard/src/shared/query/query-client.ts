import { QueryClient } from '@tanstack/react-query';
import { processQueryError } from './query-error-handler';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Performance optimizations
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer

      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry for auth errors (401, 403)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if ([401, 403, 404].includes(status)) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Background refetching
      refetchOnWindowFocus: false, // Prevent excessive refetching
      refetchOnMount: true,
      refetchOnReconnect: true,

      // Error handling
      throwOnError: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,

      // Error handling
      throwOnError: false,

      // Global mutation error handler
      onError: error => {
        console.error('Mutation error:', error);
        // Process error for consistent error handling
        processQueryError(error);
      },
    },
  },
});

// Set query defaults for language entities
queryClient.setQueryDefaults(['language-entities'], {
  staleTime: 30 * 60 * 1000, // 30 minutes - admin data
  gcTime: 60 * 60 * 1000, // 1 hour
});

// Set query defaults for regions
queryClient.setQueryDefaults(['regions'], {
  staleTime: 30 * 60 * 1000, // 30 minutes - admin data
  gcTime: 60 * 60 * 1000, // 1 hour
});

// Set query defaults for sponsorships
queryClient.setQueryDefaults(['sponsorships'], {
  staleTime: 5 * 60 * 1000, // 5 minutes - more dynamic
  gcTime: 15 * 60 * 1000, // 15 minutes
});

// Query keys factory for consistent key generation
export const queryKeys = {
  // Base keys
  all: ['app'] as const,

  // Users
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), 'user', id] as const,

  // Language entities
  languageEntities: (page?: number, pageSize?: number, search?: string) =>
    [
      ...queryKeys.all,
      'language-entities',
      { page, pageSize, search },
    ] as const,
  languageEntity: (id: string) =>
    [...queryKeys.all, 'language-entities', 'language-entity', id] as const,
  languageEntityVersions: (id: string) =>
    [...queryKeys.languageEntity(id), 'versions'] as const,

  // Regions
  regions: () => [...queryKeys.all, 'regions'] as const,
  region: (id: string) => [...queryKeys.regions(), 'region', id] as const,
  regionVersions: (id: string) =>
    [...queryKeys.region(id), 'versions'] as const,

  // Sponsorships
  sponsorships: () => [...queryKeys.all, 'sponsorships'] as const,
  sponsorship: (id: string) =>
    [...queryKeys.sponsorships(), 'sponsorship', id] as const,
  sponsorshipAllocations: (id: string) =>
    [...queryKeys.sponsorship(id), 'allocations'] as const,
};
