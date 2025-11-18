import React, { useState } from 'react';
import {
  useJPLanguageStats,
  useJPPeopleGroupsByLanguagePaginated,
  useHasJPLanguageData,
} from '../hooks/useJoshuaProject';
import { JPLanguageStatsSection } from './JPLanguageStatsSection';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import type { JPPeopleGroup } from '../services/joshuaProjectApi';

type JPLanguageViewProps = {
  entityId: string;
};

/**
 * Language View displays language statistics and paginated people groups
 * for a given language entity
 */
export const JPLanguageView: React.FC<JPLanguageViewProps> = ({ entityId }) => {
  const hasLanguageData = useHasJPLanguageData(entityId);
  const { data: languageStats, isLoading: languageLoading } =
    useJPLanguageStats(entityId);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const {
    data: peopleGroups = [],
    isLoading: peopleGroupsLoading,
    error: peopleGroupsError,
  } = useJPPeopleGroupsByLanguagePaginated(
    entityId,
    currentPage,
    pageSize,
    'Population',
    'desc'
  );

  // Don't show section if no external ID mapping exists
  if (!hasLanguageData) {
    return null;
  }

  const isLoading = languageLoading || peopleGroupsLoading;
  const totalPeopleGroups =
    languageStats?.NbrPGICs ?? languageStats?.Peoples ?? 0;
  const totalPages = Math.ceil(totalPeopleGroups / pageSize);

  // Helper functions
  const formatPopulation = (value: unknown): string => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toLocaleString();
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed.toLocaleString();
      }
    }
    return 'N/A';
  };

  const formatPercent = (value: unknown): string => {
    const num =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? parseFloat(value)
          : null;
    return num != null ? `${num.toFixed(1)}%` : 'N/A';
  };

  const getBibleStatusLabel = (
    status: number | string | null | undefined
  ): string => {
    if (status === null || status === undefined) return 'Unknown';
    if (typeof status === 'number') {
      if (status === 5) return 'Whole Bible';
      if (status === 4) return 'New Testament';
      if (status >= 3) return 'Portions';
      return 'No Scripture';
    }
    return String(status);
  };

  const getBibleStatusColor = (
    status: number | string | null | undefined
  ): string => {
    if (status === null || status === undefined) return 'bg-neutral-500';
    if (typeof status === 'number') {
      if (status === 5) return 'bg-success-600';
      if (status === 4) return 'bg-accent-500';
      if (status >= 3) return 'bg-warning-500';
      return 'bg-error-600';
    }
    return 'bg-neutral-500';
  };

  const getScaleBadge = (scale: number | null | undefined) => {
    if (!scale) return null;

    const scaleColors: Record<number, string> = {
      1: 'bg-error-600',
      2: 'bg-warning-500',
      3: 'bg-accent-500',
      4: 'bg-secondary-500',
      5: 'bg-secondary-600',
    };

    return (
      <span
        className={`${scaleColors[scale] || 'bg-neutral-500'} text-white text-xs font-bold px-2 py-0.5 rounded`}
      >
        {scale}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className='space-y-4'>
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

  return (
    <div className='space-y-6'>
      {/* Language Stats Section */}
      <div>
        <h2 className='text-lg font-semibold mb-3'>Language Overview</h2>
        <JPLanguageStatsSection entityId={entityId} />
      </div>

      {/* People Groups Section */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-lg font-semibold'>
            People Groups ({languageStats?.Peoples ?? 0} total)
          </h2>
          {totalPages > 1 && (
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <ChevronLeftIcon className='w-5 h-5' />
              </button>
              <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <ChevronRightIcon className='w-5 h-5' />
              </button>
            </div>
          )}
        </div>

        {peopleGroupsError ? (
          <div className='text-sm text-error-600'>
            Error loading people groups
          </div>
        ) : peopleGroups.length === 0 ? (
          <div className='text-sm text-neutral-500'>No people groups found</div>
        ) : (
          <div className='space-y-3'>
            {peopleGroups.map((group: JPPeopleGroup) => (
              <div
                key={`${group.PeopleID3}-${group.ROG3}`}
                className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-2'>
                      <h3 className='font-semibold text-base'>
                        {group.PeopNameInCountry}
                      </h3>
                      {getScaleBadge(group.JPScale)}
                    </div>
                    <div className='text-sm text-neutral-600 dark:text-neutral-400 mb-2'>
                      Country: {group.Ctry}
                      {group.ISO3 && (
                        <span className='text-xs text-neutral-500 ml-1'>
                          ({group.ISO3})
                        </span>
                      )}
                    </div>
                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div>
                        <span className='text-neutral-500'>Population: </span>
                        <span className='font-medium'>
                          {formatPopulation(group.Population)}
                        </span>
                      </div>
                      <div>
                        <span className='text-neutral-500'>Religion: </span>
                        <span className='font-medium'>
                          {group.PrimaryReligion}
                        </span>
                      </div>
                      <div>
                        <span className='text-neutral-500'>
                          % Evangelical:{' '}
                        </span>
                        <span className='font-medium text-accent-600 dark:text-accent-500'>
                          {formatPercent(group.PercentEvangelical)}
                        </span>
                      </div>
                      <div>
                        <span className='text-neutral-500'>
                          Scripture Access:{' '}
                        </span>
                        <span
                          className={`font-medium px-2 py-0.5 rounded text-xs ${getBibleStatusColor(
                            group.BibleStatus
                          )} text-white`}
                        >
                          {getBibleStatusLabel(group.BibleStatus)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 flex-wrap'>
                  {group.LeastReached === 'Y' && (
                    <span className='bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 px-2 py-1 rounded text-xs font-medium'>
                      Least Reached
                    </span>
                  )}
                  {group.FrontierPeopleGroup === 'Y' && (
                    <span className='bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 px-2 py-1 rounded text-xs font-medium'>
                      Frontier
                    </span>
                  )}
                  {group.HasJesusFilm === 'Y' || group.JF === 'Y' ? (
                    <span className='bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-1 rounded text-xs font-medium'>
                      Jesus Film Available
                    </span>
                  ) : null}
                  {group.HasAudioRecordings === 'Y' ||
                  group.AudioRecordings === 'Y' ? (
                    <span className='bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 px-2 py-1 rounded text-xs font-medium'>
                      Audio Available
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
