'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { Input } from '@/shared/components/ui/Input';
import { Search as SearchIcon } from 'lucide-react';
import Fuse from 'fuse.js';
import { type MapSelection } from '../inspector/state/inspectorStore';
import {
  MapControlsSection,
  type LayerState,
} from '../sections/MapControlsSection';
import type { ColorGradient } from '../analytics/types';
import { BibleTranslationStats } from '@/features/global-stats/components/BibleTranslationStats';
import { EveryLanguageProjectStats } from '@/features/global-stats/components/EveryLanguageProjectStats';
import { RecentActivityFeed } from '@/features/global-stats/components/RecentActivityFeed';
import {
  useActiveProjectsWithProgress,
  useGlobalStatistics,
  useRecentActivityFeed,
} from '@/features/global-stats/hooks/useGlobalStats';
import { CollapsibleSection } from './shared/CollapsibleSection';
import { LinkedEntitiesSection } from '../sections/LinkedEntitiesSection';
import { JPLanguageStatsSection } from '../sections/JPLanguageStatsSection';
import { JPCountryStatsSection } from '../sections/JPCountryStatsSection';
import { PeopleGroupStatsSection } from '../sections/PeopleGroupStatsSection';
import { HierarchySection } from '../sections/HierarchySection';
import { GRNLanguageSampleSection } from '../sections/GRNLanguageSampleSection';
import { GRNGospelResourcesSection } from '../sections/GRNGospelResourcesSection';
import { PeopleGroupCard } from '@/shared/components/PeopleGroupCard';
import { useSelection } from '../inspector/state/inspectorStore';
import { usePeopleGroupIdFromPeopleId3 } from '../hooks/usePeopleGroupIdFromPeopleId3';
import {
  useJPPeopleGroupsByLanguageCache,
  useJPPeopleGroupsByCountryCache,
} from '../hooks/useJPPeopleGroupsCache';
import { useProjectsEnabled } from '@/shared/hooks/useFeatureFlags';

type InspectorTab =
  | 'map-controls'
  | 'global-translation-data'
  | 'language-data'
  | 'region-data'
  | 'people-groups-data';

/**
 * Component for displaying linked people groups with search functionality
 */
const LinkedPeopleGroupsSection: React.FC<{
  parentId: string;
  parentType: 'language_entity' | 'region';
}> = ({ parentId, parentType }) => {
  const [query, setQuery] = React.useState('');

  // Fetch people groups based on parent type - call both hooks unconditionally
  // Removed sorting to optimize loading performance
  const isLanguage = parentType === 'language_entity';
  const languagePeopleGroupsQuery = useJPPeopleGroupsByLanguageCache(
    isLanguage ? parentId : '',
    1,
    1000
  );
  const countryPeopleGroupsQuery = useJPPeopleGroupsByCountryCache(
    !isLanguage ? parentId : '',
    1,
    1000
  );

  const peopleGroupsQuery = isLanguage
    ? languagePeopleGroupsQuery
    : countryPeopleGroupsQuery;
  const { data: peopleGroupsData, isLoading } = peopleGroupsQuery;

  // Ensure peopleGroups is always an array
  const peopleGroups = Array.isArray(peopleGroupsData) ? peopleGroupsData : [];

  // Filter people groups by search query
  const filtered = React.useMemo(() => {
    if (!query.trim()) return peopleGroups;
    // Additional safety check before creating Fuse instance
    if (!Array.isArray(peopleGroups) || peopleGroups.length === 0) {
      return [];
    }
    const fuse = new Fuse(peopleGroups, {
      keys: ['PeopNameInCountry', 'PrimaryLanguageName'],
      threshold: 0.35,
      ignoreLocation: true,
    });
    return fuse.search(query.trim()).map(r => r.item);
  }, [peopleGroups, query]);

  if (isLoading) {
    return (
      <div className='space-y-2'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='h-16 bg-neutral-200 rounded animate-pulse' />
        ))}
      </div>
    );
  }

  if (peopleGroups.length === 0) {
    return (
      <div className='text-sm text-neutral-500'>No linked people groups</div>
    );
  }

  return (
    <div className='space-y-2'>
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder='Search people groups…'
        leftIcon={<SearchIcon className='w-4 h-4' />}
        size='sm'
      />
      <div className='grid grid-cols-1 gap-2'>
        {filtered.map((group, index) => (
          <PeopleGroupCardWrapper
            key={`${group.PeopleID3}-${group.RegionName || group.Ctry || index}`}
            group={group}
            type={isLanguage ? 'language' : 'region'}
            entityId={parentId}
          />
        ))}
      </div>
      {peopleGroups.length > 0 && filtered.length === 0 && (
        <div className='text-sm text-neutral-500'>
          No people groups match "{query}"
        </div>
      )}
    </div>
  );
};

