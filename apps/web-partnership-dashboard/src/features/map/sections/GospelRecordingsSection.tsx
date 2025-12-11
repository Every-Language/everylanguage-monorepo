import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useLanguageRecordings } from '../hooks/useLanguageRecordings';
import { useGRNSetFeed, useGRNTrackUrl } from '../hooks/useGRN';
import { InlineAudioPlayer } from '../components/InlineAudioPlayer';
import { LocalRecordingPlayer } from '../components/LocalRecordingPlayer';
import type { LanguageRecording } from '../types/stats';
import type { GRNProgram, GRNTrack } from '../services/grnApi';

type GospelRecordingsSectionProps = {
  entityId: string;
};

/**
 * Local Recordings Group Component (grouped by book)
 */
const LocalRecordingsGroup: React.FC<{
  bookName: string;
  recordings: LanguageRecording[];
}> = ({ bookName, recordings }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (recordings.length === 0) return null;

  return (
    <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'>
        <span className='font-medium text-sm'>
          {bookName} ({recordings.length})
        </span>
        {isExpanded ? (
          <ChevronUpIcon className='w-4 h-4 text-neutral-500' />
        ) : (
          <ChevronDownIcon className='w-4 h-4 text-neutral-500' />
        )}
      </button>
      {isExpanded && (
        <div className='px-3 pb-3 space-y-2'>
          {recordings.map(recording => (
            <div
              key={recording.id}
              className='p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg'>
              <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                {recording.title}
              </div>
              {recording.duration && (
                <div className='text-xs text-neutral-500 mb-2'>
                  Duration: {Math.floor(recording.duration / 60)}:
                  {(recording.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
              {recording.source === 'local' && recording.mediaFileId ? (
                <LocalRecordingPlayer
                  mediaFileId={recording.mediaFileId}
                  title={recording.title}
                />
              ) : recording.url ? (
                <InlineAudioPlayer audioUrl={recording.url} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * GRN Program Item Component
 */
const GRNProgramItem: React.FC<{
  program: GRNProgram;
}> = ({ program }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: setFeed, isLoading } = useGRNSetFeed(
    isExpanded ? program.id : null
  );

  return (
    <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left'>
        <div className='flex-1 min-w-0'>
          <div className='font-medium text-sm text-neutral-700 dark:text-neutral-300'>
            {program.vernacular_title || program.title}
          </div>
          {program.vernacular_title &&
            program.vernacular_title !== program.title && (
              <div className='text-xs text-neutral-500 mt-0.5'>
                {program.title}
              </div>
            )}
          <div className='text-xs text-neutral-500 mt-1'>
            {program.tracks} tracks
            {program.duration > 0 ? ` • ${program.duration} min` : ''}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className='w-4 h-4 text-neutral-500 flex-shrink-0 ml-2' />
        ) : (
          <ChevronDownIcon className='w-4 h-4 text-neutral-500 flex-shrink-0 ml-2' />
        )}
      </button>
      {isExpanded && (
        <div className='px-3 pb-3 space-y-3'>
          {isLoading ? (
            <div className='space-y-2'>
              <div className='h-4 bg-neutral-200 rounded animate-pulse w-3/4' />
              <div className='h-20 bg-neutral-200 rounded animate-pulse' />
            </div>
          ) : setFeed ? (
            <>
              {setFeed.tracks && setFeed.tracks.length > 0 && (
                <div className='space-y-3'>
                  <div className='text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide'>
                    Tracks
                  </div>
                  {setFeed.tracks.map(track => (
                    <GRNTrackItem
                      key={track.id}
                      track={track}
                      setId={program.id}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className='text-sm text-neutral-500'>
              Program details not available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * GRN Track Item Component
 */
const GRNTrackItem: React.FC<{
  track: GRNTrack;
  setId: number;
}> = ({ track, setId }) => {
  const trackUrl = useGRNTrackUrl(setId, track.id);

  return (
    <div className='space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg'>
      <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
        {track.title}
      </div>
      {track.bible && (
        <div className='text-xs text-neutral-500'>
          <span className='font-medium'>Bible: </span>
          {track.bible}
        </div>
      )}
      {track.trackFormats?.[0]?.duration && (
        <div className='text-xs text-neutral-500'>
          Duration: {track.trackFormats[0].duration}
        </div>
      )}
      {trackUrl && (
        <InlineAudioPlayer audioUrl={trackUrl} title={track.title} />
      )}
    </div>
  );
};

/**
 * Gospel Recordings Section displays local recordings (grouped by book) and GRN recordings (by program)
 */
export const GospelRecordingsSection: React.FC<
  GospelRecordingsSectionProps
> = ({ entityId }) => {
  const {
    data: recordings,
    isLoading,
    error,
  } = useLanguageRecordings(entityId);

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='h-16 bg-neutral-200 rounded animate-pulse' />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-sm text-neutral-500'>
        Error loading recordings:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!recordings) {
    return (
      <div className='text-sm text-neutral-500'>
        No recordings available for this language
      </div>
    );
  }

  // Group local recordings by book
  const localByBook = recordings.localRecordings.reduce(
    (acc, recording) => {
      const bookName = recording.bookName || 'Unknown Book';
      if (!acc[bookName]) {
        acc[bookName] = [];
      }
      acc[bookName].push(recording);
      return acc;
    },
    {} as Record<string, LanguageRecording[]>
  );

  const hasLocal = recordings.localRecordings.length > 0;
  const hasGRN = recordings.grnPrograms.length > 0;

  if (!hasLocal && !hasGRN) {
    return (
      <div className='text-sm text-neutral-500'>
        No recordings available for this language
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Local Recordings Section */}
      {hasLocal && (
        <div>
          <div className='font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100'>
            EveryLanguage Projects
          </div>
          <div className='space-y-3'>
            {Object.entries(localByBook)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([bookName, bookRecordings]) => (
                <LocalRecordingsGroup
                  key={bookName}
                  bookName={bookName}
                  recordings={bookRecordings}
                />
              ))}
          </div>
        </div>
      )}

      {/* GRN Recordings Section */}
      {hasGRN && (
        <div>
          <div className='font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100'>
            Global Recordings Network
          </div>
          <div className='space-y-3'>
            {recordings.grnPrograms.map(program => (
              <GRNProgramItem key={program.id} program={program} />
            ))}
          </div>
          <div className='text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800 mt-3'>
            Resources from{' '}
            <a
              href='https://globalrecordings.net'
              target='_blank'
              rel='noopener noreferrer'
              className='underline hover:text-neutral-600'>
              Global Recordings Network
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
