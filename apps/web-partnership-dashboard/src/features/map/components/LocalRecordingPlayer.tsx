import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { downloadService } from '@/shared/services/downloadService';
import { InlineAudioPlayer } from './InlineAudioPlayer';

type LocalRecordingPlayerProps = {
  mediaFileId: string;
  title?: string;
};

/**
 * Component that fetches audio URL on demand for local recordings
 * Uses the edge function which requires authentication
 */
export const LocalRecordingPlayer: React.FC<LocalRecordingPlayerProps> = ({
  mediaFileId,
  title,
}) => {
  const {
    data: urlData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['local-recording-url', mediaFileId],
    queryFn: async () => {
      try {
        const result = await downloadService.getDownloadUrlsById({
          mediaFileIds: [mediaFileId],
          expirationHours: 24,
        });
        return result.media?.[mediaFileId] || null;
      } catch (err) {
        // If auth fails (logged out user), return null
        console.warn('Failed to fetch audio URL:', err);
        return null;
      }
    },
    enabled: !!mediaFileId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: false, // Don't retry if auth fails
  });

  if (isLoading) {
    return <div className='text-xs text-neutral-500'>Loading audio...</div>;
  }

  if (error || !urlData) {
    return (
      <div className='text-xs text-neutral-500'>
        Audio not available (login required)
      </div>
    );
  }

  return <InlineAudioPlayer audioUrl={urlData} title={title} />;
};
