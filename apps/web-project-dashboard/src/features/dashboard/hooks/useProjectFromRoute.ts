import { useContext } from 'react';
import {
  ProjectRouteContext,
  type ProjectRouteContextValue,
} from '../context/ProjectRouteContext';

/**
 * Hook to access the current project from the URL route.
 * This replaces useSelectedProject for route-based project selection.
 */
export const useProjectFromRoute = (): ProjectRouteContextValue => {
  const context = useContext(ProjectRouteContext);
  if (context === undefined) {
    throw new Error(
      'useProjectFromRoute must be used within a ProjectRouteProvider'
    );
  }
  return context;
};
