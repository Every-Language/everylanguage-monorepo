import { useQuery } from '@powersync/react';
import type { Project } from '../types/project';

/**
 * Hook for fetching a single project by ID
 *
 * Queries a project from PowerSync local database.
 * Only returns project if it hasn't been deleted (deleted_at IS NULL).
 */
export const useProject = (projectId: string) => {
  const { data: project, error } = useQuery<Project>(
    `SELECT id, name, description, source_language_name, target_language_name, region_name, created_at, updated_at 
     FROM projects 
     WHERE id = ? AND deleted_at IS NULL`,
    [projectId]
  );

  return {
    project: project?.[0] || null,
    error,
  };
};
