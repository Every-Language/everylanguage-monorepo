import React from 'react';
import { Card, CardContent } from './ui/Card';
import { useJPLanguageDataCache } from '@/features/map/hooks/useJPLanguageDataCache';
import { useLanguageStatsContextual } from '@/features/map/hooks/useLanguageStatsContextual';
import { formatPopulationCompact } from '@/features/map/utils/formatPopulation';
import { BibleStatusBadge } from './BibleStatusBadge';
import { Check, X } from 'lucide-react';

export type LanguageCardProps = {
  languageEntityId: string;
  // Contextual data (instance-level) - if provided, shows region-specific stats
  contextualRegionId?: string;
  // Display options (all optional, defaults shown)
  showName?: boolean; // default: true
  showPopulation?: boolean; // default: true
  showCountryCount?: boolean; // default: false
  showPeopleGroupCount?: boolean; // default: false
  showBibleStatus?: boolean; // default: true
  showAudioRecordings?: boolean; // default: false
  // Click handler
  onClick?: (languageEntityId: string) => void;
  // Selection state
  isSelected?: boolean;
  // Styling
  className?: string;
};

export const LanguageCard: React.FC<LanguageCardProps> = ({
  languageEntityId,
  contextualRegionId,
  showName = true,
  showPopulation = true,
  showCountryCount = false,
  showPeopleGroupCount = false,
  showBibleStatus = true,
  showAudioRecordings = false,
  onClick,
  isSelected,
  className = '',
}) => {
  // Fetch total stats from MV
  const { languageStats, isLoading: totalLoading } =
    useJPLanguageDataCache(languageEntityId);

  // Fetch contextual stats if region provided
  const { data: contextualStats, isLoading: contextualLoading } =
    useLanguageStatsContextual(
      contextualRegionId ? languageEntityId : null,
      contextualRegionId || null
    );

  const isLoading = totalLoading || contextualLoading;

  // Use contextual stats if available, otherwise fall back to total stats
  const languageName =
    contextualStats?.language_name || languageStats?.Language || 'Unknown';
  const population = contextualStats?.population ?? languageStats?.PoplPeoples;
  const countryCount =
    contextualStats?.country_count ?? languageStats?.Countries;
  const peopleGroupCount =
    contextualStats?.people_group_count ?? languageStats?.Peoples;
  const bibleStatusRaw =
    contextualStats?.bible_status ?? languageStats?.BibleStatus;
  // Convert bibleStatus to number if it's a string
  const bibleStatus =
    typeof bibleStatusRaw === 'number'
      ? bibleStatusRaw
      : typeof bibleStatusRaw === 'string'
        ? parseInt(bibleStatusRaw, 10) || null
        : (bibleStatusRaw ?? null);
  const hasAudioRecordings =
    contextualStats?.has_audio_recordings ??
    (languageStats?.AudioRecordings === 'Y' ||
      languageStats?.HasJesusFilm === 'Y');

  const handleClick = () => {
    if (onClick) {
      onClick(languageEntityId);
    }
  };

  if (isLoading) {
    return (
      <div className='w-full'>
        <Card
          padding='sm'
          variant='ghost'
          className={`border border-neutral-200 dark:border-neutral-800 ${className}`}
        >
          <CardContent>
            <div className='h-12 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse' />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      className={`w-full text-left ${className}`}
    >
      <Card
        padding='sm'
        variant='ghost'
        className={`border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 ${isSelected ? 'ring-2 ring-accent-600 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''}`}
      >
        <CardContent>
          <div className='space-y-2'>
            {/* Name */}
            {showName && (
              <div
                className={`text-sm font-medium ${isSelected ? 'text-accent-600' : 'text-neutral-900 dark:text-neutral-100'}`}
              >
                {languageName}
              </div>
            )}

            {/* Stats Grid */}
            <div className='flex flex-wrap items-center gap-3 text-xs'>
              {/* Population */}
              {showPopulation && population != null && (
                <div className='text-neutral-600 dark:text-neutral-400'>
                  <span className='font-medium'>
                    {formatPopulationCompact(population)}
                  </span>{' '}
                  <span className='text-neutral-500'>people</span>
                </div>
              )}

              {/* Country Count */}
              {showCountryCount && countryCount != null && (
                <div className='text-neutral-600 dark:text-neutral-400'>
                  <span className='font-medium'>{countryCount}</span>{' '}
                  <span className='text-neutral-500'>countries</span>
                </div>
              )}

              {/* People Group Count */}
              {showPeopleGroupCount && peopleGroupCount != null && (
                <div className='text-neutral-600 dark:text-neutral-400'>
                  <span className='font-medium'>{peopleGroupCount}</span>{' '}
                  <span className='text-neutral-500'>people groups</span>
                </div>
              )}

              {/* Bible Status */}
              {showBibleStatus && (
                <div>
                  <BibleStatusBadge bibleStatus={bibleStatus} size='sm' />
                </div>
              )}

              {/* Audio Recordings */}
              {showAudioRecordings && (
                <div className='flex items-center gap-1 text-neutral-600 dark:text-neutral-400'>
                  {hasAudioRecordings ? (
                    <>
                      <Check className='w-3 h-3 text-success-600' />
                      <span>Audio</span>
                    </>
                  ) : (
                    <>
                      <X className='w-3 h-3 text-neutral-400' />
                      <span className='text-neutral-500'>No audio</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
};
