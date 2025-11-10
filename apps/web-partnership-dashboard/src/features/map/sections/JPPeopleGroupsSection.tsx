import React, { useMemo, useState } from 'react';
import { useJPCountryData, useJPLanguageData, useHasJPCountryData, useHasJPLanguageData } from '../hooks/useJoshuaProject';
import type { JPPeopleGroup } from '../services/joshuaProjectApi';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

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
export const JPPeopleGroupsSection: React.FC<JPPeopleGroupsSectionProps> = ({ type, entityId }) => {
  const isRegion = type === 'region';
  const hasCountryData = useHasJPCountryData(isRegion ? entityId : null);
  const hasLanguageData = useHasJPLanguageData(!isRegion ? entityId : null);
  
  const countryData = useJPCountryData(isRegion ? entityId : null);
  const languageData = useJPLanguageData(!isRegion ? entityId : null);

  const peopleGroups = isRegion ? countryData.peopleGroups : languageData.peopleGroups;
  const isLoading = isRegion ? countryData.isLoading : languageData.isLoading;
  const error = isRegion ? countryData.error : languageData.error;
  const hasAnyData = isRegion ? hasCountryData : hasLanguageData;

  const [sortField, setSortField] = useState<SortField>('population');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAll, setShowAll] = useState(false);

  // Sort people groups - useMemo must be called unconditionally
  const sortedGroups = useMemo(() => {
    if (!peopleGroups || peopleGroups.length === 0) {
      return [];
    }
    
    const groups = [...peopleGroups];
    
    groups.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      
      switch (sortField) {
        case 'name':
          aVal = a.PeopNameInCountry || '';
          bVal = b.PeopNameInCountry || '';
          break;
        case 'population':
          aVal = safeToNumber(a.Population) ?? 0;
          bVal = safeToNumber(b.Population) ?? 0;
          break;
        case 'scale':
          aVal = safeToNumber(a.JPScale) ?? 0;
          bVal = safeToNumber(b.JPScale) ?? 0;
          break;
        case 'evangelical':
          aVal = safeToNumber(a.PercentEvangelical) ?? 0;
          bVal = safeToNumber(b.PercentEvangelical) ?? 0;
          break;
      }
      
      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal as string);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aVal - (bVal as number);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });
    
    return groups;
  }, [peopleGroups, sortField, sortDirection]);

  // Early returns AFTER all hooks
  // Don't show section if no external ID mapping exists
  if (!hasAnyData) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-neutral-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !peopleGroups || peopleGroups.length === 0) {
    return (
      <div className="text-sm text-neutral-500">
        No people group data available
      </div>
    );
  }

  // Pagination
  const displayLimit = 10;
  const displayedGroups = showAll ? sortedGroups : sortedGroups.slice(0, displayLimit);
  const hasMore = sortedGroups.length > displayLimit;

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="w-3 h-3" />
    ) : (
      <ChevronDownIcon className="w-3 h-3" />
    );
  };

  // Helper to format JP Scale
  const getScaleBadge = (scale: number | null) => {
    if (!scale) return null;
    
    const scaleColors: Record<number, string> = {
      1: 'bg-red-600',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-lime-500',
      5: 'bg-green-600',
    };
    
    return (
      <span className={`${scaleColors[scale] || 'bg-neutral-500'} text-white text-xs font-bold px-2 py-0.5 rounded`}>
        {scale}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">
          People Groups ({sortedGroups.length})
        </div>
      </div>

      {/* Table Header - Sorting Controls */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 pb-1">
        <button
          onClick={() => handleSort('name')}
          className="col-span-5 text-left flex items-center gap-1 hover:text-neutral-700"
        >
          Name
          <SortIndicator field="name" />
        </button>
        <button
          onClick={() => handleSort('population')}
          className="col-span-3 text-right flex items-center justify-end gap-1 hover:text-neutral-700"
        >
          Population
          <SortIndicator field="population" />
        </button>
        <button
          onClick={() => handleSort('scale')}
          className="col-span-2 text-center flex items-center justify-center gap-1 hover:text-neutral-700"
        >
          Scale
          <SortIndicator field="scale" />
        </button>
        <button
          onClick={() => handleSort('evangelical')}
          className="col-span-2 text-right flex items-center justify-end gap-1 hover:text-neutral-700"
        >
          % Evan.
          <SortIndicator field="evangelical" />
        </button>
      </div>

      {/* People Groups List */}
      <div className="space-y-2">
        {displayedGroups.map((group) => (
          <div
            key={`${group.PeopleID3}-${group.ROG3}`}
            className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <div className="font-medium text-sm leading-tight">
                  {group.PeopNameInCountry}
                </div>
                {group.PrimaryLanguageName && (
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {group.PrimaryLanguageName}
                  </div>
                )}
              </div>
              <div className="col-span-3 text-right text-sm">
                {formatPopulation(group.Population)}
              </div>
              <div className="col-span-2 flex justify-center">
                {getScaleBadge(group.JPScale)}
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-purple-600">
                {formatPercent(group.PercentEvangelical)}
              </div>
            </div>

            {/* Details row */}
            <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <span>{group.PrimaryReligion}</span>
              {group.LeastReached === 'Y' && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                  Least Reached
                </span>
              )}
              {group.FrontierPeopleGroup === 'Y' && (
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
                  Frontier
                </span>
              )}
            </div>
            </div>
          ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          {showAll ? 'Show Less' : `Show All (${sortedGroups.length})`}
        </button>
      )}

      {/* Data Source Attribution */}
      <div className="text-xs text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        Data from{' '}
        <a
          href="https://joshuaproject.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-600"
        >
          Joshua Project
        </a>
      </div>
    </div>
  );
};


