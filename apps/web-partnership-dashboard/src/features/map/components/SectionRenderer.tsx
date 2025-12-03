import React from 'react';
import { type SectionType } from '../config/layoutTypes';
import {
  type MapSelection,
  type SelectionMode,
} from '../inspector/state/inspectorStore';
import { HierarchySection } from '../sections/HierarchySection';
import { LinkedEntitiesSection } from '../sections/LinkedEntitiesSection';
import {
  MapControlsSection,
  type LayerState,
} from '../sections/MapControlsSection';
import { JPPeopleGroupsSection } from '../sections/JPPeopleGroupsSection';
import { JPCountryStatsSection } from '../sections/JPCountryStatsSection';
import { JPLanguageStatsSection } from '../sections/JPLanguageStatsSection';
import { PeopleGroupStatsSection } from '../sections/PeopleGroupStatsSection';
import { GRNLanguageSampleSection } from '../sections/GRNLanguageSampleSection';
import { GRNGospelResourcesSection } from '../sections/GRNGospelResourcesSection';
import { CollapsibleSection } from './shared/CollapsibleSection';

// Mapping of section types to display names
const SECTION_TITLES: Record<SectionType, string> = {
  hierarchy: 'Hierarchy',
  'linked-entities': 'Related',
  'map-controls': 'Map Controls',
  'jp-people-groups': 'People Groups',
  'jp-country-stats': 'Country Statistics',
  'jp-language-stats': 'Language Statistics',
  'grn-language-sample': 'Language Sample',
  'grn-gospel-resources': 'Gospel Resources',
  'people-group-stats': 'People Group Statistics',
};

interface SectionRendererProps {
  type: SectionType;
  selection: MapSelection | null;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  layers?: LayerState;
  onLayersChange?: (next: LayerState) => void;
  globalListeningSettings?: {
    timePeriodHours: number;
    colorGradient: import('../analytics/types').ColorGradient;
  };
  onGlobalListeningSettingsChange?: (settings: {
    timePeriodHours: number;
    colorGradient: import('../analytics/types').ColorGradient;
  }) => void;
  languagesSettings?: {
    clustered: boolean;
  };
  onLanguagesSettingsChange?: (settings: { clustered: boolean }) => void;
  peopleGroupsSettings?: {
    clustered: boolean;
  };
  onPeopleGroupsSettingsChange?: (settings: { clustered: boolean }) => void;
  selectionMode?: SelectionMode;
}

/**
 * SectionRenderer dynamically renders the appropriate section component
 * based on the section type and current selection
 */
export const SectionRenderer: React.FC<SectionRendererProps> = ({
  type,
  selection,
  scrollRef,
  layers,
  onLayersChange,
  globalListeningSettings,
  onGlobalListeningSettingsChange,
  languagesSettings,
  onLanguagesSettingsChange,
  peopleGroupsSettings,
  onPeopleGroupsSettingsChange,
  selectionMode = 'language',
}) => {
  // Helper function to get section title (dynamic for linked-entities)
  const getSectionTitle = (sectionType: SectionType): string => {
    if (sectionType === 'linked-entities' && selection) {
      return selection.kind === 'language_entity' ? 'Regions' : 'Languages';
    }
    return SECTION_TITLES[sectionType];
  };

  // Helper function to render a section wrapped in CollapsibleSection
  const renderSection = (content: React.ReactNode): React.ReactNode => {
    if (!content) return null;

    // Map controls don't need collapsible wrapper when there's no selection
    if (!selection && type === 'map-controls') {
      return content;
    }

    return (
      <CollapsibleSection
        title={getSectionTitle(type)}
        sectionId={type}
        defaultExpanded={true}
      >
        {content}
      </CollapsibleSection>
    );
  };

  if (!selection) {
    // When no selection, only show map controls
    if (type === 'map-controls' && layers && onLayersChange) {
      return (
        <CollapsibleSection
          title={getSectionTitle(type)}
          sectionId={type}
          defaultExpanded={true}
        >
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
        </CollapsibleSection>
      );
    }
    return null;
  }

  switch (type) {
    case 'hierarchy':
      if (selection.kind === 'language_entity') {
        return renderSection(
          <HierarchySection type='language' entityId={selection.id} />
        );
      }
      if (selection.kind === 'region') {
        return renderSection(
          <HierarchySection type='region' entityId={selection.id} />
        );
      }
      return null;

    case 'linked-entities':
      if (selection.kind === 'language_entity') {
        return renderSection(
          <LinkedEntitiesSection
            type='regions'
            parentId={selection.id}
            parentType='language_entity'
            scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          />
        );
      }
      if (selection.kind === 'region') {
        return renderSection(
          <LinkedEntitiesSection
            type='languages'
            parentId={selection.id}
            parentType='region'
            scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          />
        );
      }
      if (selection.kind === 'people_group') {
        // Show both languages and regions for people groups
        return renderSection(
          <div className='space-y-4'>
            <div>
              <div className='text-sm font-medium mb-2'>Languages</div>
              <LinkedEntitiesSection
                type='languages'
                parentId={selection.id}
                parentType='people_group'
                scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
              />
            </div>
            <div>
              <div className='text-sm font-medium mb-2'>Regions</div>
              <LinkedEntitiesSection
                type='regions'
                parentId={selection.id}
                parentType='people_group'
                scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
              />
            </div>
          </div>
        );
      }
      return null;

    case 'map-controls':
      if (layers && onLayersChange) {
        return renderSection(
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
        );
      }
      return null;

    case 'jp-people-groups':
      if (selection.kind === 'language_entity') {
        return renderSection(
          <JPPeopleGroupsSection type='language' entityId={selection.id} />
        );
      }
      if (selection.kind === 'region') {
        return renderSection(
          <JPPeopleGroupsSection type='region' entityId={selection.id} />
        );
      }
      return null;

    case 'jp-country-stats':
      // Only show for regions
      if (selection.kind === 'region') {
        return renderSection(<JPCountryStatsSection entityId={selection.id} />);
      }
      return null;

    case 'jp-language-stats':
      // Only show for language entities
      if (selection.kind === 'language_entity') {
        return renderSection(
          <JPLanguageStatsSection entityId={selection.id} />
        );
      }
      return null;

    case 'grn-language-sample':
      // Only show for language entities
      if (selection.kind === 'language_entity') {
        return renderSection(
          <GRNLanguageSampleSection entityId={selection.id} />
        );
      }
      return null;

    case 'grn-gospel-resources':
      // Only show for language entities
      if (selection.kind === 'language_entity') {
        return renderSection(
          <GRNGospelResourcesSection entityId={selection.id} />
        );
      }
      return null;

    case 'people-group-stats':
      // Only show for people groups
      if (selection.kind === 'people_group') {
        return renderSection(
          <PeopleGroupStatsSection entityId={selection.id} />
        );
      }
      return null;

    default:
      return null;
  }
};
