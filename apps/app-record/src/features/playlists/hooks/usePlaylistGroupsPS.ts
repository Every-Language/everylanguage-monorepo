import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import type { UserPlaylistGroup } from '../types';

interface UsePlaylistGroupsPowerSyncReturn {
  playlistGroups: UserPlaylistGroup[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get all books from PowerSync database with TanStack Query caching
 */
export const usePlaylistGroupsPS = (): UsePlaylistGroupsPowerSyncReturn => {
  const {
    data: playlistGroups = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['playlistGroups'],
    queryFn: async (): Promise<UserPlaylistGroup[]> => {
      if (!powerSyncSystem.isInitialized) {
        throw new Error('PowerSync not initialized');
      }

      const results = await powerSyncSystem.getAll(
        'SELECT * FROM user_playlist_groups'
      );

      return results;
    },
    enabled: powerSyncSystem.isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes - Books rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes - Keep books in memory longer
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    playlistGroups,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
};
