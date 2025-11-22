import React from 'react';
import { useGRNSetFeed, useHasGRNData, useGRNTrackUrl } from '../hooks/useGRN';
import { useGRNLanguageDataCache } from '../hooks/useGRNLanguageDataCache';
import { InlineAudioPlayer } from '../components/InlineAudioPlayer';

type GRNLanguageSampleSectionProps = {
  entityId: string;
};

/**
 * Language Sample Section displays a playable audio sample from GRN
 * Shows the first available track from the first program
 */
export const GRNLanguageSampleSection: React.FC<
  GRNLanguageSampleSectionProps
> = ({ entityId }) => {
  const hasGRNData = useHasGRNData(entityId);
  const {
    data: languageFeed,
    isLoading,
    error,
  } = useGRNLanguageDataCache(entityId);

  // Get the first program from the language feed
  const firstProgram = languageFeed?.programs?.program?.[0];

  // Fetch the set feed for the first program to get track details
  const {
    data: setFeed,
    isLoading: setLoading,
    error: setError,
  } = useGRNSetFeed(firstProgram?.id ?? null);

  // Get the first track from the set feed
  const firstTrack = setFeed?.tracks?.[0];

  // Get track URL
  const trackUrl = useGRNTrackUrl(
    firstProgram?.id ?? null,
    firstTrack?.id ?? null
  );

  // Debug logging
  React.useEffect(() => {
    if (entityId) {
      console.log('[GRN Language Sample] Entity ID:', entityId);
      console.log('[GRN Language Sample] Has GRN Data:', hasGRNData);
      console.log('[GRN Language Sample] Language Feed:', languageFeed);
      console.log('[GRN Language Sample] Error:', error);
      console.log('[GRN Language Sample] First Program:', firstProgram);
      console.log('[GRN Language Sample] Set Feed:', setFeed);
      console.log('[GRN Language Sample] Set Error:', setError);
      console.log('[GRN Language Sample] First Track:', firstTrack);
      console.log('[GRN Language Sample] Track URL:', trackUrl);
    }
  }, [
    entityId,
    hasGRNData,
    languageFeed,
    error,
    firstProgram,
    setFeed,
    setError,
    firstTrack,
    trackUrl,
  ]);

  // Don't show section if no GRN data exists
  if (!hasGRNData) {
    return null;
  }

  if (isLoading || setLoading) {
    return (
      <div className='space-y-3'>
        <div className='h-4 bg-neutral-200 rounded animate-pulse w-3/4' />
        <div className='h-20 bg-neutral-200 rounded animate-pulse' />
      </div>
    );
  }

  // Show error if API call failed
  if (error) {
    return (
      <div className='text-sm text-neutral-500'>
        Error loading audio sample:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (setError) {
    return (
      <div className='text-sm text-neutral-500'>
        Error loading program details:{' '}
        {setError instanceof Error ? setError.message : 'Unknown error'}
      </div>
    );
  }

  // Check if we have the required data
  if (!languageFeed) {
    return (
      <div className='text-sm text-neutral-500'>
        Language feed not available
      </div>
    );
  }

  if (
    !languageFeed.programs?.program ||
    languageFeed.programs.program.length === 0
  ) {
    return (
      <div className='text-sm text-neutral-500'>
        No programs available for this language
      </div>
    );
  }

  if (!firstProgram) {
    return <div className='text-sm text-neutral-500'>No program found</div>;
  }

  if (!setFeed) {
    return (
      <div className='text-sm text-neutral-500'>
        Program details not available
      </div>
    );
  }

  if (!setFeed.tracks || setFeed.tracks.length === 0) {
    return (
      <div className='text-sm text-neutral-500'>
        No tracks available for this program
      </div>
    );
  }

  if (!firstTrack) {
    return <div className='text-sm text-neutral-500'>No track found</div>;
  }

  if (!trackUrl) {
    return (
      <div className='text-sm text-neutral-500'>Track URL not available</div>
    );
  }

  // Build track title
  const trackTitle =
    firstTrack.title || `${firstProgram.title} - Track ${firstTrack.id}`;
  const programTitle = firstProgram.vernacular_title || firstProgram.title;

  return (
    <div className='space-y-3'>
      {/* Program Info */}
      <div>
        <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
          {programTitle}
        </div>
        {firstProgram.vernacular_title &&
          firstProgram.vernacular_title !== firstProgram.title && (
            <div className='text-xs text-neutral-500'>{firstProgram.title}</div>
          )}
      </div>

      {/* Audio Player */}
      <InlineAudioPlayer audioUrl={trackUrl} title={trackTitle} />

      {/* Track Info */}
      {firstTrack.bible && (
        <div className='text-xs text-neutral-500'>
          <span className='font-medium'>Bible References: </span>
          {firstTrack.bible}
        </div>
      )}

      {/* Attribution */}
      <div className='text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
        Audio from{' '}
        <a
          href='https://globalrecordings.net'
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-neutral-600'
        >
          Global Recordings Network
        </a>
      </div>
    </div>
  );
};
