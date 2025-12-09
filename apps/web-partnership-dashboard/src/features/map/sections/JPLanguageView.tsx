import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useJPLanguageStats,
  useJPPeopleGroupsByLanguagePaginated,
  useHasJPLanguageData,
} from '../hooks/useJoshuaProject';
import { JPLanguageStatsSection } from './JPLanguageStatsSection';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import type { JPPeopleGroup } from '../services/joshuaProjectApi';
import { PeopleGroupCard } from '@/shared/components/PeopleGroupCard';
import { usePeopleGroupIdFromPeopleId3 } from '../hooks/usePeopleGroupIdFromPeopleId3';
import {
  useSelection,
  useSetSelection,
} from '../inspector/state/inspectorStore';

type JPLanguageViewProps = {
  entityId: string;
};

// Wrapper component to handle PeopleID3 to people_group_id mapping
const PeopleGroupCardWrapper: React.FC<{
  group: JPPeopleGroup;
  entityId: string;
}> = ({ group, entityId: _entityId }) => {
  const router = useRouter();
  const selection = useSelection();
  const setSelection = useSetSelection();

  // Map PeopleID3 to people_group_id
  const { data: peopleGroupId } = usePeopleGroupIdFromPeopleId3(
    group.PeopleID3 ? parseInt(group.PeopleID3, 10) || null : null
  );

  if (!peopleGroupId) {
    // Fallback: return null or a simple div if mapping fails
    return null;
  }

  // For language context, we don't have a specific region, so use total stats
  return (
    <PeopleGroupCard
      peopleGroupId={peopleGroupId}
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
                className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'>
                <ChevronLeftIcon className='w-5 h-5' />
              </button>
              <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed'>
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
            {peopleGroups.map((group: JPPeopleGroup, index: number) => (
              <PeopleGroupCardWrapper
                key={`${group.PeopleID3}-${group.RegionName || group.Ctry || index}`}
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
