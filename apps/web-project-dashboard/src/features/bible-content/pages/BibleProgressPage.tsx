import React from 'react';
import { useCurrentProject } from '../../dashboard/hooks/useCurrentProject';
import { BibleProgressManager } from '../components';
import { LoadingSpinner } from '../../../shared/design-system';

const ProjectRequiredMessage: React.FC = () => (
  <div className='p-8'>
    <div className='mb-8'>
      <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
        Bible Progress
      </h1>
      <p className='text-neutral-600 dark:text-neutral-400 mt-1'>
        Track recording progress for Bible content
      </p>
    </div>

    <div className='bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 text-center'>
      <p className='text-neutral-600 dark:text-neutral-400'>
        Please select a project to view Bible progress
      </p>
    </div>
  </div>
);

export const BibleProgressPage: React.FC = () => {
  const { project, isLoading } = useCurrentProject();

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (!project) {
    return <ProjectRequiredMessage />;
  }

  return <BibleProgressManager projectName={project.name} />;
};
