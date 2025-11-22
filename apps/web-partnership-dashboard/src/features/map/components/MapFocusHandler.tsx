'use client';

import React from 'react';
import { useSelection } from '../inspector/state/inspectorStore';
import { useLanguageEntityLocation } from '../hooks/useLanguageEntityLocation';
import { useRegion } from '../hooks/useRegion';
import { useMapFocus } from '../hooks/useMapFocus';
import { useMapFlyTo } from '../hooks/useMapFlyTo';
import { useMapContext } from '../context/MapContext';
import { useMobileSheet } from '../context/MobileSheetContext';

/**
 * MapFocusHandler handles map zoom/pan when selection changes.
 * This is separate from InfoSection so it always runs, even if InfoSection is collapsed.
 */
export const MapFocusHandler: React.FC = () => {
  const selection = useSelection();
  const { flyTo } = useMapContext();
  const mobileSheet = useMobileSheet();

  // For language entities, use new location-based logic
  const languageLocation = useLanguageEntityLocation(
    selection?.kind === 'language_entity' ? selection.id : ''
  );

  // For fallback: if no location but has regions, use first region's bbox/boundary
  const fallbackRegionData = useRegion(
    selection?.kind === 'language_entity' &&
      !languageLocation.location &&
      languageLocation.hasAnyRegions &&
      languageLocation.firstRegionId
      ? languageLocation.firstRegionId
      : ''
  );

  // For regions, get region data directly (unchanged logic)
  const regionData = useRegion(
    selection?.kind === 'region' ? selection.id : ''
  );

  // Determine what to do based on selection type
  // For language entities: prioritize location point, then fallback to region, then reset
  const languageCoordinates =
    selection?.kind === 'language_entity' && languageLocation.location
      ? languageLocation.location.coordinates
      : null;

  const languageFallbackBbox =
    selection?.kind === 'language_entity' &&
    !languageLocation.location &&
    languageLocation.hasAnyRegions &&
    !languageLocation.isLoading
      ? fallbackRegionData.bbox.data
      : null;
  const languageFallbackBoundary =
    selection?.kind === 'language_entity' &&
    !languageLocation.location &&
    languageLocation.hasAnyRegions &&
    !languageLocation.isLoading
      ? fallbackRegionData.boundary.data
      : null;

  // For regions: use bbox/boundary (unchanged)
  const regionBbox = selection?.kind === 'region' ? regionData.bbox.data : null;
  const regionBoundary =
    selection?.kind === 'region' ? regionData.boundary.data : null;

  // Use location point for language entities (highest priority)
  useMapFlyTo(languageCoordinates, 5, selection?.id);

  // Use region bbox/boundary for language fallback or region selection
  // Only use language fallback if we don't have coordinates
  const bboxToUse = languageCoordinates
    ? null
    : (languageFallbackBbox ?? regionBbox);
  const boundaryToUse = languageCoordinates
    ? null
    : (languageFallbackBoundary ?? regionBoundary);
  useMapFocus(bboxToUse, boundaryToUse, selection?.id);

  // Handle reset to default for language entities with no regions
  React.useEffect(() => {
    if (
      selection?.kind === 'language_entity' &&
      !languageLocation.isLoading &&
      !languageLocation.location &&
      !languageLocation.hasAnyRegions &&
      !mobileSheet.isDragging
    ) {
      // Reset to default view state: longitude: 0, latitude: 20, zoom: 1.5
      flyTo({ longitude: 0, latitude: 20, zoom: 1.5 });
    }
  }, [
    selection?.kind,
    selection?.id,
    languageLocation.isLoading,
    languageLocation.location,
    languageLocation.hasAnyRegions,
    mobileSheet.isDragging,
    flyTo,
  ]);

  return null;
};
