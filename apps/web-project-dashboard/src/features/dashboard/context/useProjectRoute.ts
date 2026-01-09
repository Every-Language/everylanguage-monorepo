import { useContext } from 'react';
import {
  ProjectRouteContext,
  type ProjectRouteContextValue,
} from './ProjectRoute.context';

/**
 * Hook to access the current project from the URL route.
 * Must be used within a ProjectRouteProvider.
 */
export const useProjectRoute = (): ProjectRouteContextValue => {
  const context = useContext(ProjectRouteContext);
  if (context === undefined) {
    throw new Error(
      'useProjectRoute must be used within a ProjectRouteProvider'
    );
  }
  return context;
};
