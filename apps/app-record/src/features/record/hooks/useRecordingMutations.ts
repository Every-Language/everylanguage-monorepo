import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RecordingService } from '../services/RecordingService';
import type { InsertSegmentsParams } from '../services/RecordingService';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Hook for recording mutations with automatic cache invalidation
 *
 * Follows the same pattern as usePlaylistMutations.
 * Uses TanStack Query's useMutation for state management and cache invalidation.
 */
export const useRecordingMutations = () => {
  const queryClient = useQueryClient();

  const insertSegments = useMutation({
    mutationFn: (params: InsertSegmentsParams) =>
      RecordingService.insertSegments(params),
    onSuccess: (_, variables) => {
      // Invalidate segments queries for this sequence to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['segments', variables.sequenceId],
      });
      if (ENABLE_LOGGING) {
        logger.info('Segments inserted and cache invalidated', {
          sequenceId: variables.sequenceId,
        });
      }
    },
    onError: error => {
      if (ENABLE_LOGGING) {
        logger.error('Failed to insert segments:', error);
      }
    },
  });

  return {
    insertSegments,
  };
};
