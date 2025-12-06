import React from 'react';
import { Card, CardContent } from './ui/Card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { usePeopleGroupStatsContextual } from '@/features/map/hooks/usePeopleGroupStatsContextual';
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

import type { PeopleGroupStats } from '@/features/map/types/databaseViews';

/**
 * Hook to fetch total people group stats from mv_people_group_stats
 */
function usePeopleGroupStats(peopleGroupId: string | null) {
  return useQuery({
    queryKey: ['people-group-stats', peopleGroupId],
    queryFn: async () => {
      if (!peopleGroupId) return null;

      const { data, error } = await supabase
        .from('mv_people_group_stats')
        .select(
          'people_group_id, name, population, language_count, country_count, primary_language_bible_status, image_url'
        )
        .eq('people_group_id', peopleGroupId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 404 errors

      if (error) {
        // If no data found, return null (not an error)
        // PGRST116 = no rows returned, PGRST301 = resource not found
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          return null;
        }
        throw error;
      }

      return data as Pick<
        PeopleGroupStats,
        | 'people_group_id'
        | 'name'
        | 'population'
        | 'language_count'
        | 'country_count'
        | 'primary_language_bible_status'
        | 'image_url'
      > | null;
    },
    enabled: !!peopleGroupId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 404s
  });
}

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
    usePeopleGroupStatsContextual(
      contextualRegionId ? peopleGroupId : null,
      contextualRegionId || null
    );

  const isLoading = totalLoading || contextualLoading;

  // Use contextual stats if available, otherwise fall back to total stats
  const displayName =
    contextualStats?.peop_name_in_country ||
    contextualStats?.people_group_name ||
    totalStats?.name ||
    'Unknown';
  const population =
    contextualStats?.instance_population ??
    contextualStats?.population ??
    totalStats?.population;
  const languageCount =
    contextualStats?.language_count ?? totalStats?.language_count;
  const countryCount =
    contextualStats?.country_count ?? totalStats?.country_count;
  const primaryLanguageBibleStatus =
    contextualStats?.primary_language_bible_status ??
    totalStats?.primary_language_bible_status;
  const imageUrl = contextualStats?.image_url ?? totalStats?.image_url;

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
