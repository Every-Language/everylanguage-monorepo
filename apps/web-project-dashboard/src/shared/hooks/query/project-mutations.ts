import {
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useSoftDeleteRecord,
} from './base-mutations';
import type { TableInsert, TableUpdate } from './base-mutations';

// Create a new project
export function useCreateProject() {
  return useCreateRecord('projects', {
    // Invalidate related queries when a project is created
    invalidateQueries: [['projects'], ['projects', 'by-user']],
  });
}

// Update an existing project
export function useUpdateProject() {
  return useUpdateRecord('projects', {
    // Invalidate related queries when a project is updated
    invalidateQueries: [
      ['projects'],
      ['projects', 'by-user'],
      ['project-metadata'],
    ],
  });
}

// Delete a project (hard delete)
export function useDeleteProject() {
  return useDeleteRecord('projects', {
    // Invalidate related queries when a project is deleted
    invalidateQueries: [
      ['projects'],
      ['projects', 'by-user'],
      ['media_files'],
      ['text_versions'],
    ],
  });
}

// Soft delete a project (sets deleted_at)
export function useSoftDeleteProject() {
  return useSoftDeleteRecord('projects', {
    // Invalidate related queries when a project is soft deleted
    invalidateQueries: [['projects'], ['projects', 'by-user']],
  });
}

// Type helpers for project mutations
export type CreateProjectData = TableInsert<'projects'>;
export type UpdateProjectData = TableUpdate<'projects'>;