/**
 * Wrapper component to handle PeopleID3 to people_group_id mapping
 */
const PeopleGroupCardWrapper: React.FC<{
  group: any; // JPPeopleGroup type
  type: 'language' | 'region';
  entityId: string;
}> = ({ group, type, entityId }) => {
  const router = useRouter();
  const selection = useSelection();

  // Map PeopleID3 to people_group_id
  const { data: peopleGroupId } = usePeopleGroupIdFromPeopleId3(
    group.PeopleID3
  );

  if (!peopleGroupId) {
    // Fallback display if mapping fails
    return (
      <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors'>
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
            {typeof group.Population === 'number'
              ? group.Population.toLocaleString()
              : 'N/A'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PeopleGroupCard
      peopleGroupId={peopleGroupId}
      contextualRegionId={type === 'region' ? entityId : undefined}
      showName={true}
      showPopulation={true}
      showPrimaryLanguageBibleStatus={true}
      showLanguageCount={false}
      showCountryCount={false}
      showImage={false}
      showRegionName={true}
      regionName={group.RegionName || group.Ctry || undefined}
      isSelected={
        selection?.kind === 'people_group' && selection.id === peopleGroupId
      }
      onClick={id => {
        router.push(`/map/people-group/${encodeURIComponent(id)}`);
      }}
    />
  );
};

interface InspectorTabsProps {
  selection: MapSelection | null;
  layers?: LayerState;
  onLayersChange?: (next: LayerState) => void;
  selectionMode?: 'language' | 'region' | 'people_group';
  globalListeningSettings?: {
    timePeriodHours: number;
    colorGradient: ColorGradient;
  };
  onGlobalListeningSettingsChange?: (settings: {
    timePeriodHours: number;
    colorGradient: ColorGradient;
  }) => void;
  languagesSettings?: {
    clustered: boolean;
  };
  onLanguagesSettingsChange?: (settings: { clustered: boolean }) => void;
  peopleGroupsSettings?: {
    clustered: boolean;
  };
  onPeopleGroupsSettingsChange?: (settings: { clustered: boolean }) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const InspectorTabs: React.FC<InspectorTabsProps> = ({
  selection,
  layers,
  onLayersChange,
  selectionMode = 'language',
  globalListeningSettings,
  onGlobalListeningSettingsChange,
  languagesSettings,
  onLanguagesSettingsChange,
  peopleGroupsSettings,
  onPeopleGroupsSettingsChange,
  scrollRef: externalScrollRef,
}) => {
  const projectsEnabled = useProjectsEnabled();
  // Create internal scroll ref for tab content if not provided
  const internalScrollRef = React.useRef<HTMLDivElement | null>(null);
  const tabContentScrollRef = externalScrollRef || internalScrollRef;

  // Auto-switch to appropriate tab based on selection
  const getInitialTab = React.useCallback((): InspectorTab => {
    if (!selection) return 'global-translation-data';
    if (selection.kind === 'language_entity') return 'language-data';
    if (selection.kind === 'region') return 'region-data';
    if (selection.kind === 'people_group') return 'people-groups-data';
    return 'global-translation-data';
  }, [selection]);

  const [activeTab, setActiveTab] = React.useState<InspectorTab>(() => {
    if (!selection) return 'global-translation-data';
    if (selection.kind === 'language_entity') return 'language-data';
    if (selection.kind === 'region') return 'region-data';
    if (selection.kind === 'people_group') return 'people-groups-data';
    return 'global-translation-data';
  });

  // Track previous selection and mode to detect changes
  const prevSelectionRef = React.useRef<MapSelection | null>(null);
  const prevModeRef = React.useRef<typeof selectionMode>(selectionMode);

  // Auto-switch tab when selection changes
  React.useEffect(() => {
    const selectionChanged =
      prevSelectionRef.current?.kind !== selection?.kind ||
      prevSelectionRef.current?.id !== selection?.id;

    const modeChanged = prevModeRef.current !== selectionMode;

    if (selectionChanged) {
      // Selection changed - switch to appropriate tab
      setActiveTab(getInitialTab());
    } else if (modeChanged && !selection) {
      // Mode changed but no selection - preserve tab unless on language/region/people group tab
      const isEntityTab =
        activeTab === 'language-data' ||
        activeTab === 'region-data' ||
        activeTab === 'people-groups-data';

      if (isEntityTab) {
        // We're on an entity tab but no selection - switch to global translation
        setActiveTab('global-translation-data');
      }
      // Otherwise, keep the current tab
    }

    prevSelectionRef.current = selection;
    prevModeRef.current = selectionMode;
  }, [selection, getInitialTab, activeTab, selectionMode]);

  // Global stats hooks
  const bibleStatsQuery = useGlobalStatistics();
  const projectStatusQuery = useActiveProjectsWithProgress({
    enabled: projectsEnabled,
  });
  const activityFeedQuery = useRecentActivityFeed(12, {
    enabled: projectsEnabled,
  });

  // Check for linked entities to determine tab visibility
  const linkedLanguagesQuery = useQuery({
    queryKey: [
      selection?.kind === 'region'
        ? 'region-linked-languages-check'
        : selection?.kind === 'people_group'
          ? 'people-group-linked-languages-check'
          : 'no-query',
      selection?.id,
    ],
    queryFn: async () => {
      if (
        !selection ||
        (selection.kind !== 'region' && selection.kind !== 'people_group')
      ) {
        return [];
      }
      // Use the same logic as LinkedEntitiesSection
      if (selection.kind === 'people_group') {
        const { data: pgrData, error: pgrError } = await supabase
          .from('people_groups_regions')
          .select('id')
          .eq('people_group_id', selection.id)
          .is('deleted_at', null);
        if (pgrError) throw pgrError;
        const pgrIds = (pgrData ?? []).map((r: { id: string }) => r.id);
        if (pgrIds.length === 0) return [];
        const { data, error } = await supabase
          .from('language_entities_people_groups_regions')
          .select('language_entity_id')
          .in('people_group_region_id', pgrIds)
          .limit(1); // Just check if any exist
        if (error) throw error;
        return data ?? [];
      } else {
        const { data, error } = await (supabase as any).rpc(
          'list_languages_for_region',
          {
            p_region_id: selection.id,
            p_include_descendants: true,
          }
        );
        if (error) {
          console.error(
            '[InspectorTabs] Error fetching linked languages for region:',
            error
          );
          throw error;
        }
        // Just check if any exist - return first one for count check
        return (data ?? []).slice(0, 1);
      }
    },
    enabled:
      !!selection &&
      (selection.kind === 'region' || selection.kind === 'people_group'),
    staleTime: 10 * 60 * 1000,
  });

  const linkedRegionsQuery = useQuery({
    queryKey: [
      selection?.kind === 'language_entity'
        ? 'language-linked-regions-check'
        : selection?.kind === 'people_group'
          ? 'people-group-linked-regions-check'
          : 'no-query',
      selection?.id,
    ],
    queryFn: async () => {
      if (
        !selection ||
        (selection.kind !== 'language_entity' &&
          selection.kind !== 'people_group')
      ) {
        return [];
      }
      if (selection.kind === 'people_group') {
        const { data, error } = await supabase
          .from('people_groups_regions_stats')
          .select('region_id')
          .eq('people_group_id', selection.id)
          .limit(1); // Just check if any exist
        if (error) throw error;
        return data ?? [];
      } else {
        const { data, error } = await supabase
          .from('language_entities_regions')
          .select('regions(id, name, level)')
          .eq('language_entity_id', selection.id)
          .not('regions', 'is', null);
        if (error) {
          console.error(
            '[InspectorTabs] Error fetching linked regions:',
            error
          );
          throw error;
        }
        // Filter out null regions and return first one for count check
        const validData = (data ?? [])
          .filter((r: any) => r.regions !== null && r.regions.id !== null)
          .slice(0, 1);
        return validData;
      }
    },
    enabled:
      !!selection &&
      (selection.kind === 'language_entity' ||
        selection.kind === 'people_group'),
    staleTime: 10 * 60 * 1000,
  });

  const linkedPeopleGroupsQuery = useQuery({
    queryKey: [
      selection?.kind === 'language_entity'
        ? 'language-linked-people-groups-check'
        : selection?.kind === 'region'
          ? 'region-linked-people-groups-check'
          : 'no-query',
      selection?.id,
    ],
    queryFn: async () => {
      if (
        !selection ||
        (selection.kind !== 'language_entity' && selection.kind !== 'region')
      ) {
        return [];
      }
      // Check if any people groups exist using database views
      if (selection.kind === 'language_entity') {
        const { data } = await supabase
          .from('languages_people_groups_stats')
          .select('people_group_id')
          .eq('language_entity_id', selection.id)
          .limit(1);
        return data ?? [];
      } else {
        // For regions, check people_groups_regions_stats
        const { data } = await supabase
          .from('people_groups_regions_stats')
          .select('people_group_id')
          .eq('region_id', selection.id)
          .limit(1);
        return data ?? [];
      }
    },
    enabled:
      !!selection &&
      (selection.kind === 'language_entity' || selection.kind === 'region'),
    staleTime: 10 * 60 * 1000,
  });

  // Determine which tabs should be visible and their order based on selection mode
  const visibleTabs: InspectorTab[] = ['map-controls'];

  if (!selection) {
    visibleTabs.push('global-translation-data');
  } else {
    // Don't show global-translation-data when something is selected

    if (selection.kind === 'language_entity') {
      // Language mode: Map controls, Language, Regions, People groups
      visibleTabs.push('language-data');
      if ((linkedRegionsQuery.data?.length ?? 0) > 0) {
        visibleTabs.push('region-data');
      }
      if ((linkedPeopleGroupsQuery.data?.length ?? 0) > 0) {
        visibleTabs.push('people-groups-data');
      }
    } else if (selection.kind === 'region') {
      // Region mode: Map controls, Country, Languages, People groups
      visibleTabs.push('region-data');
      if ((linkedLanguagesQuery.data?.length ?? 0) > 0) {
        visibleTabs.push('language-data');
      }
      if ((linkedPeopleGroupsQuery.data?.length ?? 0) > 0) {
        visibleTabs.push('people-groups-data');
      }
    } else if (selection.kind === 'people_group') {
      // People groups mode: Map controls, People group, Languages, Countries
      visibleTabs.push('people-groups-data');
      if ((linkedLanguagesQuery.data?.length ?? 0) > 0) {
        visibleTabs.push('language-data');
      }
      if ((linkedRegionsQuery.data?.length ?? 0) > 0) {
        visibleTabs.push('region-data');
      }
    }
  }

  // Tab labels based on selection mode
  const getTabLabel = (tab: InspectorTab): string => {
    if (tab === 'map-controls') return 'Map Controls';
    if (tab === 'global-translation-data') return 'Global Translation Data';

    if (!selection) {
      return (
        {
          'language-data': 'Language Data',
          'region-data': 'Region Data',
          'people-groups-data': 'People Groups Data',
        }[tab] || tab
      );
    }

    if (selection.kind === 'language_entity') {
      return (
        {
          'language-data': 'Language',
          'region-data': 'Regions',
          'people-groups-data': 'People groups',
        }[tab] || tab
      );
    } else if (selection.kind === 'region') {
      return (
        {
          'language-data': 'Languages',
          'region-data': 'Country',
          'people-groups-data': 'People groups',
        }[tab] || tab
      );
    } else if (selection.kind === 'people_group') {
      return (
        {
          'language-data': 'Languages',
          'region-data': 'Countries',
          'people-groups-data': 'People group',
        }[tab] || tab
      );
    }

    return (
      {
        'language-data': 'Language Data',
        'region-data': 'Region Data',
        'people-groups-data': 'People Groups Data',
      }[tab] || tab
    );
  };

  return (
    <div className='flex flex-col flex-1 min-h-0'>
      {/* Tab Headers */}
      <div className='flex-none flex gap-1 p-1 px-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-x-auto'>
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
                isActive
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}>
              {getTabLabel(tab)}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        ref={tabContentScrollRef}
        className='flex-1 overflow-y-auto p-4 min-h-0'>
        {activeTab === 'map-controls' && layers && onLayersChange && (
          <MapControlsSection
            value={layers}
            onChange={onLayersChange}
            embeddable
            selectionMode={selectionMode}
            globalListeningSettings={globalListeningSettings}
            onGlobalListeningSettingsChange={onGlobalListeningSettingsChange}
            languagesSettings={languagesSettings}
            onLanguagesSettingsChange={onLanguagesSettingsChange}
            peopleGroupsSettings={peopleGroupsSettings}
            onPeopleGroupsSettingsChange={onPeopleGroupsSettingsChange}
          />
        )}

        {activeTab === 'global-translation-data' && (
          <div className='space-y-4'>
            <CollapsibleSection
              title='Bible Translation Progress'
              sectionId='bible-translation-progress'
              defaultExpanded={true}
              variant='card'>
              <BibleTranslationStats
                data={bibleStatsQuery.data?.data}
                isLoading={bibleStatsQuery.isLoading}
                compact={true}
              />
            </CollapsibleSection>
            {projectsEnabled && (
              <CollapsibleSection
                title='Every Language Projects'
                sectionId='every-language-projects'
                defaultExpanded={true}
                variant='card'>
                <EveryLanguageProjectStats
                  summary={projectStatusQuery.data?.summary}
                  projects={projectStatusQuery.data?.projects}
                  isLoading={projectStatusQuery.isLoading}
                  compact={true}
                />
              </CollapsibleSection>
            )}
            {projectsEnabled && (
              <CollapsibleSection
                title='Recent Activity'
                sectionId='recent-activity'
                defaultExpanded={true}
                variant='card'>
                <RecentActivityFeed
                  items={activityFeedQuery.data?.items}
                  isLoading={activityFeedQuery.isLoading}
                  compact={true}
                />
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* Language Data Tab */}
        {activeTab === 'language-data' && (
          <div className='space-y-4'>
            {selection?.kind === 'language_entity' ? (
              <>
                {/* Full Language Data */}
                <CollapsibleSection
                  title='Hierarchy'
                  sectionId='language-hierarchy'
                  defaultExpanded={true}
                  variant='card'>
                  <HierarchySection
                    type='language'
                    entityId={selection.id}
                    bare={false}
                  />
                </CollapsibleSection>
                <CollapsibleSection
                  title='Language Statistics'
                  sectionId='language-stats'
                  defaultExpanded={true}
                  variant='card'>
                  <JPLanguageStatsSection entityId={selection.id} />
                </CollapsibleSection>
                <CollapsibleSection
                  title='Language Sample'
                  sectionId='language-sample'
                  defaultExpanded={true}
                  variant='card'>
                  <GRNLanguageSampleSection entityId={selection.id} />
                </CollapsibleSection>
                <CollapsibleSection
                  title='Gospel Resources'
                  sectionId='gospel-resources'
                  defaultExpanded={true}
                  variant='card'>
                  <GRNGospelResourcesSection entityId={selection.id} />
                </CollapsibleSection>
              </>
            ) : selection?.kind === 'region' ||
              selection?.kind === 'people_group' ? (
              <>
                {/* Searchable Language Cards */}
                <LinkedEntitiesSection
                  type='languages'
                  parentId={selection.id}
                  parentType={selection.kind}
                  scrollRef={tabContentScrollRef}
                />
              </>
            ) : null}
          </div>
        )}

        {/* Region Data Tab */}
        {activeTab === 'region-data' && (
          <div className='space-y-4'>
            {selection?.kind === 'region' ? (
              <>
                {/* Full Region Data */}
                <CollapsibleSection
                  title='Hierarchy'
                  sectionId='region-hierarchy'
                  defaultExpanded={true}
                  variant='card'>
                  <HierarchySection
                    type='region'
                    entityId={selection.id}
                    bare={false}
                  />
                </CollapsibleSection>
                <CollapsibleSection
                  title='Region Statistics'
                  sectionId='region-stats'
                  defaultExpanded={true}
                  variant='card'>
                  <JPCountryStatsSection entityId={selection.id} />
                </CollapsibleSection>
              </>
            ) : selection?.kind === 'language_entity' ||
              selection?.kind === 'people_group' ? (
              <>
                {/* Searchable Region Cards */}
                <LinkedEntitiesSection
                  type='regions'
                  parentId={selection.id}
                  parentType={selection.kind}
                  scrollRef={tabContentScrollRef}
                />
              </>
            ) : null}
          </div>
        )}

        {/* People Groups Data Tab */}
        {activeTab === 'people-groups-data' && (
          <div className='space-y-4'>
            {selection?.kind === 'people_group' ? (
              <>
                {/* Full People Group Data */}
                <CollapsibleSection
                  title='People Group Statistics'
                  sectionId='people-group-stats'
                  defaultExpanded={true}
                  variant='card'>
                  <PeopleGroupStatsSection entityId={selection.id} />
                </CollapsibleSection>
              </>
            ) : selection?.kind === 'language_entity' ||
              selection?.kind === 'region' ? (
              <>
                {/* Searchable People Group Cards */}
                <LinkedPeopleGroupsSection
                  parentId={selection.id}
                  parentType={selection.kind}
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
