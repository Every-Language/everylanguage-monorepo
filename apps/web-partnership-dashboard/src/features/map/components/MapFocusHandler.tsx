'use client';

import React from 'react';
import { useSelection } from '../inspector/state/inspectorStore';
import { useLanguageEntityLocation } from '../hooks/useLanguageEntityLocation';
import { usePeopleGroupLocation } from '../hooks/usePeopleGroupLocation';
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

  // For people groups, use location-based logic
  const peopleGroupLocation = usePeopleGroupLocation(
    selection?.kind === 'people_group' ? selection.id : ''
  );

  // For fallback: if no location but has regions, use first region's bbox/boundary
  const languageFallbackRegionData = useRegion(
    selection?.kind === 'language_entity' &&
      !languageLocation.location &&
      languageLocation.hasAnyRegions &&
      languageLocation.firstRegionId
      ? languageLocation.firstRegionId
      : ''
  );

  const peopleGroupFallbackRegionData = useRegion(
    selection?.kind === 'people_group' &&
      !peopleGroupLocation.location &&
      peopleGroupLocation.hasAnyRegions &&
      peopleGroupLocation.firstRegionId
      ? peopleGroupLocation.firstRegionId
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
      ? languageFallbackRegionData.bbox.data
      : null;
  const languageFallbackBoundary =
    selection?.kind === 'language_entity' &&
    !languageLocation.location &&
    languageLocation.hasAnyRegions &&
    !languageLocation.isLoading
      ? languageFallbackRegionData.boundary.data
      : null;

  // For people groups: prioritize location point, then fallback to region, then reset
  const peopleGroupCoordinates =
    selection?.kind === 'people_group' && peopleGroupLocation.location
      ? peopleGroupLocation.location.coordinates
      : null;

  const peopleGroupFallbackBbox =
    selection?.kind === 'people_group' &&
    !peopleGroupLocation.location &&
    peopleGroupLocation.hasAnyRegions &&
    !peopleGroupLocation.isLoading
      ? peopleGroupFallbackRegionData.bbox.data
      : null;
  const peopleGroupFallbackBoundary =
    selection?.kind === 'people_group' &&
    !peopleGroupLocation.location &&
    peopleGroupLocation.hasAnyRegions &&
    !peopleGroupLocation.isLoading
      ? peopleGroupFallbackRegionData.boundary.data
      : null;

  // For regions: use bbox/boundary (unchanged)
  const regionBbox = selection?.kind === 'region' ? regionData.bbox.data : null;
  const regionBoundary =
    selection?.kind === 'region' ? regionData.boundary.data : null;

  // Use location point for language entities or people groups (highest priority)
  const coordinatesToUse = languageCoordinates ?? peopleGroupCoordinates;
  useMapFlyTo(coordinatesToUse, 5, selection?.id);

  // Use region bbox/boundary for fallback or region selection
  // Only use fallback if we don't have coordinates
  const bboxToUse = coordinatesToUse
    ? null
    : (languageFallbackBbox ?? peopleGroupFallbackBbox ?? regionBbox ?? null);
  const boundaryToUse = coordinatesToUse
    ? null
    : (languageFallbackBoundary ??
      peopleGroupFallbackBoundary ??
      regionBoundary ??
      null);
  useMapFocus(bboxToUse, boundaryToUse, selection?.id);

  // Handle reset to default for language entities or people groups with no regions
  React.useEffect(() => {
    if (
      (selection?.kind === 'language_entity' &&
        !languageLocation.isLoading &&
        !languageLocation.location &&
        !languageLocation.hasAnyRegions &&
        !mobileSheet.isDragging) ||
      (selection?.kind === 'people_group' &&
        !peopleGroupLocation.isLoading &&
        !peopleGroupLocation.location &&
        !peopleGroupLocation.hasAnyRegions &&
        !mobileSheet.isDragging)
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
    peopleGroupLocation.isLoading,
    peopleGroupLocation.location,
    peopleGroupLocation.hasAnyRegions,
    mobileSheet.isDragging,
    flyTo,
  ]);

  return null;
};
