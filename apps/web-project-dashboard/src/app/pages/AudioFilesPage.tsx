import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProjectFromRoute } from '../../features/dashboard/hooks/useProjectFromRoute';
import { useAudioVersion } from '../../shared/hooks/query/audio-versions';
import { AudioFileManager } from '../../features/media-files/components';
import { Button } from '../../shared/design-system/components/Button';
import { LoadingSpinner } from '../../shared/design-system/components/LoadingSpinner';

export const AudioFilesPage: React.FC = () => {
  const { projectId, versionId } = useParams<{
    projectId: string;
    versionId: string;
  }>();
  const navigate = useNavigate();
  const { project, isLoading: projectLoading } = useProjectFromRoute();
  const { data: audioVersion, isLoading: versionLoading } = useAudioVersion(
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
      <div className='flex items-center justify-center h-64'>
        <p className='text-gray-500 dark:text-gray-400'>Project not found.</p>
      </div>
    );
  }

  if (!audioVersion) {
    return (
      <div className='p-8'>
        <Button
          variant='ghost'
          onClick={() => navigate(`/project/${projectId}/audio-versions`)}
          className='mb-4'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Audio Versions
        </Button>
        <div className='flex items-center justify-center h-64'>
          <p className='text-gray-500 dark:text-gray-400'>
            Audio version not found.
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
          onClick={() => navigate(`/project/${projectId}/audio-versions`)}
          className='mb-2 -ml-2'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Audio Versions
        </Button>
        <h1 className='text-2xl font-bold text-neutral-900 dark:text-white'>
          {audioVersion.name}
        </h1>
        <p className='text-neutral-500 dark:text-neutral-400'>
          Manage audio files for this version
        </p>
      </div>

      {/* AudioFileManager - it has its own version selector internally */}
      <AudioFileManager projectId={project.id} projectName={project.name} />
    </div>
  );
};
