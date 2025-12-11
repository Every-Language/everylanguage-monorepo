import React from 'react';
import { Card, CardContent } from './ui/Card';
import { usePeopleGroupStats } from '@/features/map/hooks/usePeopleGroupStats';
import { usePeopleGroupsRegionsStats } from '@/features/map/hooks/usePeopleGroupsRegionsStats';
import { formatPopulationCompact } from '@/features/map/utils/formatPopulation';
import { BibleStatusBadge } from './BibleStatusBadge';

export type PeopleGroupCardProps = {
  peopleGroupId: string;
  // Contextual data (instance-level) - if provided, shows region-specific stats
  contextualRegionId?: string;
  // Display options (all optional, defaults shown)
  showName?: boolean; // default: true
  showPopulation?: boolean; // default: true
  showLanguageCount?: boolean; // default: false
  showCountryCount?: boolean; // default: false
  showPrimaryLanguageBibleStatus?: boolean; // default: true
  showImage?: boolean; // default: false
  showRegionName?: boolean; // default: false
  regionName?: string; // Region name to display
  // Click handler
  onClick?: (peopleGroupId: string) => void;
  // Selection state
  isSelected?: boolean;
  // Styling
  className?: string;
};

export const PeopleGroupCard: React.FC<PeopleGroupCardProps> = ({
  peopleGroupId,
  contextualRegionId,
  showName = true,
  showPopulation = true,
  showLanguageCount = false,
  showCountryCount = false,
  showPrimaryLanguageBibleStatus = true,
  showImage = false,
  showRegionName = false,
  regionName,
  onClick,
  isSelected,
  className = '',
}) => {
  // Fetch total stats from MV
  const { data: totalStats, isLoading: totalLoading } =
    usePeopleGroupStats(peopleGroupId);

  // Fetch contextual stats if region provided
  const { data: contextualStats, isLoading: contextualLoading } =
    usePeopleGroupsRegionsStats({
      peopleGroupId: contextualRegionId ? peopleGroupId : null,
      regionId: contextualRegionId || null,
    });

  const isLoading = totalLoading || contextualLoading;

  // Get contextual stat for this specific region if available
  const contextualStat = contextualStats?.find(
    stat => stat.region_id === contextualRegionId
  );

  // Use contextual stats if available, otherwise fall back to total stats
  const displayName = contextualStat?.name || totalStats?.name || 'Unknown';
  const population =
    contextualStat?.population ?? totalStats?.population ?? null;
  const languageCount =
    contextualStat?.language_count ?? totalStats?.language_count ?? null;
  const countryCount = totalStats?.country_count ?? null; // Not in contextual view
  const primaryLanguageBibleStatus =
    totalStats?.primary_language_bible_status ?? null; // Not in contextual view
  const imageUrl = totalStats?.image_url ?? null; // Not in contextual view

  const handleClick = () => {
    if (onClick) {
      onClick(peopleGroupId);
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
          <div className='flex items-start gap-3'>
            {/* Image */}
            {showImage && imageUrl && (
              <div className='flex-shrink-0'>
                <div className='relative w-16 h-16 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800'>
                  <img
                    src={imageUrl}
                    alt={displayName}
                    className='w-full h-full object-cover'
                    onError={e => {
                      // Hide image on 404 error
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            <div className='flex-1 space-y-2 min-w-0'>
              {/* Name */}
              {showName && (
                <div className='space-y-0.5'>
                  <div
                    className={`text-sm font-medium ${isSelected ? 'text-accent-600' : 'text-neutral-900 dark:text-neutral-100'}`}>
                    {displayName}
                  </div>
                  {showRegionName && regionName && (
                    <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                      {regionName}
                    </div>
                  )}
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

                  {/* Language Count */}
                  {showLanguageCount && languageCount != null && (
                    <div className='text-neutral-600 dark:text-neutral-400'>
                      <span className='font-medium'>{languageCount}</span>{' '}
                      <span className='text-neutral-500'>languages</span>
                    </div>
                  )}

                  {/* Country Count */}
                  {showCountryCount && countryCount != null && (
                    <div className='text-neutral-600 dark:text-neutral-400'>
                      <span className='font-medium'>{countryCount}</span>{' '}
                      <span className='text-neutral-500'>countries</span>
                    </div>
                  )}
                </div>

                {/* Primary Language Bible Status - Right aligned */}
                {showPrimaryLanguageBibleStatus && (
                  <div className='ml-auto'>
                    <BibleStatusBadge
                      bibleStatus={primaryLanguageBibleStatus}
                      size='sm'
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
};
