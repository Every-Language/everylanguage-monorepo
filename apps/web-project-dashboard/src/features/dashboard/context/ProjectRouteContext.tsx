import React, { createContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, type Project } from '../../../shared/hooks/query/projects';

export interface ProjectRouteContextValue {
  projectId: string | null;
  project: Project | null;
  isLoading: boolean;
  error: Error | null;
  isProjectSelected: boolean;
  closeProject: () => void;
}

export const ProjectRouteContext = createContext<
  ProjectRouteContextValue | undefined
>(undefined);

interface ProjectRouteProviderProps {
  children: ReactNode;
}

/**
 * ProjectRouteProvider extracts the project ID from the URL route params
 * and fetches the corresponding project data. This replaces the old
 * state-based ProjectContext with a route-based approach for better
 * linking and state persistence.
 */
export const ProjectRouteProvider: React.FC<ProjectRouteProviderProps> = ({
  children,
}) => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Fetch project data based on route param
  const { data: project, isLoading, error } = useProject(projectId || null);

  const closeProject = () => {
    navigate('/projects');
  };

  const value = useMemo<ProjectRouteContextValue>(
    () => ({
      projectId: projectId || null,
      project: project || null,
      isLoading,
      error: error as Error | null,
      isProjectSelected: !!project,
      closeProject,
    }),
    [projectId, project, isLoading, error, navigate]
  );

  return (
    <ProjectRouteContext.Provider value={value}>
      {children}
    </ProjectRouteContext.Provider>
  );
};
