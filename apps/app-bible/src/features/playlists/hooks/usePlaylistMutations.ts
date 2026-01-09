import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlaylistService } from '../services/PlaylistService';
import { PlaylistFormData } from '../types';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Hook for playlist mutations (create, edit, delete) with automatic cache invalidation
 */
export const usePlaylistMutations = () => {
  const queryClient = useQueryClient();

  const createPlaylist = useMutation({
    mutationFn: (playlist: PlaylistFormData) =>
      PlaylistService.create(playlist),
    onSuccess: () => {
      // Invalidate all playlist queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      logger.info(ENABLE_LOGGING, 'Playlist created and cache invalidated');
    },
    onError: error => {
      logger.error(ENABLE_LOGGING, 'Failed to create playlist:', error);
    },
  });

  const editPlaylist = useMutation({
    mutationFn: ({
      playlistId,
      updates,
    }: {
      playlistId: string;
      updates: Partial<PlaylistFormData>;
    }) => PlaylistService.edit(playlistId, updates),
    onSuccess: (_, variables) => {
      // Invalidate all playlist queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      // Invalidate the specific playlist details query
      queryClient.invalidateQueries({
        queryKey: ['playlist', variables.playlistId],
      });
      // Also invalidate playlist items queries in case playlist data changed
      queryClient.invalidateQueries({ queryKey: ['playlistItems'] });
      logger.info(ENABLE_LOGGING, 'Playlist edited and cache invalidated');
    },
    onError: error => {
      logger.error(ENABLE_LOGGING, 'Failed to edit playlist:', error);
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: (playlistId: string) => PlaylistService.delete(playlistId),
    onSuccess: (_, playlistId) => {
      // Invalidate all playlist queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      // Invalidate the specific playlist details query
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      logger.info(ENABLE_LOGGING, 'Playlist deleted and cache invalidated');
    },
    onError: error => {
      logger.error(ENABLE_LOGGING, 'Failed to delete playlist:', error);
    },
  });

  const addToPlaylist = useMutation({
    mutationFn: ({
      playlistId,
      chapterId,
    }: {
      playlistId: string;
      chapterId: string;
    }) => PlaylistService.addToPlaylist(playlistId, chapterId),
    onSuccess: (_, variables) => {
      // Invalidate playlist items queries for this specific playlist
      queryClient.invalidateQueries({
        queryKey: ['playlistItems', variables.playlistId],
      });
      logger.info(
        ENABLE_LOGGING,
        'Item added to playlist and cache invalidated'
      );
    },
    onError: error => {
      logger.error(ENABLE_LOGGING, 'Failed to add item to playlist:', error);
    },
  });

  const addVerseRangeToPlaylist = useMutation({
    mutationFn: ({
      playlistId,
      startVerseId,
      endVerseId,
    }: {
      playlistId: string;
      startVerseId: string;
      endVerseId: string;
    }) =>
      PlaylistService.addVerseRangeToPlaylist(
        playlistId,
        startVerseId,
        endVerseId
      ),
    onSuccess: (_, variables) => {
      // Invalidate playlist items queries for this specific playlist
      queryClient.invalidateQueries({
        queryKey: ['playlistItems', variables.playlistId],
      });
      logger.info(
        ENABLE_LOGGING,
        'Verse range added to playlist and cache invalidated'
      );
    },
    onError: error => {
      logger.error(
        ENABLE_LOGGING,
        'Failed to add verse range to playlist:',
        error
      );
    },
  });

  const addCustomTextToPlaylist = useMutation({
    mutationFn: ({
      playlistId,
      customText,
    }: {
      playlistId: string;
      customText: string;
    }) => PlaylistService.addCustomText(playlistId, customText),
    onSuccess: (_, variables) => {
      // Invalidate playlist items queries for this specific playlist
      queryClient.invalidateQueries({
        queryKey: ['playlistItems', variables.playlistId],
      });
      logger.info(
        ENABLE_LOGGING,
        'Custom text added to playlist and cache invalidated'
      );
    },
    onError: error => {
      logger.error(
        ENABLE_LOGGING,
        'Failed to add custom text to playlist:',
        error
      );
    },
  });

  const reorderPlaylistItems = useMutation({
    mutationFn: ({
      playlistId,
      itemsWithNewOrder,
    }: {
      playlistId: string;
      itemsWithNewOrder: Array<{ id: string; order_index: number }>;
    }) => PlaylistService.reorderPlaylistItems(playlistId, itemsWithNewOrder),
    onSuccess: (_, variables) => {
      // Invalidate playlist items queries for this specific playlist
      queryClient.invalidateQueries({
        queryKey: ['playlistItems', variables.playlistId],
      });
      logger.info(
        ENABLE_LOGGING,
        'Playlist items reordered and cache invalidated'
      );
    },
    onError: error => {
      logger.error(ENABLE_LOGGING, 'Failed to reorder playlist items:', error);
    },
  });

  const deletePlaylistItem = useMutation({
    mutationFn: ({
      playlistItemId,
    }: {
      playlistId: string;
      playlistItemId: string;
    }) => PlaylistService.deletePlaylistItem(playlistItemId),
    onSuccess: (_, variables) => {
      // Invalidate all playlist items queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['playlistItems', variables.playlistId],
      });
      logger.info(
        ENABLE_LOGGING,
        'Playlist item deleted and cache invalidated'
      );
    },
    onError: error => {
      logger.error(ENABLE_LOGGING, 'Failed to delete playlist item:', error);
    },
  });

  return {
    createPlaylist,
    editPlaylist,
    deletePlaylist,
    addToPlaylist,
    addVerseRangeToPlaylist,
    addCustomTextToPlaylist,
    reorderPlaylistItems,
    deletePlaylistItem,
  };
};
