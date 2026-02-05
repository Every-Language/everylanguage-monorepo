import React from 'react';
import { useAuth } from '../../../auth';
import { useCurrentProject } from '../../hooks/useCurrentProject';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useUserDisplayName } from '../../../../shared/hooks/query/user-profile';
import { ProgressWidgets } from './ProgressWidgets';
import { RecentActivity } from './RecentActivity';
import { ProjectInfo } from './ProjectInfo';
import { RecentUpdates } from './RecentUpdates';
import { LoadingSpinner } from '../../../../shared/design-system';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const { project, isLoading: projectLoading } = useCurrentProject();
  const displayName = useUserDisplayName(user);

  const dashboardData = useDashboardData({
    projectId: project?.id || null,
  });

  if (projectLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (!project) {
    return (
      <div className='p-8'>
        <div className='max-w-md mx-auto mt-16 text-center'>
          <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4'>
            No Project Selected
          </h1>
          <p className='text-neutral-600 dark:text-neutral-400'>
            Please select a project from the sidebar to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-5'>
      {/* Header */}
      <div className='mb-4'>
        <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
          Dashboard
        </h1>
        <p className='text-sm text-neutral-600 dark:text-neutral-400 mt-0.5'>
          Welcome back, {displayName}!
        </p>
      </div>

      {/* Progress Widgets */}
      <ProgressWidgets
        progressStats={dashboardData.progressStats}
        isLoading={dashboardData.progressLoading}
      />

      {/* Recent Updates */}
      <RecentUpdates />

      {/* Recent Activity */}
      <RecentActivity
        activityData={dashboardData.recentActivityData}
        isLoading={dashboardData.activityLoading}
      />

      {/* Project Information */}
      <ProjectInfo
        projectMetadata={dashboardData.projectMetadata}
        isLoading={dashboardData.metadataLoading}
      />
    </div>
  );
};
