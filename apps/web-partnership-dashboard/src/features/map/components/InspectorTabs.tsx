'use client';

import React from 'react';
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
import { LanguageStatsSection } from '../sections/LanguageStatsSection';
import { CountryStatsSection } from '../sections/CountryStatsSection';
import { PeopleGroupStatsSection } from '../sections/PeopleGroupStatsSection';
import { HierarchySection } from '../sections/HierarchySection';
import { LanguageSampleSection } from '../sections/LanguageSampleSection';
import { GospelRecordingsSection } from '../sections/GospelRecordingsSection';
import { LinksSection } from '../sections/LinksSection';
import { useLanguagesRegionsStats } from '../hooks/useLanguagesRegionsStats';
import { useLanguagesPeopleGroupsStats } from '../hooks/useLanguagesPeopleGroupsStats';
import { usePeopleGroupsRegionsStats } from '../hooks/usePeopleGroupsRegionsStats';
import { useProjectsEnabled } from '@/shared/hooks/useFeatureFlags';

type InspectorTab =
  | 'map-controls'
  | 'global-translation-data'
  | 'language-data'
  | 'region-data'
  | 'people-groups-data';

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

  // Use contextual hooks to check for linked entities (same as LinkedEntitiesSection)
  // Call all hooks unconditionally to follow React hooks rules
  const languagesRegionsStatsForLanguage = useLanguagesRegionsStats({
    languageEntityId:
      selection?.kind === 'language_entity' ? selection.id : null,
  });
  const languagesRegionsStatsForRegion = useLanguagesRegionsStats({
    regionId: selection?.kind === 'region' ? selection.id : null,
  });
  const languagesPeopleGroupsStatsForLanguage = useLanguagesPeopleGroupsStats({
    languageEntityId:
      selection?.kind === 'language_entity' ? selection.id : null,
  });
  const languagesPeopleGroupsStatsForPeopleGroup =
    useLanguagesPeopleGroupsStats({
      peopleGroupId: selection?.kind === 'people_group' ? selection.id : null,
    });
  const peopleGroupsRegionsStatsForPeopleGroup = usePeopleGroupsRegionsStats({
    peopleGroupId: selection?.kind === 'people_group' ? selection.id : null,
  });
  const peopleGroupsRegionsStatsForRegion = usePeopleGroupsRegionsStats({
    regionId: selection?.kind === 'region' ? selection.id : null,
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
      // Check if regions exist using contextual view
      if (
        languagesRegionsStatsForLanguage.data &&
        languagesRegionsStatsForLanguage.data.length > 0
      ) {
        visibleTabs.push('region-data');
      }
      // Check if people groups exist using contextual view
      if (
        languagesPeopleGroupsStatsForLanguage.data &&
        languagesPeopleGroupsStatsForLanguage.data.length > 0
      ) {
        visibleTabs.push('people-groups-data');
      }
    } else if (selection.kind === 'region') {
      // Region mode: Map controls, Country, Languages, People groups
      visibleTabs.push('region-data');
      // Check if languages exist using contextual view
      if (
        languagesRegionsStatsForRegion.data &&
        languagesRegionsStatsForRegion.data.length > 0
      ) {
        visibleTabs.push('language-data');
      }
      // Check if people groups exist using contextual view
      if (
        peopleGroupsRegionsStatsForRegion.data &&
        peopleGroupsRegionsStatsForRegion.data.length > 0
      ) {
        visibleTabs.push('people-groups-data');
      }
    } else if (selection.kind === 'people_group') {
      // People groups mode: Map controls, People group, Languages, Countries
      visibleTabs.push('people-groups-data');
      // Check if languages exist using contextual view
      if (
        languagesPeopleGroupsStatsForPeopleGroup.data &&
        languagesPeopleGroupsStatsForPeopleGroup.data.length > 0
      ) {
        visibleTabs.push('language-data');
      }
      // Check if regions exist using contextual view
      if (
        peopleGroupsRegionsStatsForPeopleGroup.data &&
        peopleGroupsRegionsStatsForPeopleGroup.data.length > 0
      ) {
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
                  <LanguageStatsSection entityId={selection.id} />
                </CollapsibleSection>
                <CollapsibleSection
                  title='Language Sample'
                  sectionId='language-sample'
                  defaultExpanded={true}
                  variant='card'>
                  <LanguageSampleSection entityId={selection.id} />
                </CollapsibleSection>
                <CollapsibleSection
                  title='Gospel Recordings'
                  sectionId='gospel-recordings'
                  defaultExpanded={true}
                  variant='card'>
                  <GospelRecordingsSection entityId={selection.id} />
                </CollapsibleSection>
                <CollapsibleSection
                  title='Resources'
                  sectionId='links'
                  defaultExpanded={true}
                  variant='card'>
                  <LinksSection entityId={selection.id} />
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
                  <CountryStatsSection entityId={selection.id} />
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
                <LinkedEntitiesSection
                  type='people_groups'
                  parentId={selection.id}
                  parentType={selection.kind}
                  scrollRef={tabContentScrollRef}
                />
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
