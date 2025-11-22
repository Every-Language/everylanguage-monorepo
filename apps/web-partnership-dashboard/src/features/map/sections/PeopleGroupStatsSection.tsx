import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  UsersIcon,
  GlobeAltIcon,
  UserGroupIcon,
  FilmIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { formatPopulationCompact } from '../utils/formatPopulation';
import { BibleStatusBadge } from '@/shared/components/BibleStatusBadge';
import type { PeopleGroupStats } from '../types/databaseViews';

type PeopleGroupStatsSectionProps = {
  entityId: string;
};

/**
 * People Group Stats Section displays overview statistics for a people group
 * from mv_people_group_stats
 */
export const PeopleGroupStatsSection: React.FC<
  PeopleGroupStatsSectionProps
> = ({ entityId }) => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['people-group-stats', entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_people_group_stats')
        .select('*')
        .eq('people_group_id', entityId)
        .single();

      if (error) {
        // If no data found, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as PeopleGroupStats;
    },
    enabled: !!entityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

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
            Countries
          </div>
          <div className='text-lg font-bold text-secondary-700 dark:text-secondary-300'>
            {stats.country_count ?? 'N/A'}
          </div>
        </div>

        <div className='bg-secondary-50 dark:bg-secondary-950/30 rounded-lg p-3 border border-secondary-200 dark:border-secondary-800'>
          <UserGroupIcon className='w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-1' />
          <div className='text-xs text-secondary-600 dark:text-secondary-400 mb-1'>
            Languages
          </div>
          <div className='text-lg font-bold text-secondary-700 dark:text-secondary-300'>
            {stats.language_count ?? 'N/A'}
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

      {/* Status Indicators */}
      <div className='grid grid-cols-2 gap-3'>
        {stats.jpscale !== null && (
          <div className='bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800'>
            <div className='text-xs text-neutral-600 dark:text-neutral-400 mb-1'>
              JPScale
            </div>
            <div className='flex items-center gap-2'>
              <span
                className={`${
                  stats.jpscale === 1
                    ? 'bg-error-600'
                    : stats.jpscale === 2
                      ? 'bg-[#eb6a38]'
                      : stats.jpscale === 3
                        ? 'bg-warning-500'
                        : stats.jpscale === 4 || stats.jpscale === 5
                          ? 'bg-success-600'
                          : 'bg-neutral-500'
                } text-white text-sm font-bold px-2 py-1 rounded`}
              >
                {stats.jpscale}
              </span>
            </div>
          </div>
        )}

        {(stats.least_reached || stats.frontier) && (
          <div className='bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800'>
            <div className='text-xs text-neutral-600 dark:text-neutral-400 mb-1'>
              Status
            </div>
            <div className='flex flex-wrap gap-1'>
              {stats.least_reached && (
                <span className='bg-error-600 text-white text-xs font-semibold px-2 py-0.5 rounded'>
                  Least Reached
                </span>
              )}
              {stats.frontier && (
                <span className='bg-[#eb6a38] text-white text-xs font-semibold px-2 py-0.5 rounded'>
                  Frontier
                </span>
              )}
            </div>
          </div>
        )}
      </div>

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

      {/* Bible Translation Status */}
      {stats.bible_status !== null && (
        <div className='bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3 border border-neutral-200 dark:border-neutral-800'>
          <div className='text-xs text-neutral-600 dark:text-neutral-400 mb-2'>
            Bible Translation Status
          </div>
          <div className='mb-2'>
            <BibleStatusBadge bibleStatus={stats.bible_status} size='sm' />
          </div>
          {(stats.bible_year || stats.nt_year || stats.portions_year) && (
            <div className='space-y-1 text-xs text-neutral-600 dark:text-neutral-400'>
              {stats.bible_year && <div>Full Bible: {stats.bible_year}</div>}
              {stats.nt_year && <div>New Testament: {stats.nt_year}</div>}
              {stats.portions_year && (
                <div>Portions: {stats.portions_year}</div>
              )}
            </div>
          )}
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
