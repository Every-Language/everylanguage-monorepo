import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { resolveTargetUserId } from '@/shared/services/auth/OfflineIdentity';
import { supabase } from '@/shared/services/api/supabase';
import type { Playlist } from '../types';

// Logging removed for production query

interface UsePlaylistsPowerSyncReturn {
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get all playlists from PowerSync database with TanStack Query caching
 */
export const usePlaylistsPS = ({
  playlistGroupId,
}: {
  playlistGroupId: string | null;
}): UsePlaylistsPowerSyncReturn => {
  const {
    data: playlists = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['playlists', playlistGroupId, 'user-filtered'],
    queryFn: async (): Promise<Playlist[]> => {
      if (!powerSyncSystem.isInitialized) {
        throw new Error('PowerSync not initialized');
      }

      // Get current user ID
      const session = await supabase.auth.getSession();
      const sessionUserId = session?.data?.session?.user?.id ?? null;
      const userId = await resolveTargetUserId(sessionUserId);

      // Single parametrized query with optional filtering by playlist group id
      const query =
        'SELECT p.* FROM playlists p JOIN user_playlists up ON p.id = up.playlist_id WHERE up.user_id = ? AND (? IS NULL OR up.user_playlist_group_id = ?)';

      const groupId = playlistGroupId ?? null;

      const results = await powerSyncSystem.getAll(query, [
        userId,
        groupId,
        groupId,
      ]);

      // If no results found with user filtering, keep results as empty list

      return results;
    },
    enabled: powerSyncSystem.isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    playlists,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
};
