import { useState, useCallback } from 'react';
import { powerSyncSystem } from '@/shared/infrastructure/powersync';
import { logger } from '@/shared/utils/logger';

export interface UpdateProjectFormData {
  name: string;
  description: string;
  source_language_entity_id: string | null;
  source_language_name: string | null;
  target_language_entity_id: string | null;
  target_language_name: string | null;
  region_id: string | null;
  region_name: string | null;
}

/**
 * Hook for updating projects
 *
 * Separates business logic from UI components.
 * Handles project updates with PowerSync local database.
 */
export const useUpdateProject = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateProject = useCallback(
    async (projectId: string, data: UpdateProjectFormData): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!powerSyncSystem.isInitialized) {
          throw new Error('PowerSync database not initialized');
        }

        const now = new Date().toISOString();

        await powerSyncSystem.execute(
          `UPDATE projects 
           SET name = ?, 
               description = ?, 
               source_language_entity_id = ?,
               source_language_name = ?,
               target_language_entity_id = ?,
               target_language_name = ?,
               region_id = ?,
               region_name = ?,
               updated_at = ?
           WHERE id = ?`,
          [
            data.name.trim(),
            data.description.trim() || null,
            data.source_language_entity_id || null,
            data.source_language_name || null,
            data.target_language_entity_id || null,
            data.target_language_name || null,
            data.region_id || null,
            data.region_name || null,
            now,
            projectId,
          ]
        );

        logger.info('Project updated successfully:', {
          projectId,
          name: data.name,
        });
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to update project');
        logger.error('Failed to update project:', error);
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    updateProject,
    isLoading,
    error,
  };
};
