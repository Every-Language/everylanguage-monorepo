import { Outlet } from 'react-router-dom';
import { ProjectRouteProvider } from '../../../features/dashboard/context/ProjectRouteContext';
import { ProjectSidebar } from './ProjectSidebar';
import { MainContent } from './MainContent';

/**
 * ProjectLayout wraps all project-specific routes.
 * It provides the ProjectRouteContext which extracts the project ID from the URL.
 */
export function ProjectLayout() {
  return (
    <ProjectRouteProvider>
      <div className='flex h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-accent-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 transition-theme'>
        <ProjectSidebar />
        <div className='flex-1 flex flex-col'>
          <MainContent>
            <Outlet />
          </MainContent>
        </div>
      </div>
    </ProjectRouteProvider>
  );
}
