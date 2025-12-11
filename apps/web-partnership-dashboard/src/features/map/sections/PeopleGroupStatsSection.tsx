import React from 'react';
import { usePeopleGroupStats } from '../hooks/usePeopleGroupStats';
import { useLanguagesPeopleGroupsStats } from '../hooks/useLanguagesPeopleGroupsStats';
import { usePeopleGroupsRegionsStats } from '../hooks/usePeopleGroupsRegionsStats';
import {
  UsersIcon,
  GlobeAltIcon,
  UserGroupIcon,
  FilmIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { formatPopulationCompact } from '../utils/formatPopulation';
import { BibleStatusBadge } from '@/shared/components/BibleStatusBadge';

type PeopleGroupStatsSectionProps = {
  entityId: string;
};

/**
 * People Group Stats Section displays overview statistics for a people group
 * from people_groups_stats
 */
export const PeopleGroupStatsSection: React.FC<
  PeopleGroupStatsSectionProps
> = ({ entityId }) => {
  const { data: stats, isLoading, error } = usePeopleGroupStats(entityId);

  // Get counts from contextual views
  const { data: languagesData } = useLanguagesPeopleGroupsStats({
    peopleGroupId: entityId,
  });
  const { data: regionsData } = usePeopleGroupsRegionsStats({
    peopleGroupId: entityId,
  });

  const languageCount =
    languagesData && languagesData.length > 0
      ? languagesData.length
      : (stats?.language_count ?? null);
  const regionCount =
    regionsData && regionsData.length > 0
      ? regionsData.length
      : (stats?.country_count ?? null);

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <div className='h-4 bg-neutral-200 rounded animate-pulse w-3/4' />
        <div className='grid grid-cols-3 gap-3'>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className='h-20 bg-neutral-200 rounded animate-pulse'
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className='text-sm text-neutral-500'>
        People group statistics not available
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Key Metrics Cards */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='bg-secondary-50 dark:bg-secondary-950/30 rounded-lg p-3 border border-secondary-200 dark:border-secondary-800'>
          <UsersIcon className='w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-1' />
          <div className='text-xs text-secondary-600 dark:text-secondary-400 mb-1'>
            Population
          </div>
          <div className='text-lg font-bold text-secondary-700 dark:text-secondary-300'>
            {formatPopulationCompact(stats.population)}
          </div>
        </div>

        <div className='bg-secondary-50 dark:bg-secondary-950/30 rounded-lg p-3 border border-secondary-200 dark:border-secondary-800'>
          <GlobeAltIcon className='w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-1' />
          <div className='text-xs text-secondary-600 dark:text-secondary-400 mb-1'>
            Regions
          </div>
          <div className='text-lg font-bold text-secondary-700 dark:text-secondary-300'>
            {regionCount ?? 'N/A'}
          </div>
        </div>

        <div className='bg-secondary-50 dark:bg-secondary-950/30 rounded-lg p-3 border border-secondary-200 dark:border-secondary-800'>
          <UserGroupIcon className='w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-1' />
          <div className='text-xs text-secondary-600 dark:text-secondary-400 mb-1'>
            Languages
          </div>
          <div className='text-lg font-bold text-secondary-700 dark:text-secondary-300'>
            {languageCount ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Primary Language Info */}
      {stats.primary_language_name && (
        <div className='bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800'>
          <div className='text-xs text-neutral-600 dark:text-neutral-400 mb-2'>
            Primary Language
          </div>
          <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2'>
            {stats.primary_language_name}
            {stats.primary_language_rol3 && (
              <span className='text-xs text-neutral-500 ml-1'>
                ({stats.primary_language_rol3})
              </span>
            )}
          </div>
          {stats.primary_language_bible_status !== null && (
            <div>
              <BibleStatusBadge
                bibleStatus={stats.primary_language_bible_status}
                size='sm'
              />
            </div>
          )}
        </div>
      )}

      {/* Religious Composition */}
      {(stats.primary_religion ||
        stats.percent_evangelical !== null ||
        stats.percent_christian_pc !== null) && (
        <div className='bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800'>
          <div className='text-xs text-neutral-600 dark:text-neutral-400 mb-2'>
            Religious Composition
          </div>
          <div className='space-y-1 text-sm'>
            {stats.primary_religion && (
              <div className='flex justify-between'>
                <span className='text-neutral-700 dark:text-neutral-300'>
                  Primary Religion
                </span>
                <span className='font-medium'>{stats.primary_religion}</span>
              </div>
            )}
            {stats.percent_evangelical !== null && (
              <div className='flex justify-between'>
                <span className='text-neutral-700 dark:text-neutral-300'>
                  % Evangelical
                </span>
                <span className='font-medium'>
                  {stats.percent_evangelical.toFixed(1)}%
                </span>
              </div>
            )}
            {stats.percent_christian_pc !== null && (
              <div className='flex justify-between'>
                <span className='text-neutral-700 dark:text-neutral-300'>
                  % Christian
                </span>
                <span className='font-medium'>
                  {stats.percent_christian_pc.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Availability */}
      {(stats.has_audio_recordings || stats.has_jesus_film) && (
        <div className='bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800'>
          <div className='text-xs text-neutral-600 dark:text-neutral-400 mb-2'>
            Media Availability
          </div>
          <div className='flex flex-wrap gap-2'>
            {stats.has_audio_recordings && (
              <div className='flex items-center gap-1 text-sm'>
                <SpeakerWaveIcon className='w-4 h-4 text-success-600' />
                <span>Audio Recordings</span>
              </div>
            )}
            {stats.has_jesus_film && (
              <div className='flex items-center gap-1 text-sm'>
                <FilmIcon className='w-4 h-4 text-success-600' />
                <span>Jesus Film</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
