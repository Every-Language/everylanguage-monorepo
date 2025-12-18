import React from 'react';
import { Card, CardContent } from './ui/Card';
import { useLanguageStats } from '@/features/map/hooks/useLanguageStats';
import { useLanguagesRegionsStats } from '@/features/map/hooks/useLanguagesRegionsStats';
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
  const { data: languageStats, isLoading: totalLoading } =
    useLanguageStats(languageEntityId);

  // Fetch contextual stats if region provided
  const { data: contextualStats, isLoading: contextualLoading } =
    useLanguagesRegionsStats({
      languageEntityId: contextualRegionId ? languageEntityId : null,
      regionId: contextualRegionId || null,
    });

  const isLoading = totalLoading || contextualLoading;

  // Get contextual stat for this specific region if available
  const contextualStat = contextualStats?.find(
    stat => stat.region_id === contextualRegionId
  );

  // Use contextual stats if available, otherwise fall back to total stats
  const languageName = languageStats?.language_name || 'Unknown';
  const population =
    contextualStat?.population ?? languageStats?.population ?? null;
  const countryCount = languageStats?.country_count ?? null;
  const peopleGroupCount =
    contextualStat?.people_group_count ??
    languageStats?.people_group_count ??
    null;
  const bibleStatus =
    contextualStat?.bible_status ?? languageStats?.bible_status ?? null;
  const hasAudioRecordings = languageStats?.has_audio_recordings ?? false;

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
          className={`border border-neutral-200 dark:border-neutral-800 ${className}`}>
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
      className={`w-full text-left ${className}`}>
      <Card
        padding='sm'
        variant='ghost'
        className={`border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 ${isSelected ? 'ring-2 ring-accent-600 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900' : ''}`}>
        <CardContent>
          <div className='space-y-2'>
            {/* Name */}
            {showName && (
              <div
                className={`text-sm font-medium ${isSelected ? 'text-accent-600' : 'text-neutral-900 dark:text-neutral-100'}`}>
                {languageName}
              </div>
            )}

            {/* Stats Grid */}
            <div className='flex flex-wrap items-center justify-between gap-3 text-xs'>
              <div className='flex flex-wrap items-center gap-3'>
                {/* Population */}
                {showPopulation && population != null && population > 0 && (
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

              {/* Bible Status - Right aligned */}
              {showBibleStatus && (
                <div className='ml-auto'>
                  <BibleStatusBadge bibleStatus={bibleStatus} size='sm' />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
};
