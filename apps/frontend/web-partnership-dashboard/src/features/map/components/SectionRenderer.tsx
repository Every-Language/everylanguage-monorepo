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
import { useLanguageEntity } from '../hooks/useLanguageEntity';

interface SectionRendererProps {
  type: SectionType;
  selection: MapSelection | null;
  scrollRef?: React.RefObject<HTMLDivElement>;
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

  if (!selection) {
    // When no selection, only show map controls
    if (type === 'map-controls' && layers && onLayersChange) {
      return (
        <MapControlsSection
          value={layers}
          onChange={onLayersChange}
          embeddable
        />
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
        return <HierarchySection type='language' entityId={selection.id} />;
      }
      if (selection.kind === 'region') {
        return <HierarchySection type='region' entityId={selection.id} />;
      }
      return null;

    case 'linked-entities':
      if (selection.kind === 'language_entity') {
        return (
          <LinkedEntitiesSection
            type='regions'
            parentId={selection.id}
            scrollRef={scrollRef}
          />
        );
      }
      if (selection.kind === 'region') {
        return (
          <LinkedEntitiesSection
            type='languages'
            parentId={selection.id}
            scrollRef={scrollRef}
          />
        );
      }
      return null;

    case 'info':
      if (selection.kind === 'language_entity') {
        return <InfoSection type='language' entityId={selection.id} />;
      }
      if (selection.kind === 'region') {
        return <InfoSection type='region' entityId={selection.id} />;
      }
      return null;

    case 'bible-progress':
      if (selection.kind === 'language_entity') {
        return (
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
        return (
          <BibleListeningSection
            type='language'
            entityId={selection.id}
            descendantIds={descendantIds}
            includeDescendants={descendantIds.length > 1}
          />
        );
      }
      if (selection.kind === 'region') {
        return <BibleListeningSection type='region' entityId={selection.id} />;
      }
      return null;

    case 'map-controls':
      if (layers && onLayersChange) {
        return (
          <MapControlsSection
            value={layers}
            onChange={onLayersChange}
            embeddable
          />
        );
      }
      return null;

    default:
      return null;
  }
};
