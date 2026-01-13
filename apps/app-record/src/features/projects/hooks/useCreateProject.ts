import { useState, useCallback } from 'react';
import { powerSyncSystem } from '@/shared/infrastructure/powersync/services/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import type { CreateProjectFormData } from '../components';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Try to use crypto.randomUUID() if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = global;
  if (g?.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Hook for creating projects
 *
 * Separates business logic from UI components.
 * Handles project creation with PowerSync local database.
 *
 * Note: Projects can be created locally with just name and description.
 * Required fields (source_language_entity_id, target_language_entity_id)
 * can be set later before sync happens.
 */
export const useCreateProject = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createProject = useCallback(
    async (data: CreateProjectFormData): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!powerSyncSystem.isInitialized) {
          throw new Error('PowerSync database not initialized');
        }

        const projectId = generateUUID();
        const now = new Date().toISOString();

        await powerSyncSystem.execute(
          `INSERT INTO projects (
            id, 
            name, 
            description, 
            created_at, 
            updated_at, 
            project_status, 
            publish_status,
            deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projectId,
            data.name.trim(),
            data.description.trim() || null,
            now,
            now,
            'precreated',
            'pending',
            null, // deleted_at
          ]
        );

        logger.info('Project created successfully:', {
          projectId,
          name: data.name,
        });
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to create project');
        logger.error('Failed to create project:', error);
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    createProject,
    isLoading,
    error,
  };
};
