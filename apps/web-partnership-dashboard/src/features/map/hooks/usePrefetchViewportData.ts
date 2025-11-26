import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchLanguagesWithLocation } from '../languages/api';
import { fetchPeopleGroupsWithLocation } from '../people-groups/api';
import type { BBox } from '../services/bboxCalculator';

/**
 * Calculate bounding box from center coordinates and zoom level
 * Uses approximate degrees per pixel calculation based on zoom level
 */
function calculateBboxFromCenterAndZoom(
  center: [number, number],
  zoom: number,
  expansionFactor: number = 0.15
): BBox {
  const [lng, lat] = center;

  // Approximate degrees per pixel at equator for given zoom level
  // Formula: degrees = 360 / (256 * 2^zoom)
  const degreesPerPixel = 360 / (256 * Math.pow(2, zoom));

  // Approximate viewport size in degrees (assuming ~512px viewport width)
  // This is a rough estimate - actual viewport depends on screen size
  const viewportWidthDegrees = degreesPerPixel * 512;
  const viewportHeightDegrees = degreesPerPixel * 512;

  // Apply expansion factor
  const expandedWidth = viewportWidthDegrees * (1 + expansionFactor);
  const expandedHeight = viewportHeightDegrees * (1 + expansionFactor);

  // Calculate bbox
  const halfWidth = expandedWidth / 2;
  const halfHeight = expandedHeight / 2;

  return [
    lng - halfWidth, // minLng
    lat - halfHeight, // minLat
    lng + halfWidth, // maxLng
    lat + halfHeight, // maxLat
  ];
}

/**
 * Expand a bounding box by a given factor
 */
function expandBbox(bbox: BBox, expansionFactor: number): BBox {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;

  return [
    minLng - lngSpan * expansionFactor,
    minLat - latSpan * expansionFactor,
    maxLng + lngSpan * expansionFactor,
    maxLat + latSpan * expansionFactor,
  ];
}

/**
 * Calculate expansion factor based on zoom level
 * Higher zoom = smaller expansion (more precise)
 * Lower zoom = larger expansion (more coverage)
 */
function getExpansionFactorForZoom(zoom: number): number {
  if (zoom > 7) return 0.1; // High zoom: 10% expansion
  if (zoom > 4) return 0.15; // Mid zoom: 15% expansion
  return 0.2; // Low zoom: 20% expansion
}

interface PrefetchOptions {
  languages?: boolean;
  peopleGroups?: boolean;
  countries?: boolean; // Note: countries don't use viewport-based fetching currently
}

/**
 * Hook to prefetch viewport data for target bbox/coordinates
 * Used to pre-render data before map animation completes
 */
export function usePrefetchViewportData() {
  const queryClient = useQueryClient();

  const prefetchForBbox = React.useCallback(
    async (bbox: BBox, zoom: number, options: PrefetchOptions = {}) => {
      const expansionFactor = getExpansionFactorForZoom(zoom);
      const expandedBbox = expandBbox(bbox, expansionFactor);

      const prefetchPromises: Promise<void>[] = [];

      if (options.languages) {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['languages-with-location', expandedBbox, zoom],
            queryFn: () =>
              fetchLanguagesWithLocation({
                bbox: expandedBbox,
                zoom,
              }),
            staleTime: 15 * 60 * 1000, // 15 minutes
          })
        );
      }

      if (options.peopleGroups) {
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['people-groups-with-location', expandedBbox, zoom],
            queryFn: () =>
              fetchPeopleGroupsWithLocation({
                bbox: expandedBbox,
                zoom,
              }),
            staleTime: 15 * 60 * 1000, // 15 minutes
          })
        );
      }

      // Execute all prefetches in parallel
      await Promise.allSettled(prefetchPromises);
    },
    [queryClient]
  );

  const prefetchForCoordinates = React.useCallback(
    async (
      coordinates: [number, number],
      zoom: number,
      options: PrefetchOptions = {}
    ) => {
      const expansionFactor = getExpansionFactorForZoom(zoom);
      const targetBbox = calculateBboxFromCenterAndZoom(
        coordinates,
        zoom,
        expansionFactor
      );

      return prefetchForBbox(targetBbox, zoom, options);
    },
    [prefetchForBbox]
  );

  return {
    prefetchForCoordinates,
    prefetchForBbox,
  };
}
