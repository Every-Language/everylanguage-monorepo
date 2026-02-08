import { createContext } from 'react';
import type { Project } from '../../../shared/hooks/query/projects';

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
