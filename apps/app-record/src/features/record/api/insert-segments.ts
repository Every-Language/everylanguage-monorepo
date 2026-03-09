import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RecordingService } from '../services/recording-service';
import type { InsertSegmentsParams } from '../services/recording-service';
import { segmentsKeys } from './get-segments';
import { logger } from '@/shared/utils/logger';

/**
 * Hook for inserting segments with automatic cache invalidation
 *
 * This is the API layer hook that wraps the RecordingService.
 * It handles TanStack Query mutation and cache invalidation.
 *
 * Components should use this hook instead of directly calling RecordingService.
 */
export const useInsertSegments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: InsertSegmentsParams) =>
      RecordingService.insertSegments(params),
    onSuccess: (_, variables) => {
      // Invalidate segments queries for this sequence to trigger refetch
      queryClient.invalidateQueries({
        queryKey: segmentsKeys.bySequence(variables.sequenceId),
      });
      logger.info('Segments inserted and cache invalidated', {
        sequenceId: variables.sequenceId,
      });
    },
    onError: error => {
      logger.error('Failed to insert segments:', error);
    },
  });
};
