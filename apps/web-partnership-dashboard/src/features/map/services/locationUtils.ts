/**
 * Extract coordinates from PostGIS geometry (point)
 * Handles various formats that PostgREST might return
 */
export function extractPointCoordinates(
  location: unknown
): [number, number] | null {
  if (!location || typeof location !== 'object') return null;

  // Case 1: Already GeoJSON format { type: 'Point', coordinates: [lon, lat] }
  if (
    'type' in location &&
    location.type === 'Point' &&
    'coordinates' in location &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length >= 2
  ) {
    const [lon, lat] = location.coordinates;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return [lon, lat];
    }
  }

  // Case 2: PostGIS EWKB format (hex string) - would need parsing, but PostgREST usually converts
  // Case 3: Direct coordinates array [lon, lat]
  if (Array.isArray(location) && location.length >= 2) {
    const [lon, lat] = location;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return [lon, lat];
    }
  }

  // Case 4: Object with x/y or lon/lat properties
  if ('x' in location && 'y' in location) {
    const x = (location as any).x;
    const y = (location as any).y;
    if (typeof x === 'number' && typeof y === 'number') {
      return [x, y]; // Assuming x is longitude, y is latitude
    }
  }

  if ('lon' in location && 'lat' in location) {
    const lon = (location as any).lon;
    const lat = (location as any).lat;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return [lon, lat];
    }
  }

  return null;
}
