import { useEffect } from 'react';
import { useMapContext } from '../context/MapContext';
import { useMobileSheet } from '../context/MobileSheetContext';
import {
  calculateBboxFromGeometry,
  type BBox,
} from '../services/bboxCalculator';

/**
 * Hook for automatically focusing the map on a bbox or boundary geometry.
 * Prefers bbox for performance, falls back to calculating from boundary.
 * Automatically adjusts padding for mobile bottom sheet.
 */
export function useMapFocus(
  bbox: BBox | null,
  boundary: unknown | null,
  entityId?: string
) {
  const { fitBounds } = useMapContext();
  const mobileSheet = useMobileSheet();

  useEffect(() => {
    // Determine if mobile and calculate appropriate padding
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const padding = isMobile
      ? {
          top: 60,
          bottom: mobileSheet.height + 20, // Add 20px extra margin
          left: 60,
          right: 60,
        }
      : 60; // Desktop uses uniform padding

    if (bbox) {
      console.info('[useMapFocus] focusing using bbox', {
        entityId,
        bbox,
        padding,
      });
      fitBounds(bbox, { padding, maxZoom: 7 });
      return;
    }

    if (boundary) {
      const calculatedBbox = calculateBboxFromGeometry(
        boundary as
          | GeoJSON.Feature
          | GeoJSON.FeatureCollection
          | GeoJSON.Geometry
      );
      if (calculatedBbox) {
        console.info(
          '[useMapFocus] focusing using calculated bbox from boundary',
          { entityId, bbox: calculatedBbox, padding }
        );
        fitBounds(calculatedBbox, { padding, maxZoom: 7 });
        return;
      }
    }

    console.info('[useMapFocus] no geometry available for focus', { entityId });
  }, [bbox, boundary, entityId, fitBounds, mobileSheet.height]);
}
