'use client';

import React from 'react';
import {
  useSelection,
  useSelectionMode,
} from '../inspector/state/inspectorStore';
import { useLanguageEntityLocation } from '../hooks/useLanguageEntityLocation';
import { usePeopleGroupLocation } from '../hooks/usePeopleGroupLocation';
import { useLanguageEntityAllLocations } from '../hooks/useLanguageEntityAllLocations';
import { usePeopleGroupAllLocations } from '../hooks/usePeopleGroupAllLocations';
import { useRegion } from '../hooks/useRegion';
import { useMapFocus } from '../hooks/useMapFocus';
import { useMapFlyTo } from '../hooks/useMapFlyTo';
import { useMapContext } from '../context/MapContext';
import { useMobileSheet } from '../context/MobileSheetContext';
import { usePrefetchViewportData } from '../hooks/usePrefetchViewportData';
import { calculateBboxFromCoordinates } from '../services/bboxCalculator';

/**
 * MapFocusHandler handles map zoom/pan when selection changes.
 * This is separate from InfoSection so it always runs, even if InfoSection is collapsed.
 */
export const MapFocusHandler: React.FC = () => {
  const selection = useSelection();
  const selectionMode = useSelectionMode();
  const { flyTo } = useMapContext();
  const mobileSheet = useMobileSheet();
  const { prefetchForCoordinates, prefetchForBbox } = usePrefetchViewportData();

  // Track previous selection to detect when it's cleared
  const prevSelectionRef = React.useRef<typeof selection>(selection);
  const prefetchedForSelectionRef = React.useRef<string | null>(null);

  // For language entities, use new location-based logic
  const languageLocation = useLanguageEntityLocation(
    selection?.kind === 'language_entity' ? selection.id : ''
  );

  // For people groups, use location-based logic
  const peopleGroupLocation = usePeopleGroupLocation(
    selection?.kind === 'people_group' ? selection.id : ''
  );

  // Fetch all locations for languages/people groups when no clicked coordinates
  // (used to fit viewport to all points when selected from search)
  const languageAllLocations = useLanguageEntityAllLocations(
    selection?.kind === 'language_entity' && !selection.coordinates
      ? selection.id
      : ''
  );

  const peopleGroupAllLocations = usePeopleGroupAllLocations(
    selection?.kind === 'people_group' && !selection.coordinates
      ? selection.id
      : ''
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
  // Priority: clicked coordinates (flyTo) > all locations bbox (fitBounds) > region fallback
  // For language entities:
  // - If clicked coordinates exist: flyTo to that point
  // - If no clicked coordinates: fitBounds to all locations (search selection)
  // - Fallback: use region bbox/boundary
  const languageClickedCoordinates =
    selection?.kind === 'language_entity' && selection.coordinates
      ? selection.coordinates
      : null;

  // Calculate bbox from all locations if no clicked coordinates
  const languageAllLocationsBbox = React.useMemo(() => {
    if (
      selection?.kind === 'language_entity' &&
      !languageClickedCoordinates &&
      languageAllLocations.locations.length > 0
    ) {
      const coords = languageAllLocations.locations.map(loc => loc.coordinates);
      return calculateBboxFromCoordinates(coords);
    }
    return null;
  }, [
    selection?.kind,
    languageClickedCoordinates,
    languageAllLocations.locations,
  ]);

  const languageFallbackBbox =
    selection?.kind === 'language_entity' &&
    !languageClickedCoordinates &&
    !languageAllLocationsBbox &&
    languageLocation.hasAnyRegions &&
    !languageLocation.isLoading &&
    !languageAllLocations.isLoading
      ? languageFallbackRegionData.bbox.data
      : null;
  const languageFallbackBoundary =
    selection?.kind === 'language_entity' &&
    !languageClickedCoordinates &&
    !languageAllLocationsBbox &&
    languageLocation.hasAnyRegions &&
    !languageLocation.isLoading &&
    !languageAllLocations.isLoading
      ? languageFallbackRegionData.boundary.data
      : null;

  // For people groups: same logic as languages
  const peopleGroupClickedCoordinates =
    selection?.kind === 'people_group' && selection.coordinates
      ? selection.coordinates
      : null;

  // Calculate bbox from all locations if no clicked coordinates
  const peopleGroupAllLocationsBbox = React.useMemo(() => {
    if (
      selection?.kind === 'people_group' &&
      !peopleGroupClickedCoordinates &&
      peopleGroupAllLocations.locations.length > 0
    ) {
      const coords = peopleGroupAllLocations.locations.map(
        loc => loc.coordinates
      );
      return calculateBboxFromCoordinates(coords);
    }
    return null;
  }, [
    selection?.kind,
    peopleGroupClickedCoordinates,
    peopleGroupAllLocations.locations,
  ]);

  const peopleGroupFallbackBbox =
    selection?.kind === 'people_group' &&
    !peopleGroupClickedCoordinates &&
    !peopleGroupAllLocationsBbox &&
    peopleGroupLocation.hasAnyRegions &&
    !peopleGroupLocation.isLoading &&
    !peopleGroupAllLocations.isLoading
      ? peopleGroupFallbackRegionData.bbox.data
      : null;
  const peopleGroupFallbackBoundary =
    selection?.kind === 'people_group' &&
    !peopleGroupClickedCoordinates &&
    !peopleGroupAllLocationsBbox &&
    peopleGroupLocation.hasAnyRegions &&
    !peopleGroupLocation.isLoading &&
    !peopleGroupAllLocations.isLoading
      ? peopleGroupFallbackRegionData.boundary.data
      : null;

  // For regions: use bbox/boundary (unchanged)
  const regionBbox = selection?.kind === 'region' ? regionData.bbox.data : null;
  const regionBoundary =
    selection?.kind === 'region' ? regionData.boundary.data : null;

  // Use clicked coordinates for flyTo (highest priority - map click)
  const coordinatesToUse =
    languageClickedCoordinates ?? peopleGroupClickedCoordinates;
  useMapFlyTo(coordinatesToUse, 5, selection?.id);

  // Use bbox for fitBounds (all locations bbox OR region fallback OR region selection)
  // Priority: all locations bbox > region fallback > region selection
  const bboxToUse = coordinatesToUse
    ? null
    : (languageAllLocationsBbox ??
      peopleGroupAllLocationsBbox ??
      languageFallbackBbox ??
      peopleGroupFallbackBbox ??
      regionBbox ??
      null);
  const boundaryToUse = coordinatesToUse
    ? null
    : (languageFallbackBoundary ??
      peopleGroupFallbackBoundary ??
      regionBoundary ??
      null);
  useMapFocus(bboxToUse, boundaryToUse, selection?.id);

  // Prefetch viewport data for target location/bbox before animation
  React.useEffect(() => {
    // Skip if no selection or mobile sheet is dragging
    if (!selection || mobileSheet.isDragging) {
      prefetchedForSelectionRef.current = null;
      return;
    }

    // Skip if we've already prefetched for this selection
    const selectionKey = `${selection.kind}-${selection.id}`;
    if (prefetchedForSelectionRef.current === selectionKey) {
      return;
    }

    // Determine which layers to prefetch based on selection mode
    const shouldPrefetchLanguages =
      selectionMode === 'language' || selection.kind === 'language_entity';
    const shouldPrefetchPeopleGroups =
      selectionMode === 'people_group' || selection.kind === 'people_group';

    // Prefetch for coordinates (flyTo case)
    if (coordinatesToUse) {
      const targetZoom = 5; // Same zoom used in useMapFlyTo
      prefetchForCoordinates(coordinatesToUse, targetZoom, {
        languages: shouldPrefetchLanguages,
        peopleGroups: shouldPrefetchPeopleGroups,
      }).catch(error => {
        console.debug('Error prefetching viewport data:', error);
      });
      prefetchedForSelectionRef.current = selectionKey;
      return;
    }

    // Prefetch for bbox (fitBounds case) - includes all locations bbox
    if (bboxToUse) {
      const targetZoom = 7; // Max zoom used in useMapFocus
      prefetchForBbox(bboxToUse, targetZoom, {
        languages: shouldPrefetchLanguages,
        peopleGroups: shouldPrefetchPeopleGroups,
      }).catch(error => {
        console.debug('Error prefetching viewport data:', error);
      });
      prefetchedForSelectionRef.current = selectionKey;
      return;
    }

    // Reset prefetch tracking if no valid target
    prefetchedForSelectionRef.current = null;
  }, [
    selection,
    selectionMode,
    coordinatesToUse,
    bboxToUse,
    mobileSheet.isDragging,
    prefetchForCoordinates,
    prefetchForBbox,
  ]);

  // Reset zoom when selection is cleared (deselected)
  React.useEffect(() => {
    const hadSelection = prevSelectionRef.current !== null;
    const hasSelection = selection !== null;

    // If we had a selection and now we don't, reset zoom
    if (hadSelection && !hasSelection && !mobileSheet.isDragging) {
      // Reset to default view state: longitude: 0, latitude: 20, zoom: 1.5
      flyTo({ longitude: 0, latitude: 20, zoom: 1.5 });
    }

    prevSelectionRef.current = selection;
  }, [selection, mobileSheet.isDragging, flyTo]);

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
