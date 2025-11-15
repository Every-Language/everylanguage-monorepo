'use client';

import React from 'react';
import { useSelection } from '../inspector/state/inspectorStore';
import { useLanguageEntity } from '../hooks/useLanguageEntity';
import { useRegion } from '../hooks/useRegion';
import { useMapFocus } from '../hooks/useMapFocus';

/**
 * MapFocusHandler handles map zoom/pan when selection changes.
 * This is separate from InfoSection so it always runs, even if InfoSection is collapsed.
 */
export const MapFocusHandler: React.FC = () => {
  const selection = useSelection();

  // For language entities, get primary region data
  const languageData = useLanguageEntity(
    selection?.kind === 'language_entity' ? selection.id : ''
  );
  const primaryRegionId =
    selection?.kind === 'language_entity'
      ? languageData.primaryRegion.data?.regionId
      : null;
  const primaryRegionData = useRegion(primaryRegionId ?? '');

  // For regions, get region data directly
  const regionData = useRegion(
    selection?.kind === 'region' ? selection.id : ''
  );

  // Determine bbox and boundary based on selection type
  const bbox =
    selection?.kind === 'language_entity'
      ? primaryRegionId
        ? primaryRegionData.bbox.data
        : null
      : selection?.kind === 'region'
        ? regionData.bbox.data
        : null;

  const boundary =
    selection?.kind === 'language_entity'
      ? primaryRegionId
        ? primaryRegionData.boundary.data
        : null
      : selection?.kind === 'region'
        ? regionData.boundary.data
        : null;

  // Always call useMapFocus when we have a selection
  useMapFocus(bbox ?? null, boundary ?? null, selection?.id);

  return null;
};
