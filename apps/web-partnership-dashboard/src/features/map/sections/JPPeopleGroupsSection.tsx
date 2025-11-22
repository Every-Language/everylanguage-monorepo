import React, { useMemo, useState } from 'react';
import {
  useJPCountryStats,
  useJPLanguageStats,
  useHasJPCountryData,
  useHasJPLanguageData,
} from '../hooks/useJoshuaProject';
import {
  useJPPeopleGroupsByCountryCache,
  useJPPeopleGroupsByLanguageCache,
} from '../hooks/useJPPeopleGroupsCache';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';

// Helper function to safely convert to number
function safeToNumber(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

// Helper function to format percentage
function formatPercent(value: unknown): string {
  const num = safeToNumber(value);
  return num != null ? `${num.toFixed(1)}%` : 'N/A';
}

// Helper function to format population
function formatPopulation(value: unknown): string {
  const num = safeToNumber(value);
  return num != null ? num.toLocaleString() : 'N/A';
}

type JPPeopleGroupsSectionProps = {
  type: 'language' | 'region';
  entityId: string;
};

type SortField = 'name' | 'population' | 'scale' | 'evangelical';
type SortDirection = 'asc' | 'desc';

/**
 * People Groups Section displays people groups from Joshua Project
 * with sorting, filtering, and pagination
 */
export const JPPeopleGroupsSection: React.FC<JPPeopleGroupsSectionProps> = ({
  type,
  entityId,
}) => {
  const isRegion = type === 'region';
  const hasCountryData = useHasJPCountryData(isRegion ? entityId : null);
  const hasLanguageData = useHasJPLanguageData(!isRegion ? entityId : null);

  // Fetch stats for total count
  const { data: countryStats } = useJPCountryStats(isRegion ? entityId : null);
  const { data: languageStats } = useJPLanguageStats(
    !isRegion ? entityId : null
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('population');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const pageSize = 20;

  // Map sort field to API sort field
  const apiSortField = useMemo(() => {
    switch (sortField) {
      case 'name':
        return 'PeopNameInCountry';
      case 'population':
        return 'Population';
      case 'scale':
        return 'JPScale';
      case 'evangelical':
        return 'PercentEvangelical';
      default:
        return 'Population';
    }
  }, [sortField]);

  // Fetch paginated people groups from cache - hooks must be called unconditionally
  const countryPeopleGroups = useJPPeopleGroupsByCountryCache(
    isRegion ? entityId : null,
    currentPage,
    pageSize,
    apiSortField,
    sortDirection
  );
  const languagePeopleGroups = useJPPeopleGroupsByLanguageCache(
    !isRegion ? entityId : null,
    currentPage,
    pageSize,
    apiSortField,
    sortDirection
  );

  const {
    data: peopleGroups = [],
    isLoading: peopleGroupsLoading,
    error: peopleGroupsError,
  } = isRegion ? countryPeopleGroups : languagePeopleGroups;

  const hasAnyData = isRegion ? hasCountryData : hasLanguageData;
  const totalPeopleGroups = isRegion
    ? (countryStats?.CntPeoples ?? 0)
    : (languageStats?.NbrPGICs ?? languageStats?.Peoples ?? 0);
  const totalPages = Math.ceil(totalPeopleGroups / pageSize);

  // People groups are already sorted by API, but we keep this for client-side fallback
  const sortedGroups = peopleGroups;

  // Early returns AFTER all hooks
  // Don't show section if no external ID mapping exists
  if (!hasAnyData) {
    return null;
  }

  if (peopleGroupsLoading) {
    return (
      <div className='space-y-2'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='h-16 bg-neutral-200 rounded animate-pulse' />
        ))}
      </div>
    );
  }

  if (peopleGroupsError || !peopleGroups || peopleGroups.length === 0) {
    return (
      <div className='text-sm text-neutral-500'>
        No people group data available
      </div>
    );
  }

  const displayedGroups = sortedGroups;

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
      // Reset to first page when changing sort field
      setCurrentPage(1);
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className='w-3 h-3' />
    ) : (
      <ChevronDownIcon className='w-3 h-3' />
    );
  };

  // Helper to format JP Scale
  const getScaleBadge = (scale: number | null) => {
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

  return (
    <div className='space-y-3'>
      {/* Summary and Pagination Controls */}
      <div className='flex items-center justify-between'>
        <div className='font-semibold text-sm'>
          People Groups (
          {totalPeopleGroups > 0 ? totalPeopleGroups : sortedGroups.length}{' '}
          total)
        </div>
        {totalPages > 1 && (
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || peopleGroupsLoading}
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
              disabled={currentPage >= totalPages || peopleGroupsLoading}
              className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <ChevronRightIcon className='w-5 h-5' />
            </button>
          </div>
        )}
      </div>

      {/* Table Header - Sorting Controls */}
      <div className='grid grid-cols-12 gap-2 text-xs font-medium text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 pb-1'>
        <button
          onClick={() => handleSort('name')}
          className='col-span-5 text-left flex items-center gap-1 hover:text-neutral-700'
        >
          Name
          <SortIndicator field='name' />
        </button>
        <button
          onClick={() => handleSort('population')}
          className='col-span-3 text-right flex items-center justify-end gap-1 hover:text-neutral-700'
        >
          Population
          <SortIndicator field='population' />
        </button>
        <button
          onClick={() => handleSort('scale')}
          className='col-span-2 text-center flex items-center justify-center gap-1 hover:text-neutral-700'
        >
          Scale
          <SortIndicator field='scale' />
        </button>
        <button
          onClick={() => handleSort('evangelical')}
          className='col-span-2 text-right flex items-center justify-end gap-1 hover:text-neutral-700'
        >
          % Evan.
          <SortIndicator field='evangelical' />
        </button>
      </div>

      {/* People Groups List */}
      <div className='space-y-2'>
        {displayedGroups.map(group => (
          <div
            key={`${group.PeopleID3}-${group.ROG3}`}
            className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors'
          >
            {/* Header row */}
            <div className='grid grid-cols-12 gap-2 items-start'>
              <div className='col-span-5'>
                <div className='font-medium text-sm leading-tight'>
                  {group.PeopNameInCountry}
                </div>
                {group.PrimaryLanguageName && (
                  <div className='text-xs text-neutral-500 mt-0.5'>
                    {group.PrimaryLanguageName}
                  </div>
                )}
              </div>
              <div className='col-span-3 text-right text-sm'>
                {formatPopulation(group.Population)}
              </div>
              <div className='col-span-2 flex justify-center'>
                {getScaleBadge(group.JPScale)}
              </div>
              <div className='col-span-2 text-right text-sm font-medium text-accent-600 dark:text-accent-500'>
                {formatPercent(group.PercentEvangelical)}
              </div>
            </div>

            {/* Details row */}
            <div className='mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400'>
              <span>{group.PrimaryReligion}</span>
              {group.LeastReached === 'Y' && (
                <span className='bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 px-2 py-0.5 rounded text-xs font-medium'>
                  Least Reached
                </span>
              )}
              {group.FrontierPeopleGroup === 'Y' && (
                <span className='bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded text-xs font-medium'>
                  Frontier
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

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
