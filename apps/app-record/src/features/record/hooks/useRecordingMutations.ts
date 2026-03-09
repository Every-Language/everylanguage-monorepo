import { useInsertSegments } from '../api/insert-segments';

/**
 * Hook for recording mutations
 *
 * @deprecated Use useInsertSegments from '../api/insert-segments' directly instead.
 * This hook is kept for backward compatibility but will be removed in a future version.
 */
export const useRecordingMutations = () => {
  const insertSegments = useInsertSegments();
  return { insertSegments };
};
