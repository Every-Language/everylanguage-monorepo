import React from 'react';
import { type SectionType } from '../config/layoutTypes';
import { type MapSelection } from '../inspector/state/inspectorStore';
import { HierarchySection } from '../sections/HierarchySection';
import { LinkedEntitiesSection } from '../sections/LinkedEntitiesSection';
import { InfoSection } from '../sections/InfoSection';
import { BibleProgressSection } from '../sections/BibleProgressSection';
import { BibleListeningSection } from '../sections/BibleListeningSection';
import {
  MapControlsSection,
  type LayerState,
} from '../sections/MapControlsSection';
import { JPGospelAccessSection } from '../sections/JPGospelAccessSection';
import { JPPeopleGroupsSection } from '../sections/JPPeopleGroupsSection';
import { JPCountryStatsSection } from '../sections/JPCountryStatsSection';
import { JPLanguageStatsSection } from '../sections/JPLanguageStatsSection';
import { JPResourcesSection } from '../sections/JPResourcesSection';
import { useLanguageEntity } from '../hooks/useLanguageEntity';
import { CollapsibleSection } from './shared/CollapsibleSection';

// Mapping of section types to display names
const SECTION_TITLES: Record<SectionType, string> = {
  'hierarchy': 'Hierarchy',
  'linked-entities': 'Related',
  'info': 'Information',
  'bible-progress': 'Bible Progress',
  'bible-listening': 'Bible Listening',
  'map-controls': 'Map Controls',
  'jp-gospel-access': 'Gospel Access',
  'jp-people-groups': 'People Groups',
  'jp-country-stats': 'Country Statistics',
  'jp-language-stats': 'Language Statistics',
  'jp-resources': 'Resources',
};

interface SectionRendererProps {
  type: SectionType;
  selection: MapSelection | null;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  layers?: LayerState;
  onLayersChange?: (next: LayerState) => void;
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
}) => {
  // Get descendant IDs for language entities (used by progress and listening sections)
  const languageData = useLanguageEntity(
    selection?.kind === 'language_entity' ? selection.id : ''
  );
  const descendantIds = languageData.descendants.data ?? [];

  // Helper function to render a section wrapped in CollapsibleSection
  const renderSection = (content: React.ReactNode): React.ReactNode => {
    if (!content) return null;
    
    // Map controls don't need collapsible wrapper when there's no selection
    if (!selection && type === 'map-controls') {
      return content;
    }
    
    return (
      <CollapsibleSection
        title={SECTION_TITLES[type]}
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
          title={SECTION_TITLES[type]}
          sectionId={type}
          defaultExpanded={true}
        >
          <MapControlsSection
            value={layers}
            onChange={onLayersChange}
            embeddable
          />
        </CollapsibleSection>
      );
    }
    return (
      <div className='text-sm text-neutral-500'>
        Select a country, language, or project to view details.
      </div>
    );
  }

  switch (type) {
    case 'hierarchy':
      if (selection.kind === 'language_entity') {
        return renderSection(<HierarchySection type='language' entityId={selection.id} />);
      }
      if (selection.kind === 'region') {
        return renderSection(<HierarchySection type='region' entityId={selection.id} />);
      }
      return null;

    case 'linked-entities':
      if (selection.kind === 'language_entity') {
        return renderSection(
          <LinkedEntitiesSection
            type='regions'
            parentId={selection.id}
            scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          />
        );
      }
      if (selection.kind === 'region') {
        return renderSection(
          <LinkedEntitiesSection
            type='languages'
            parentId={selection.id}
            scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
          />
        );
      }
      return null;

    case 'info':
      if (selection.kind === 'language_entity') {
        return renderSection(<InfoSection type='language' entityId={selection.id} />);
      }
      if (selection.kind === 'region') {
        return renderSection(<InfoSection type='region' entityId={selection.id} />);
      }
      return null;

    case 'bible-progress':
      if (selection.kind === 'language_entity') {
        return renderSection(
          <BibleProgressSection
            languageId={selection.id}
            descendantIds={descendantIds}
            includeDescendants={descendantIds.length > 1}
          />
        );
      }
      // Progress section only applies to languages
      return null;

    case 'bible-listening':
      if (selection.kind === 'language_entity') {
        return renderSection(
          <BibleListeningSection
            type='language'
            entityId={selection.id}
            descendantIds={descendantIds}
            includeDescendants={descendantIds.length > 1}
          />
        );
      }
      if (selection.kind === 'region') {
        return renderSection(<BibleListeningSection type='region' entityId={selection.id} />);
      }
      return null;

    case 'map-controls':
      if (layers && onLayersChange) {
        return renderSection(
          <MapControlsSection
            value={layers}
            onChange={onLayersChange}
            embeddable
          />
        );
      }
      return null;

    case 'jp-gospel-access':
      if (selection.kind === 'language_entity') {
        return renderSection(<JPGospelAccessSection type='language' entityId={selection.id} />);
      }
      if (selection.kind === 'region') {
        return renderSection(<JPGospelAccessSection type='region' entityId={selection.id} />);
      }
      return null;

    case 'jp-people-groups':
      if (selection.kind === 'language_entity') {
        return renderSection(<JPPeopleGroupsSection type='language' entityId={selection.id} />);
      }
      if (selection.kind === 'region') {
        return renderSection(<JPPeopleGroupsSection type='region' entityId={selection.id} />);
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
        return renderSection(<JPLanguageStatsSection entityId={selection.id} />);
      }
      return null;

    case 'jp-resources':
      if (selection.kind === 'language_entity') {
        return renderSection(<JPResourcesSection type='language' entityId={selection.id} />);
      }
      if (selection.kind === 'region') {
        return renderSection(<JPResourcesSection type='region' entityId={selection.id} />);
      }
      return null;

    default:
      return null;
  }
};
