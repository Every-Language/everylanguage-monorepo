import { useEffect } from 'react';
import { useMapContext } from '../context/MapContext';
import {
  calculateBboxFromGeometry,
  type BBox,
} from '../services/bboxCalculator';

/**
 * Hook for automatically focusing the map on a bbox or boundary geometry.
 * Prefers bbox for performance, falls back to calculating from boundary.
 */
export function useMapFocus(
  bbox: BBox | null,
  boundary: unknown | null,
  entityId?: string
) {
  const { fitBounds } = useMapContext();

  useEffect(() => {
    if (bbox) {
      console.info('[useMapFocus] focusing using bbox', { entityId, bbox });
      fitBounds(bbox, { padding: 60, maxZoom: 7 });
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
          { entityId, bbox: calculatedBbox }
        );
        fitBounds(calculatedBbox, { padding: 60, maxZoom: 7 });
        return;
      }
    }

    console.info('[useMapFocus] no geometry available for focus', { entityId });
  }, [bbox, boundary, entityId, fitBounds]);
}
