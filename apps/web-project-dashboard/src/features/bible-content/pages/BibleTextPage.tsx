import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCurrentProject } from '../../dashboard/hooks/useCurrentProject';
import { useTextVersion } from '../../../shared/hooks/query/text-versions';
import { BibleTextManager } from '../components';
import { Button } from '../../../shared/design-system/components/Button';
import { LoadingSpinner } from '../../../shared/design-system';

export const BibleTextPage: React.FC = () => {
  const { projectId, versionId } = useParams<{
    projectId: string;
    versionId: string;
  }>();
  const navigate = useNavigate();
  const { project, isLoading: projectLoading } = useCurrentProject();
  const { data: textVersion, isLoading: versionLoading } = useTextVersion(
    versionId || null
  );

  const isLoading = projectLoading || versionLoading;

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (!project) {
    return (
      <div className='p-6'>
        <div className='text-center py-12'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2'>
            No Project Selected
          </h2>
          <p className='text-gray-600 dark:text-gray-400'>
            Please select a project to view Bible text data.
          </p>
        </div>
      </div>
    );
  }

  if (!textVersion) {
    return (
      <div className='p-8'>
        <Button
          variant='ghost'
          onClick={() => navigate(`/project/${projectId}/text-versions`)}
          className='mb-4'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Text Versions
        </Button>
        <div className='flex items-center justify-center h-64'>
          <p className='text-gray-500 dark:text-gray-400'>
            Text version not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with back navigation */}
      <div className='px-8 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-700'>
        <Button
          variant='ghost'
          onClick={() => navigate(`/project/${projectId}/text-versions`)}
          className='mb-2 -ml-2'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Text Versions
        </Button>
        <h1 className='text-2xl font-bold text-neutral-900 dark:text-white'>
          {textVersion.name}
        </h1>
        <p className='text-neutral-500 dark:text-neutral-400'>
          Manage Bible text content for this version
        </p>
      </div>

      <BibleTextManager projectId={project.id} projectName={project.name} />
    </div>
  );
};
