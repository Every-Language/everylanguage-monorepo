import React, { useMemo } from 'react';
import { useHasJPLanguageData } from '../hooks/useJoshuaProject';
import { useJPLanguageDataCache } from '../hooks/useJPLanguageDataCache';
import {
  UsersIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BookOpenIcon,
  FilmIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { formatPopulationCompact } from '../utils/formatPopulation';

type JPLanguageStatsSectionProps = {
  entityId: string;
};

/**
 * Language Stats Section displays overview statistics for a language
 * from Joshua Project (only for language entities)
 */
export const JPLanguageStatsSection: React.FC<JPLanguageStatsSectionProps> = ({
  entityId,
}) => {
  const hasLanguageData = useHasJPLanguageData(entityId);
  const { languageStats, peopleGroups, isLoading, error } =
    useJPLanguageDataCache(entityId);

  // Calculate population from people groups if not provided by API
  const calculatedPopulation = useMemo(() => {
    // First, try to use API-provided population
    if (languageStats?.PoplPeoples != null) {
      return languageStats.PoplPeoples;
    }

    // Fallback: sum up people group populations
    if (peopleGroups && peopleGroups.length > 0) {
      const total = peopleGroups.reduce((sum, group) => {
        const pop = typeof group.Population === 'number' ? group.Population : 0;
        return sum + pop;
      }, 0);
      return total > 0 ? total : null;
    }

    return null;
  }, [languageStats?.PoplPeoples, peopleGroups]);

  // Don't show section if no external ID mapping exists
  if (!hasLanguageData) {
    return null;
  }

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
            {formatPopulationCompact(calculatedPopulation)}
          </div>
          {calculatedPopulation != null &&
            languageStats?.PoplPeoples == null &&
            peopleGroups &&
            peopleGroups.length > 0 && (
              <div className='text-xs text-secondary-500 dark:text-secondary-400 mt-1'>
                {(() => {
                  const totalGroups =
                    languageStats?.NbrPGICs ?? languageStats?.Peoples ?? 0;
                  const isPartial =
                    totalGroups > 0 && peopleGroups.length < totalGroups;
                  return isPartial
                    ? `(calculated from ${peopleGroups.length} of ${totalGroups} people groups)`
                    : `(calculated from ${peopleGroups.length} people group${peopleGroups.length !== 1 ? 's' : ''})`;
                })()}
              </div>
            )}
        </div>

        <div className='bg-accent-50 dark:bg-accent-950/30 rounded-lg p-3 border border-accent-200 dark:border-accent-800'>
          <GlobeAltIcon className='w-5 h-5 text-accent-600 dark:text-accent-500 mb-1' />
          <div className='text-xs text-accent-600 dark:text-accent-500 mb-1'>
            Countries
          </div>
          <div className='text-lg font-bold text-accent-700 dark:text-accent-400'>
            {languageStats.NbrCountries ?? languageStats.Countries ?? 'N/A'}
          </div>
        </div>

        <div className='bg-primary-50 dark:bg-primary-950/30 rounded-lg p-3 border border-primary-200 dark:border-primary-800'>
          <UserGroupIcon className='w-5 h-5 text-primary-600 dark:text-primary-400 mb-1' />
          <div className='text-xs text-primary-600 dark:text-primary-400 mb-1'>
            People Groups
          </div>
          <div className='text-lg font-bold text-primary-700 dark:text-primary-300'>
            {languageStats.NbrPGICs ?? languageStats.Peoples ?? 'N/A'}
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
            {(() => {
              const hasWholeBible =
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus === 5) ||
                languageStats.BibleYear;
              return (
                <div
                  className={`rounded-lg p-2 border ${
                    hasWholeBible
                      ? 'bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-800'
                      : 'bg-error-50 dark:bg-error-900 border-error-200 dark:border-error-800'
                  }`}>
                  <div
                    className={`text-xs font-medium mb-1 ${
                      hasWholeBible
                        ? 'text-success-600 dark:text-success-300'
                        : 'text-error-600 dark:text-error-300'
                    }`}>
                    Whole Bible
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      hasWholeBible
                        ? 'text-success-700 dark:text-success-200'
                        : 'text-error-700 dark:text-error-200'
                    }`}>
                    {hasWholeBible ? 'Yes' : 'No'}
                  </div>
                  {languageStats.BibleYear && (
                    <div className='text-xs text-success-600 dark:text-success-300 mt-0.5'>
                      {languageStats.BibleYear}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* New Testament */}
            {(() => {
              const hasNewTestament =
                languageStats.NTYear ||
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus >= 4);
              return (
                <div
                  className={`rounded-lg p-2 border ${
                    hasNewTestament
                      ? 'bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-800'
                      : 'bg-error-50 dark:bg-error-900 border-error-200 dark:border-error-800'
                  }`}>
                  <div
                    className={`text-xs font-medium mb-1 ${
                      hasNewTestament
                        ? 'text-success-600 dark:text-success-300'
                        : 'text-error-600 dark:text-error-300'
                    }`}>
                    New Testament
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      hasNewTestament
                        ? 'text-success-700 dark:text-success-200'
                        : 'text-error-700 dark:text-error-200'
                    }`}>
                    {hasNewTestament ? 'Yes' : 'No'}
                  </div>
                  {languageStats.NTYear && (
                    <div className='text-xs text-success-600 dark:text-success-300 mt-0.5'>
                      {languageStats.NTYear}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Portions */}
            {(() => {
              const hasPortions =
                languageStats.PortionsYear ||
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus >= 3);
              return (
                <div
                  className={`rounded-lg p-2 border ${
                    hasPortions
                      ? 'bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-800'
                      : 'bg-error-50 dark:bg-error-900 border-error-200 dark:border-error-800'
                  }`}>
                  <div
                    className={`text-xs font-medium mb-1 ${
                      hasPortions
                        ? 'text-success-600 dark:text-success-300'
                        : 'text-error-600 dark:text-error-300'
                    }`}>
                    Portions
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      hasPortions
                        ? 'text-success-700 dark:text-success-200'
                        : 'text-error-700 dark:text-error-200'
                    }`}>
                    {hasPortions ? 'Yes' : 'No'}
                  </div>
                  {languageStats.PortionsYear && (
                    <div className='text-xs text-success-600 dark:text-success-300 mt-0.5'>
                      {languageStats.PortionsYear}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Media Resources */}
          <div className='grid grid-cols-2 gap-2'>
            {/* Jesus Film */}
            <div
              className={`rounded-lg p-2 border flex items-center gap-2 ${
                languageStats.HasJesusFilm === 'Y' || languageStats.JF === 'Y'
                  ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}>
              <FilmIcon
                className={`w-4 h-4 ${
                  languageStats.HasJesusFilm === 'Y' || languageStats.JF === 'Y'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-400'
                }`}
              />
              <div className='flex-1'>
                <div
                  className={`text-xs font-medium ${
                    languageStats.HasJesusFilm === 'Y' ||
                    languageStats.JF === 'Y'
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-neutral-500'
                  }`}>
                  Jesus Film
                </div>
                <div
                  className={`text-sm font-bold ${
                    languageStats.HasJesusFilm === 'Y' ||
                    languageStats.JF === 'Y'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-neutral-400'
                  }`}>
                  {languageStats.HasJesusFilm === 'Y' ||
                  languageStats.JF === 'Y'
                    ? 'Available'
                    : 'Not Available'}
                </div>
              </div>
            </div>

            {/* Audio Recordings */}
            <div
              className={`rounded-lg p-2 border flex items-center gap-2 ${
                languageStats.HasAudioRecordings === 'Y' ||
                languageStats.AudioRecordings === 'Y'
                  ? 'bg-secondary-50 dark:bg-secondary-950/30 border-secondary-200 dark:border-secondary-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}>
              <SpeakerWaveIcon
                className={`w-4 h-4 ${
                  languageStats.HasAudioRecordings === 'Y' ||
                  languageStats.AudioRecordings === 'Y'
                    ? 'text-secondary-600 dark:text-secondary-400'
                    : 'text-neutral-400'
                }`}
              />
              <div className='flex-1'>
                <div
                  className={`text-xs font-medium ${
                    languageStats.HasAudioRecordings === 'Y' ||
                    languageStats.AudioRecordings === 'Y'
                      ? 'text-secondary-600 dark:text-secondary-400'
                      : 'text-neutral-500'
                  }`}>
                  Audio Recordings
                </div>
                <div
                  className={`text-sm font-bold ${
                    languageStats.HasAudioRecordings === 'Y' ||
                    languageStats.AudioRecordings === 'Y'
                      ? 'text-secondary-700 dark:text-secondary-300'
                      : 'text-neutral-400'
                  }`}>
                  {languageStats.HasAudioRecordings === 'Y' ||
                  languageStats.AudioRecordings === 'Y'
                    ? 'Available'
                    : 'Not Available'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Attribution */}
      <div className='text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
        Data from{' '}
        <a
          href='https://joshuaproject.net'
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-neutral-600'>
          Joshua Project
        </a>
      </div>
    </div>
  );
};
