/**
 * BBox Calculator Service
 *
 * Utilities for calculating bounding boxes from GeoJSON geometries.
 */

export type BBox = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

/**
 * Calculate bounding box from a GeoJSON geometry, feature, or feature collection.
 */
export function calculateBboxFromGeometry(
  geom: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry | unknown
): BBox | null {
  if (!geom || typeof geom !== 'object') return null;

  const coords: number[][] = [];

  const extractCoordinates = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;

    const g = obj as {
      type?: string;
      coordinates?: unknown;
      geometry?: unknown;
      features?: unknown[];
    };

    if (g.type === 'FeatureCollection' && Array.isArray(g.features)) {
      g.features.forEach(extractCoordinates);
      return;
    }

    if (g.type === 'Feature' && g.geometry) {
      extractCoordinates(g.geometry);
      return;
    }

    if (!g.coordinates) return;

    const flattenCoords = (arr: unknown): void => {
      if (!Array.isArray(arr)) return;
      if (
        arr.length === 2 &&
        typeof arr[0] === 'number' &&
        typeof arr[1] === 'number'
      ) {
        coords.push([arr[0], arr[1]]);
      } else {
        arr.forEach(flattenCoords);
      }
    };

    flattenCoords(g.coordinates);
  };

  extractCoordinates(geom);

  if (coords.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  if (
    !Number.isFinite(minLng) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLng) ||
    !Number.isFinite(maxLat)
  ) {
    return null;
  }

  return [minLng, minLat, maxLng, maxLat];
}
