import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useJPCountryStats,
  useJPPeopleGroupsByCountryPaginated,
  useHasJPCountryData,
} from '../hooks/useJoshuaProject';
import { JPCountryStatsSection } from './JPCountryStatsSection';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import type { JPPeopleGroup } from '../services/joshuaProjectApi';
import { PeopleGroupCard } from '@/shared/components/PeopleGroupCard';
import { usePeopleGroupIdFromPeopleId3 } from '../hooks/usePeopleGroupIdFromPeopleId3';
import {
  useSelection,
  useSetSelection,
} from '../inspector/state/inspectorStore';

type JPRegionViewProps = {
  entityId: string;
};

// Wrapper component to handle PeopleID3 to people_group_id mapping
const PeopleGroupCardWrapper: React.FC<{
  group: JPPeopleGroup;
  entityId: string;
}> = ({ group, entityId }) => {
  const router = useRouter();
  const selection = useSelection();
  const setSelection = useSetSelection();

  // Map PeopleID3 to people_group_id
  const { data: peopleGroupId } = usePeopleGroupIdFromPeopleId3(
    group.PeopleID3 ? parseInt(group.PeopleID3, 10) || null : null
  );

  if (!peopleGroupId) {
    // Fallback: return null if mapping fails
    return null;
  }

  // For region context, pass contextualRegionId to show region-specific stats
  return (
    <PeopleGroupCard
      peopleGroupId={peopleGroupId}
      contextualRegionId={entityId}
      showName={true}
      showPopulation={true}
      showPrimaryLanguageBibleStatus={true}
      showLanguageCount={false}
      showCountryCount={false}
      showImage={false}
      isSelected={
        selection?.kind === 'people_group' && selection.id === peopleGroupId
      }
      onClick={id => {
        router.push(`/map/people-group/${encodeURIComponent(id)}`);
        setSelection({ kind: 'people_group', id });
      }}
    />
  );
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
              <PeopleGroupCardWrapper
                key={`${group.PeopleID3}-${group.ROG3}`}
                group={group}
                entityId={entityId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
