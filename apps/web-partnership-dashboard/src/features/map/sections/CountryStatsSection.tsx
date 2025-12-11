import React from 'react';
import { useRegionStats } from '../hooks/useRegionStats';
import { useLanguagesRegionsStats } from '../hooks/useLanguagesRegionsStats';
import { usePeopleGroupsRegionsStats } from '../hooks/usePeopleGroupsRegionsStats';
import {
  UsersIcon,
  GlobeAltIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline';
import { formatPopulationCompact } from '../utils/formatPopulation';

type CountryStatsSectionProps = {
  entityId: string;
};

/**
 * Country Stats Section displays overview statistics for a region (country)
 * from region_stats MV
 */
export const CountryStatsSection: React.FC<CountryStatsSectionProps> = ({
  entityId,
}) => {
  const { data: regionStats, isLoading, error } = useRegionStats(entityId);

  // Get counts from contextual views
  const { data: languagesData } = useLanguagesRegionsStats({
    regionId: entityId,
  });
  const { data: peopleGroupsData } = usePeopleGroupsRegionsStats({
    regionId: entityId,
  });

  const languageCount =
    languagesData && languagesData.length > 0
      ? languagesData.length
      : (regionStats?.language_count ?? null);
  const peopleGroupCount =
    peopleGroupsData && peopleGroupsData.length > 0
      ? peopleGroupsData.length
      : (regionStats?.people_group_count ?? null);

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

  if (error || !regionStats) {
    return (
      <div className='text-sm text-neutral-500'>
        Country statistics not available
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
            {formatPopulationCompact(regionStats.population)}
          </div>
        </div>

        <div className='bg-accent-50 dark:bg-accent-950/30 rounded-lg p-3 border border-accent-200 dark:border-accent-800'>
          <GlobeAltIcon className='w-5 h-5 text-accent-600 dark:text-accent-500 mb-1' />
          <div className='text-xs text-accent-600 dark:text-accent-500 mb-1'>
            People Groups
          </div>
          <div className='text-lg font-bold text-accent-700 dark:text-accent-400'>
            {peopleGroupCount ?? 'N/A'}
          </div>
        </div>

        <div className='bg-primary-50 dark:bg-primary-950/30 rounded-lg p-3 border border-primary-200 dark:border-primary-800'>
          <LanguageIcon className='w-5 h-5 text-primary-600 dark:text-primary-400 mb-1' />
          <div className='text-xs text-primary-600 dark:text-primary-400 mb-1'>
            Languages
          </div>
          <div className='text-lg font-bold text-primary-700 dark:text-primary-300'>
            {languageCount ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Bible Status Breakdown */}
      {regionStats.languages_no_scripture != null ||
      regionStats.languages_portions != null ||
      regionStats.languages_new_testament != null ||
      regionStats.languages_full_bible != null ? (
        <div>
          <div className='font-semibold text-sm mb-3 text-neutral-900 dark:text-neutral-100'>
            Bible Translation Status Breakdown
          </div>
          <div className='grid grid-cols-4 gap-2'>
            {regionStats.languages_no_scripture != null && (
              <div className='text-center p-2 bg-error-50 dark:bg-error-900/30 rounded'>
                <div className='font-medium text-error-700 dark:text-error-300 text-lg'>
                  {regionStats.languages_no_scripture}
                </div>
                <div className='text-error-600 dark:text-error-400 text-xs mt-0.5'>
                  No Scripture
                </div>
              </div>
            )}
            {regionStats.languages_portions != null && (
              <div className='text-center p-2 bg-[#eb6a38]/10 dark:bg-[#eb6a38]/20 rounded'>
                <div className='font-medium text-[#eb6a38] text-lg'>
                  {regionStats.languages_portions}
                </div>
                <div className='text-[#eb6a38]/80 text-xs mt-0.5'>Portions</div>
              </div>
            )}
            {regionStats.languages_new_testament != null && (
              <div className='text-center p-2 bg-warning-50 dark:bg-warning-900/30 rounded'>
                <div className='font-medium text-warning-700 dark:text-warning-300 text-lg'>
                  {regionStats.languages_new_testament}
                </div>
                <div className='text-warning-600 dark:text-warning-400 text-xs mt-0.5'>
                  New Testament
                </div>
              </div>
            )}
            {regionStats.languages_full_bible != null && (
              <div className='text-center p-2 bg-success-50 dark:bg-success-900/30 rounded'>
                <div className='font-medium text-success-700 dark:text-success-300 text-lg'>
                  {regionStats.languages_full_bible}
                </div>
                <div className='text-success-600 dark:text-success-400 text-xs mt-0.5'>
                  Whole Bible
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
