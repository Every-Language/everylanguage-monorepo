import React, { useState } from 'react';
import {
  useJPCountryStats,
  useJPPeopleGroupsByCountryPaginated,
  useHasJPCountryData,
} from '../hooks/useJoshuaProject';
import { JPCountryStatsSection } from './JPCountryStatsSection';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import type { JPPeopleGroup } from '../services/joshuaProjectApi';

type JPRegionViewProps = {
  entityId: string;
};

// Helper functions
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

/**
 * Region View displays country statistics and paginated people groups
 * for a given region (country-level)
 */
export const JPRegionView: React.FC<JPRegionViewProps> = ({ entityId }) => {
  const hasCountryData = useHasJPCountryData(entityId);
  const { data: countryStats, isLoading: countryLoading } =
    useJPCountryStats(entityId);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const {
    data: peopleGroups = [],
    isLoading: peopleGroupsLoading,
    error: peopleGroupsError,
  } = useJPPeopleGroupsByCountryPaginated(
    entityId,
    currentPage,
    pageSize,
    'Population',
    'desc'
  );

  // Don't show section if no external ID mapping exists
  if (!hasCountryData) {
    return null;
  }

  const isLoading = countryLoading || peopleGroupsLoading;
  const totalPages = Math.ceil((countryStats?.CntPeoples ?? 0) / pageSize);

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
      {/* Country Stats Section */}
      <div>
        <h2 className='text-lg font-semibold mb-3'>Country Overview</h2>
        <JPCountryStatsSection entityId={entityId} />
      </div>

      {/* People Groups Section */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-lg font-semibold'>
            People Groups ({countryStats?.CntPeoples ?? 0} total)
          </h2>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
              className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ChevronLeftIcon className='w-5 h-5' />
            </button>
            <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[80px] text-center'>
              {totalPages > 0
                ? `Page ${currentPage} of ${totalPages}`
                : 'No data'}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ChevronRightIcon className='w-5 h-5' />
            </button>
          </div>
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
                    <h3 className='font-semibold text-base mb-3'>
                      {group.PeopNameInCountry}
                    </h3>
                    {group.PrimaryLanguageName && (
                      <div className='text-sm text-neutral-600 dark:text-neutral-400 mb-3'>
                        Language: {group.PrimaryLanguageName}
                        {group.ROL3 && (
                          <span className='text-xs text-neutral-500 ml-1'>
                            ({group.ROL3})
                          </span>
                        )}
                      </div>
                    )}
                    <div className='space-y-2'>
                      <div>
                        <span className='text-sm text-neutral-500'>
                          Scripture Access:{' '}
                        </span>
                        <span
                          className={`font-medium px-2 py-1 rounded text-sm ${getBibleStatusColor(
                            group.BibleStatus
                          )} text-white`}
                        >
                          {getBibleStatusLabel(group.BibleStatus)}
                        </span>
                      </div>
                      <div className='flex items-center gap-3 text-sm'>
                        {(group.HasJesusFilm === 'Y' || group.JF === 'Y') && (
                          <span className='text-neutral-600 dark:text-neutral-400'>
                            ✓ Jesus Film Available
                          </span>
                        )}
                        {(group.HasAudioRecordings === 'Y' ||
                          group.AudioRecordings === 'Y') && (
                          <span className='text-neutral-600 dark:text-neutral-400'>
                            ✓ Audio Recordings Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
