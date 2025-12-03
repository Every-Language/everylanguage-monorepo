import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useGRNSetFeed, useHasGRNData, useGRNTrackUrl } from '../hooks/useGRN';
import { useGRNLanguageDataCache } from '../hooks/useGRNLanguageDataCache';
import { InlineAudioPlayer } from '../components/InlineAudioPlayer';
import { YouTubeEmbed } from '../components/YouTubeEmbed';
import type { GRNProgram, GRNTrack } from '../services/grnApi';

type GRNGospelResourcesSectionProps = {
  entityId: string;
};

/**
 * Program Type Names mapping
 * Based on GRN programType numbers
 */
const PROGRAM_TYPE_NAMES: Record<number, string> = {
  1: 'LLL 1: Beginning with GOD',
  2: 'LLL 2: Mighty Men of GOD',
  3: 'LLL 3: Victory through GOD',
  4: 'LLL 4: Servants of GOD',
  5: 'LLL 5: On Trial for GOD',
  6: 'LLL 6: JESUS - Teacher & Healer',
  7: 'LLL 7: JESUS - Lord & Saviour',
  8: 'LLL 8: Acts of the HOLY SPIRIT',
  10: 'Good News',
  12: 'Words of Life',
  17: 'Words of Life (M)',
  24: 'The Living Christ',
  // Add more as needed
};

/**
 * Gets program type name
 */
function getProgramTypeName(programType: number): string {
  return PROGRAM_TYPE_NAMES[programType] || `Program Type ${programType}`;
}

/**
 * Program Group Component
 */
const ProgramGroup: React.FC<{
  programType: number;
  programs: GRNProgram[];
}> = ({ programType, programs }) => {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(
    new Set()
  );
  const [expandedType, setExpandedType] = useState(true);

  // Ensure programs is always an array
  const safePrograms = Array.isArray(programs) ? programs : [];

  const toggleProgram = (programId: number) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedPrograms(newExpanded);
  };

  // Don't render if no programs
  if (safePrograms.length === 0) {
    return null;
  }

  return (
    <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'>
      <button
        onClick={() => setExpandedType(!expandedType)}
        className='w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
      >
        <span className='font-medium text-sm'>
          {getProgramTypeName(programType)} ({safePrograms.length})
        </span>
        {expandedType ? (
          <ChevronUpIcon className='w-4 h-4 text-neutral-500' />
        ) : (
          <ChevronDownIcon className='w-4 h-4 text-neutral-500' />
        )}
      </button>
      {expandedType && (
        <div className='px-3 pb-3 space-y-3'>
          {safePrograms.map(program => (
            <ProgramItem
              key={program.id}
              program={program}
              isExpanded={expandedPrograms.has(program.id)}
              onToggle={() => toggleProgram(program.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Program Item Component
 */
const ProgramItem: React.FC<{
  program: GRNProgram;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ program, isExpanded, onToggle }) => {
  const { data: setFeed, isLoading } = useGRNSetFeed(
    isExpanded ? program.id : null
  );

  return (
    <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'>
      <button
        onClick={onToggle}
        className='w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left'
      >
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
              {/* YouTube Video */}
              {setFeed.youTube && (
                <YouTubeEmbed
                  videoId={setFeed.youTube}
                  title={`${setFeed.vernacular_title || setFeed.title} - Video`}
                  useThumbnailOnly={true}
                />
              )}

              {/* Tracks */}
              {setFeed.tracks && setFeed.tracks.length > 0 && (
                <div className='space-y-3'>
                  <div className='text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wide'>
                    Tracks
                  </div>
                  {setFeed.tracks.map(track => (
                    <TrackItem
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
 * Track Item Component
 */
const TrackItem: React.FC<{
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
      {trackUrl && (
        <InlineAudioPlayer audioUrl={trackUrl} title={track.title} />
      )}
    </div>
  );
};

/**
 * Gospel Resources Section displays all GRN programs grouped by type
 * Shows tracks, YouTube videos, and Bible references
 */
export const GRNGospelResourcesSection: React.FC<
  GRNGospelResourcesSectionProps
> = ({ entityId }) => {
  const hasGRNData = useHasGRNData(entityId);
  const {
    data: languageFeed,
    isLoading,
    error,
  } = useGRNLanguageDataCache(entityId);

  // Don't show section if no GRN data exists
  if (!hasGRNData) {
    return null;
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='h-16 bg-neutral-200 rounded animate-pulse' />
        ))}
      </div>
    );
  }

  // Show error if API call failed
  if (error) {
    return (
      <div className='text-sm text-neutral-500'>
        Error loading gospel resources:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

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

  // Group programs by type
  const programsByType = languageFeed.programs.program.reduce(
    (acc, program) => {
      // Skip programs with invalid programType
      const type = program.programType;
      if (type == null || typeof type !== 'number') {
        return acc;
      }
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(program);
      return acc;
    },
    {} as Record<number, GRNProgram[]>
  );

  // Sort program types and filter out any undefined entries
  const sortedTypes = Object.keys(programsByType)
    .map(Number)
    .filter(
      type =>
        programsByType[type] &&
        Array.isArray(programsByType[type]) &&
        programsByType[type].length > 0
    )
    .sort((a, b) => a - b);

  return (
    <div className='space-y-3'>
      {/* Program Groups */}
      {sortedTypes.map(programType => {
        const programs = programsByType[programType];
        // Double-check that programs exists and is an array before rendering
        if (!programs || !Array.isArray(programs) || programs.length === 0) {
          return null;
        }
        return (
          <ProgramGroup
            key={programType}
            programType={programType}
            programs={programs}
          />
        );
      })}

      {/* Attribution */}
      <div className='text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
        Resources from{' '}
        <a
          href='https://globalrecordings.net'
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-neutral-600'
        >
          Global Recordings Network
        </a>{' '}
        •{' '}
        <a
          href={`https://globalrecordings.net/en/language/${languageFeed.id}`}
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-neutral-600'
        >
          Download all resources
        </a>
      </div>
    </div>
  );
};
