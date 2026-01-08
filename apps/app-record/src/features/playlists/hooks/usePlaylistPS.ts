import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import type { Playlist } from '../types';

interface UsePlaylistPowerSyncReturn {
  playlist: Playlist | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get a single playlist from PowerSync database with TanStack Query caching
 * @param playlistId - The ID of the playlist to fetch
 * @param initialData - Optional initial data to use while fetching
 */
export const usePlaylistPS = ({
  playlistId,
  initialData,
}: {
  playlistId: string;
  initialData?: Playlist;
}): UsePlaylistPowerSyncReturn => {
  const {
    data: playlist,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async (): Promise<Playlist> => {
      if (!powerSyncSystem.isInitialized) {
        throw new Error('PowerSync not initialized');
      }

      const result = await powerSyncSystem.get(
        'SELECT * FROM playlists WHERE id = ?',
        [playlistId]
      );
      return result as Playlist;
    },
    initialData,
    staleTime: 0, // Always fetch fresh data
    enabled: powerSyncSystem.isInitialized,
  });

  return {
    playlist,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
};
