import React from 'react';
import { useLanguageRecordings } from '../hooks/useLanguageRecordings';
import { InlineAudioPlayer } from '../components/InlineAudioPlayer';
import { LocalRecordingPlayer } from '../components/LocalRecordingPlayer';

type LanguageSampleSectionProps = {
  entityId: string;
};

/**
 * Language Sample Section displays a simple audio player with the first available recording
 * Shows only duration, no other metadata
 */
export const LanguageSampleSection: React.FC<LanguageSampleSectionProps> = ({
  entityId,
}) => {
  const {
    data: recordings,
    isLoading,
    error,
  } = useLanguageRecordings(entityId);

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <div className='h-20 bg-neutral-200 rounded animate-pulse' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-sm text-neutral-500'>
        Error loading audio sample:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!recordings?.firstRecording) {
    return (
      <div className='text-sm text-neutral-500'>
        No audio recordings available for this language
      </div>
    );
  }

  const { firstRecording } = recordings;

  // Format duration if available
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className='space-y-2'>
      {/* Audio Player - duration shown in player controls */}
      {firstRecording.source === 'local' && firstRecording.mediaFileId ? (
        <LocalRecordingPlayer
          mediaFileId={firstRecording.mediaFileId}
          title={firstRecording.title}
        />
      ) : firstRecording.url ? (
        <InlineAudioPlayer audioUrl={firstRecording.url} />
      ) : (
        <div className='text-sm text-neutral-500'>Audio not available</div>
      )}
      {/* Duration text (if available) */}
      {firstRecording.duration && (
        <div className='text-xs text-neutral-500 text-center'>
          Duration: {formatDuration(firstRecording.duration)}
        </div>
      )}
    </div>
  );
};
