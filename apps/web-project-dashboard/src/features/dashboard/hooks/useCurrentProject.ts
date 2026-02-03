import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useProject, type Project } from '../../../shared/hooks/query/projects';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectRouteContext } from '../context/ProjectRoute.context';

/**
 * Hook that provides the current project from either route params or context.
 * This is a compatibility hook that allows components to work in both
 * the old context-based system and the new route-based system.
 *
 * Priority:
 * 1. Route params (if inside ProjectRouteProvider)
 * 2. ProjectContext (if inside ProjectProvider)
 * 3. Fallback to null
 */
export interface CurrentProjectResult {
  project: Project | null;
  projectId: string | null;
  isLoading: boolean;
  error: Error | null;
  isProjectSelected: boolean;
}

export function useCurrentProject(): CurrentProjectResult {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();

  // Try route context first
  const routeContext = useContext(ProjectRouteContext);

  // Try legacy context
  const legacyContext = useContext(ProjectContext);

  // Fetch project from route param if available
  const {
    data: fetchedProject,
    isLoading: fetchLoading,
    error: fetchError,
  } = useProject(routeProjectId || null);

  // If we're in a route context, use that
  if (routeContext !== undefined) {
    return {
      project: routeContext.project,
      projectId: routeContext.projectId,
      isLoading: routeContext.isLoading,
      error: routeContext.error,
      isProjectSelected: routeContext.isProjectSelected,
    };
  }

  // If we have a route project ID, use the fetched project
  if (routeProjectId) {
    return {
      project: fetchedProject || null,
      projectId: routeProjectId,
      isLoading: fetchLoading,
      error: fetchError as Error | null,
      isProjectSelected: !!fetchedProject,
    };
  }

  // Fall back to legacy context
  if (legacyContext !== undefined) {
    return {
      project: legacyContext.selectedProject,
      projectId: legacyContext.selectedProjectId,
      isLoading: false,
      error: null,
      isProjectSelected: legacyContext.isProjectSelected,
    };
  }

  // No project available
  return {
    project: null,
    projectId: null,
    isLoading: false,
    error: null,
    isProjectSelected: false,
  };
}
