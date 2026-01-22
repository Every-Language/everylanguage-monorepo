import { useState, useCallback } from 'react';
import { powerSyncSystem } from '@/shared/infrastructure/powersync';
import { logger } from '@/shared/utils/logger';

/**
 * Hook for deleting projects
 *
 * Separates business logic from UI components.
 * Handles project deletion with PowerSync local database.
 * Cascades deletion to all sequences and segments linked to the project.
 */
export const useDeleteProject = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!powerSyncSystem.isInitialized) {
          throw new Error('PowerSync database not initialized');
        }

        const now = new Date().toISOString();

        // Soft delete all segments linked to this project
        await powerSyncSystem.execute(
          `UPDATE segments 
           SET deleted_at = ?, updated_at = ?
           WHERE project_id = ? AND deleted_at IS NULL`,
          [now, now, projectId]
        );

        // Soft delete all sequences linked to this project
        await powerSyncSystem.execute(
          `UPDATE sequences 
           SET deleted_at = ?, updated_at = ?
           WHERE project_id = ? AND deleted_at IS NULL`,
          [now, now, projectId]
        );

        // Soft delete the project itself
        await powerSyncSystem.execute(
          `UPDATE projects 
           SET deleted_at = ?, updated_at = ?
           WHERE id = ?`,
          [now, now, projectId]
        );

        logger.info('Project deleted successfully:', {
          projectId,
        });
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to delete project');
        logger.error('Failed to delete project:', error);
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    deleteProject,
    isLoading,
    error,
  };
};
