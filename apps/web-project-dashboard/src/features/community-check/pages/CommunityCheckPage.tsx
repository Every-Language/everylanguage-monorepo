import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CommunityCheckTable } from '../components/CommunityCheckTable';
import { useCurrentProject } from '../../dashboard/hooks/useCurrentProject';
import { useAudioVersion } from '../../../shared/hooks/query/audio-versions';
import { useAudioPlayerStore } from '../../../shared/stores/audioPlayer';
import { DownloadService } from '../../../shared/services/downloadService';
import { Button } from '../../../shared/design-system/components/Button';
import { LoadingSpinner } from '../../../shared/design-system';
import type { MediaFileWithVerseInfo } from '../../../shared/hooks/query/media-files';

export default function CommunityCheckPage() {
  const { projectId, versionId } = useParams<{
    projectId: string;
    versionId: string;
  }>();
  const navigate = useNavigate();
  const { project, isLoading: projectLoading } = useCurrentProject();
  const { data: audioVersion, isLoading: versionLoading } = useAudioVersion(
    versionId || null
  );
  const [selectedFileForChecking, setSelectedFileForChecking] =
    useState<MediaFileWithVerseInfo | null>(null);
  const { playFile } = useAudioPlayerStore();

  const isLoading = projectLoading || versionLoading;

  const handleStartChecking = async (file: MediaFileWithVerseInfo) => {
    setSelectedFileForChecking(file);

    // Open the file in the global audio player
    if (file.id) {
      try {
        const downloadService = new DownloadService();
        const result = await downloadService.getDownloadUrlsById({
          mediaFileIds: [file.id],
        });

        const signedUrl = result.media?.[file.id];
        if (result.success && signedUrl) {
          // Use blob URL approach for Safari compatibility
          try {
            const blobResponse = await fetch(signedUrl);
            const blob = await blobResponse.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Convert the file to the store's expected type - using type assertion since structures are compatible
            playFile(
              file as import('../../../shared/stores/audioPlayer').MediaFileWithVerseInfo,
              blobUrl
            );
          } catch {
            // Fallback to direct URL if blob creation fails
            playFile(
              file as import('../../../shared/stores/audioPlayer').MediaFileWithVerseInfo,
              signedUrl
            );
          }
        } else {
          console.error('Failed to get streaming URL');
        }
      } catch (error) {
        console.error('Error getting audio URL:', error);
      }
    }
  };

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
        <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
          <p className='text-yellow-700 dark:text-yellow-300'>
            Project not found.
          </p>
        </div>
      </div>
    );
  }

  if (!audioVersion) {
    return (
      <div className='p-8'>
        <Button
          variant='ghost'
          onClick={() => navigate(`/project/${projectId}/community-check`)}
          className='mb-4'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Audio Version Selection
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
      <div className='px-6 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-700'>
        <Button
          variant='ghost'
          onClick={() => navigate(`/project/${projectId}/community-check`)}
          className='mb-2 -ml-2'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Audio Versions
        </Button>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
          Community Check: {audioVersion.name}
        </h1>
        <p className='text-gray-600 dark:text-gray-400 mt-1'>
          Review and provide feedback on audio files that are ready for
          community checking.
        </p>
      </div>

      <div className='p-6'>
        <CommunityCheckTable
          onStartChecking={handleStartChecking}
          selectedFileId={selectedFileForChecking?.id}
        />
      </div>
    </div>
  );
}
