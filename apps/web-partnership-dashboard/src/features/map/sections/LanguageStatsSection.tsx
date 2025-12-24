import React from 'react';
import { useLanguageStats } from '../hooks/useLanguageStats';
import { useLanguagesRegionsStats } from '../hooks/useLanguagesRegionsStats';
import { useLanguagesPeopleGroupsStats } from '../hooks/useLanguagesPeopleGroupsStats';
import {
  UsersIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BookOpenIcon,
  FilmIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { formatPopulationCompact } from '../utils/formatPopulation';

type LanguageStatsSectionProps = {
  entityId: string;
};

/**
 * Language Stats Section displays overview statistics for a language
 * from language_stats MV
 */
export const LanguageStatsSection: React.FC<LanguageStatsSectionProps> = ({
  entityId,
}) => {
  const { data: languageStats, isLoading, error } = useLanguageStats(entityId);

  // Get counts from contextual views
  const { data: regionsStats } = useLanguagesRegionsStats({
    languageEntityId: entityId,
  });
  const { data: peopleGroupsStats } = useLanguagesPeopleGroupsStats({
    languageEntityId: entityId,
  });

  const countryCount =
    regionsStats && regionsStats.length > 0
      ? regionsStats.length
      : (languageStats?.country_count ?? null);
  const peopleGroupCount =
    peopleGroupsStats && peopleGroupsStats.length > 0
      ? peopleGroupsStats.length
      : (languageStats?.people_group_count ?? null);

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

  if (error || !languageStats) {
    return (
      <div className='text-sm text-neutral-500'>
        Language statistics not available
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
            {formatPopulationCompact(languageStats.population)}
          </div>
        </div>

        <div className='bg-accent-50 dark:bg-accent-950/30 rounded-lg p-3 border border-accent-200 dark:border-accent-800'>
          <GlobeAltIcon className='w-5 h-5 text-accent-600 dark:text-accent-500 mb-1' />
          <div className='text-xs text-accent-600 dark:text-accent-500 mb-1'>
            Countries
          </div>
          <div className='text-lg font-bold text-accent-700 dark:text-accent-400'>
            {countryCount ?? 'N/A'}
          </div>
        </div>

        <div className='bg-primary-50 dark:bg-primary-950/30 rounded-lg p-3 border border-primary-200 dark:border-primary-800'>
          <UserGroupIcon className='w-5 h-5 text-primary-600 dark:text-primary-400 mb-1' />
          <div className='text-xs text-primary-600 dark:text-primary-400 mb-1'>
            People Groups
          </div>
          <div className='text-lg font-bold text-primary-700 dark:text-primary-300'>
            {peopleGroupCount ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Bible Translation Status */}
      <div>
        <div className='font-semibold text-sm mb-3 flex items-center gap-2 text-neutral-900 dark:text-neutral-100'>
          <BookOpenIcon className='w-4 h-4' />
          Bible Translation Status
        </div>
        <div className='space-y-3'>
          {/* Scripture Status Cards */}
          <div className='grid grid-cols-3 gap-2'>
            {/* Whole Bible */}
            <div
              className={`rounded-lg p-2 border ${
                languageStats.has_whole_bible
                  ? 'bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-800'
                  : 'bg-error-50 dark:bg-error-900 border-error-200 dark:border-error-800'
              }`}>
              <div
                className={`text-xs font-medium mb-1 ${
                  languageStats.has_whole_bible
                    ? 'text-success-600 dark:text-success-300'
                    : 'text-error-600 dark:text-error-300'
                }`}>
                Whole Bible
              </div>
              <div
                className={`text-sm font-bold ${
                  languageStats.has_whole_bible
                    ? 'text-success-700 dark:text-success-200'
                    : 'text-error-700 dark:text-error-200'
                }`}>
                {languageStats.has_whole_bible ? 'Yes' : 'No'}
              </div>
              {languageStats.bible_year && (
                <div className='text-xs text-success-600 dark:text-success-300 mt-0.5'>
                  {languageStats.bible_year}
                </div>
              )}
            </div>

            {/* New Testament */}
            <div
              className={`rounded-lg p-2 border ${
                languageStats.has_new_testament
                  ? 'bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-800'
                  : 'bg-error-50 dark:bg-error-900 border-error-200 dark:border-error-800'
              }`}>
              <div
                className={`text-xs font-medium mb-1 ${
                  languageStats.has_new_testament
                    ? 'text-success-600 dark:text-success-300'
                    : 'text-error-600 dark:text-error-300'
                }`}>
                New Testament
              </div>
              <div
                className={`text-sm font-bold ${
                  languageStats.has_new_testament
                    ? 'text-success-700 dark:text-success-200'
                    : 'text-error-700 dark:text-error-200'
                }`}>
                {languageStats.has_new_testament ? 'Yes' : 'No'}
              </div>
              {languageStats.nt_year && (
                <div className='text-xs text-success-600 dark:text-success-300 mt-0.5'>
                  {languageStats.nt_year}
                </div>
              )}
            </div>

            {/* Portions */}
            <div
              className={`rounded-lg p-2 border ${
                languageStats.has_portions
                  ? 'bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-800'
                  : 'bg-error-50 dark:bg-error-900 border-error-200 dark:border-error-800'
              }`}>
              <div
                className={`text-xs font-medium mb-1 ${
                  languageStats.has_portions
                    ? 'text-success-600 dark:text-success-300'
                    : 'text-error-600 dark:text-error-300'
                }`}>
                Portions
              </div>
              <div
                className={`text-sm font-bold ${
                  languageStats.has_portions
                    ? 'text-success-700 dark:text-success-200'
                    : 'text-error-700 dark:text-error-200'
                }`}>
                {languageStats.has_portions ? 'Yes' : 'No'}
              </div>
              {languageStats.portions_year && (
                <div className='text-xs text-success-600 dark:text-success-300 mt-0.5'>
                  {languageStats.portions_year}
                </div>
              )}
            </div>
          </div>

          {/* Media Resources */}
          <div className='grid grid-cols-2 gap-2'>
            {/* Jesus Film */}
            <div
              className={`rounded-lg p-2 border flex items-center gap-2 ${
                languageStats.has_jesus_film
                  ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}>
              <FilmIcon
                className={`w-4 h-4 ${
                  languageStats.has_jesus_film
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-400'
                }`}
              />
              <div className='flex-1'>
                <div
                  className={`text-xs font-medium ${
                    languageStats.has_jesus_film
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-neutral-500'
                  }`}>
                  Jesus Film
                </div>
                <div
                  className={`text-sm font-bold ${
                    languageStats.has_jesus_film
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-neutral-400'
                  }`}>
                  {languageStats.has_jesus_film ? 'Available' : 'Not Available'}
                </div>
              </div>
            </div>

            {/* Audio Recordings */}
            <div
              className={`rounded-lg p-2 border flex items-center gap-2 ${
                languageStats.has_audio_recordings
                  ? 'bg-secondary-50 dark:bg-secondary-950/30 border-secondary-200 dark:border-secondary-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}>
              <SpeakerWaveIcon
                className={`w-4 h-4 ${
                  languageStats.has_audio_recordings
                    ? 'text-secondary-600 dark:text-secondary-400'
                    : 'text-neutral-400'
                }`}
              />
              <div className='flex-1'>
                <div
                  className={`text-xs font-medium ${
                    languageStats.has_audio_recordings
                      ? 'text-secondary-600 dark:text-secondary-400'
                      : 'text-neutral-500'
                  }`}>
                  Audio Recordings
                </div>
                <div
                  className={`text-sm font-bold ${
                    languageStats.has_audio_recordings
                      ? 'text-secondary-700 dark:text-secondary-300'
                      : 'text-neutral-400'
                  }`}>
                  {languageStats.has_audio_recordings
                    ? 'Available'
                    : 'Not Available'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
