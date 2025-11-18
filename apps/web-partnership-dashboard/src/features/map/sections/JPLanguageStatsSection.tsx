import React, { useMemo } from 'react';
import {
  useJPLanguageData,
  useHasJPLanguageData,
} from '../hooks/useJoshuaProject';
import {
  UsersIcon,
  GlobeAltIcon,
  UserGroupIcon,
  BookOpenIcon,
  FilmIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

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
    useJPLanguageData(entityId);

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
            {calculatedPopulation != null
              ? `${(calculatedPopulation / 1000000).toFixed(1)}M`
              : 'N/A'}
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

      {/* Hub Country */}
      {languageStats.HubCountry && (
        <div>
          <div className='font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100'>
            Hub Country
          </div>
          <div className='text-sm text-neutral-700 dark:text-neutral-300'>
            <span className='font-medium'>{languageStats.HubCountry}</span>
            {languageStats.HubCountryISO && (
              <span className='text-neutral-500 dark:text-neutral-400 ml-2'>
                ({languageStats.HubCountryISO})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Unreached Populations */}
      {((languageStats.PoplPeoplesLR != null &&
        languageStats.PoplPeoplesLR > 0) ||
        (languageStats.PoplPeoplesFPG != null &&
          languageStats.PoplPeoplesFPG > 0)) && (
        <div>
          <div className='font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100'>
            Unreached Populations
          </div>
          <div className='space-y-2'>
            {languageStats.PoplPeoplesLR != null &&
              languageStats.PoplPeoplesLR > 0 && (
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                    Least Reached
                  </span>
                  <div className='text-right'>
                    <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                      {(languageStats.PoplPeoplesLR / 1000000).toFixed(2)}M
                    </div>
                    {calculatedPopulation != null &&
                      calculatedPopulation > 0 && (
                        <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                          {(
                            (languageStats.PoplPeoplesLR /
                              calculatedPopulation) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      )}
                  </div>
                </div>
              )}
            {languageStats.PoplPeoplesFPG != null &&
              languageStats.PoplPeoplesFPG > 0 && (
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                    Frontier People Groups
                  </span>
                  <div className='text-right'>
                    <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                      {(languageStats.PoplPeoplesFPG / 1000000).toFixed(2)}M
                    </div>
                    {calculatedPopulation != null &&
                      calculatedPopulation > 0 && (
                        <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                          {(
                            (languageStats.PoplPeoplesFPG /
                              calculatedPopulation) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      )}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Religious Context */}
      {languageStats.PrimaryReligion && (
        <div>
          <div className='font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100'>
            Religious Context
          </div>
          <div className='text-sm space-y-1'>
            <div className='flex justify-between'>
              <span className='text-neutral-500 dark:text-neutral-400'>
                Primary Religion:
              </span>
              <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                {languageStats.PrimaryReligion}
              </span>
            </div>
            {languageStats.PercentChristianPC != null && (
              <div className='flex justify-between'>
                <span className='text-neutral-500 dark:text-neutral-400'>
                  % Christian:
                </span>
                <span className='font-medium text-secondary-600 dark:text-secondary-400'>
                  {languageStats.PercentChristianPC.toFixed(1)}%
                </span>
              </div>
            )}
            {languageStats.PercentEvangelicalPC != null && (
              <div className='flex justify-between'>
                <span className='text-neutral-500 dark:text-neutral-400'>
                  % Evangelical:
                </span>
                <span className='font-medium text-accent-600 dark:text-accent-400'>
                  {languageStats.PercentEvangelicalPC.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gospel / Bible Access */}
      <div>
        <div className='font-semibold text-sm mb-3 flex items-center gap-2 text-neutral-900 dark:text-neutral-100'>
          <BookOpenIcon className='w-4 h-4' />
          Gospel / Bible Access
        </div>
        <div className='space-y-3'>
          {/* Scripture Status Cards */}
          <div className='grid grid-cols-3 gap-2'>
            {/* Whole Bible */}
            <div
              className={`rounded-lg p-2 border ${
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus === 5) ||
                languageStats.BibleYear
                  ? 'bg-success-50 dark:bg-success-950/30 border-success-200 dark:border-success-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  (typeof languageStats.BibleStatus === 'number' &&
                    languageStats.BibleStatus === 5) ||
                  languageStats.BibleYear
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-neutral-500'
                }`}
              >
                Whole Bible
              </div>
              <div
                className={`text-sm font-bold ${
                  (typeof languageStats.BibleStatus === 'number' &&
                    languageStats.BibleStatus === 5) ||
                  languageStats.BibleYear
                    ? 'text-success-700 dark:text-success-300'
                    : 'text-neutral-400'
                }`}
              >
                {(typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus === 5) ||
                languageStats.BibleYear
                  ? 'Yes'
                  : 'No'}
              </div>
              {languageStats.BibleYear && (
                <div className='text-xs text-success-600 dark:text-success-400 mt-0.5'>
                  {languageStats.BibleYear}
                </div>
              )}
            </div>

            {/* New Testament */}
            <div
              className={`rounded-lg p-2 border ${
                languageStats.NTYear ||
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus >= 4)
                  ? 'bg-accent-50 dark:bg-accent-950/30 border-accent-200 dark:border-accent-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  languageStats.NTYear ||
                  (typeof languageStats.BibleStatus === 'number' &&
                    languageStats.BibleStatus >= 4)
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-neutral-500'
                }`}
              >
                New Testament
              </div>
              <div
                className={`text-sm font-bold ${
                  languageStats.NTYear ||
                  (typeof languageStats.BibleStatus === 'number' &&
                    languageStats.BibleStatus >= 4)
                    ? 'text-accent-700 dark:text-accent-300'
                    : 'text-neutral-400'
                }`}
              >
                {languageStats.NTYear ||
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus >= 4)
                  ? 'Yes'
                  : 'No'}
              </div>
              {languageStats.NTYear && (
                <div className='text-xs text-accent-600 dark:text-accent-400 mt-0.5'>
                  {languageStats.NTYear}
                </div>
              )}
            </div>

            {/* Portions */}
            <div
              className={`rounded-lg p-2 border ${
                languageStats.PortionsYear ||
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus >= 3)
                  ? 'bg-warning-50 dark:bg-warning-900/40 border-warning-200 dark:border-warning-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  languageStats.PortionsYear ||
                  (typeof languageStats.BibleStatus === 'number' &&
                    languageStats.BibleStatus >= 3)
                    ? 'text-warning-600 dark:text-warning-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                Portions
              </div>
              <div
                className={`text-sm font-bold ${
                  languageStats.PortionsYear ||
                  (typeof languageStats.BibleStatus === 'number' &&
                    languageStats.BibleStatus >= 3)
                    ? 'text-warning-700 dark:text-warning-300'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {languageStats.PortionsYear ||
                (typeof languageStats.BibleStatus === 'number' &&
                  languageStats.BibleStatus >= 3)
                  ? 'Yes'
                  : 'No'}
              </div>
              {languageStats.PortionsYear && (
                <div className='text-xs text-warning-600 dark:text-warning-400 mt-0.5'>
                  {languageStats.PortionsYear}
                </div>
              )}
            </div>
          </div>

          {/* Media Resources */}
          <div className='grid grid-cols-2 gap-2'>
            {/* Jesus Film */}
            <div
              className={`rounded-lg p-2 border flex items-center gap-2 ${
                languageStats.HasJesusFilm === 'Y' || languageStats.JF === 'Y'
                  ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800'
                  : 'bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-800'
              }`}
            >
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
                  }`}
                >
                  Jesus Film
                </div>
                <div
                  className={`text-sm font-bold ${
                    languageStats.HasJesusFilm === 'Y' ||
                    languageStats.JF === 'Y'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-neutral-400'
                  }`}
                >
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
              }`}
            >
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
                  }`}
                >
                  Audio Recordings
                </div>
                <div
                  className={`text-sm font-bold ${
                    languageStats.HasAudioRecordings === 'Y' ||
                    languageStats.AudioRecordings === 'Y'
                      ? 'text-secondary-700 dark:text-secondary-300'
                      : 'text-neutral-400'
                  }`}
                >
                  {languageStats.HasAudioRecordings === 'Y' ||
                  languageStats.AudioRecordings === 'Y'
                    ? 'Available'
                    : 'Not Available'}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Status */}
          <div className='text-xs space-y-1 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
            {languageStats.BibleStatus && (
              <div className='flex justify-between'>
                <span className='text-neutral-500'>Bible Status:</span>
                <span className='font-medium'>
                  {typeof languageStats.BibleStatus === 'number'
                    ? `Level ${languageStats.BibleStatus}`
                    : languageStats.BibleStatus}
                </span>
              </div>
            )}
            {(languageStats.BiblePrimaryText ||
              languageStats.NTPrimaryText) && (
              <div className='flex justify-between'>
                <span className='text-neutral-500'>Primary Text:</span>
                <span className='font-medium'>
                  {languageStats.BiblePrimaryText ||
                    languageStats.NTPrimaryText}
                </span>
              </div>
            )}
            {(languageStats.BiblePrimaryAudio ||
              languageStats.NTPrimaryAudio) && (
              <div className='flex justify-between'>
                <span className='text-neutral-500'>Primary Audio:</span>
                <span className='font-medium'>
                  {languageStats.BiblePrimaryAudio ||
                    languageStats.NTPrimaryAudio}
                </span>
              </div>
            )}
            {languageStats.BibleTranslationNeed &&
              languageStats.BibleTranslationNeed !== 'Unknown' && (
                <div className='flex justify-between'>
                  <span className='text-neutral-500'>Translation Need:</span>
                  <span className='font-medium'>
                    {languageStats.BibleTranslationNeed}
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Joshua Project Scale */}
      {languageStats.JPScalePC && (
        <div>
          <div className='font-semibold text-sm mb-2 text-neutral-900 dark:text-neutral-100'>
            Gospel Progress Scale
          </div>
          <div className='flex items-center gap-3'>
            <div
              className={`${
                languageStats.JPScalePC === 1
                  ? 'bg-red-600'
                  : languageStats.JPScalePC === 2
                    ? 'bg-orange-500'
                    : languageStats.JPScalePC === 3
                      ? 'bg-yellow-500'
                      : languageStats.JPScalePC === 4
                        ? 'bg-lime-500'
                        : 'bg-green-600'
              } text-white font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg`}
            >
              {languageStats.JPScalePC}
            </div>
            <div className='text-sm text-neutral-700 dark:text-neutral-300'>
              {languageStats.JPScaleText && (
                <div className='font-medium'>{languageStats.JPScaleText}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Source Attribution */}
      <div className='text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
        Data from{' '}
        <a
          href='https://joshuaproject.net'
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-neutral-600'
        >
          Joshua Project
        </a>
      </div>
    </div>
  );
};
