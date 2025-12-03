import { useEffect } from 'react';
import { useMapContext } from '../context/MapContext';
import { useMobileSheet } from '../context/MobileSheetContext';

/**
 * Hook for automatically flying to a specific point on the map.
 * Handles mobile sheet dragging check and provides default view reset.
 */
export function useMapFlyTo(
  coordinates: [number, number] | null, // [longitude, latitude]
  zoom: number,
  entityId?: string
) {
  const { flyTo } = useMapContext();
  const mobileSheet = useMobileSheet();

  useEffect(() => {
    // Skip map updates while the mobile sheet is being dragged
    // This prevents the map from panning/zooming during sheet drag gestures
    if (mobileSheet.isDragging) {
      return;
    }

    if (coordinates) {
      const [longitude, latitude] = coordinates;
      flyTo({ longitude, latitude, zoom });
    }
  }, [coordinates, zoom, entityId, flyTo, mobileSheet.isDragging]);
}

/**
 * Hook for resetting map to default view state.
 */
export function useMapResetToDefault() {
  const { flyTo } = useMapContext();
  const mobileSheet = useMobileSheet();

  const reset = () => {
    if (mobileSheet.isDragging) {
      return;
    }
    // Default view state: longitude: 0, latitude: 20, zoom: 1.5
    flyTo({ longitude: 0, latitude: 20, zoom: 1.5 });
  };

  return reset;
}
