import { useQuery } from '@powersync/react';
import type { Project } from '../types/project';

/**
 * Hook for fetching projects
 *
 * Queries active projects from PowerSync local database.
 * Only returns projects that haven't been deleted (deleted_at IS NULL).
 * Results are ordered by creation date (newest first).
 */
export const useProjects = () => {
  const { data: projects, error } = useQuery<Project>(
    `SELECT id, name, description, created_at, updated_at 
     FROM projects 
     WHERE deleted_at IS NULL 
     ORDER BY created_at DESC`
  );

  return {
    projects,
    error,
  };
};
