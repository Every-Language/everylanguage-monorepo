/**
 * Extract location from PostGIS geometry (point)
 * Handles various formats that PostgREST might return
 * PostGIS returns GeoJSON format: { type: 'Point', coordinates: [lng, lat] }
 */
export function extractLocation(
  location: unknown
): { lat: number; lng: number } | null {
  if (!location || typeof location !== 'object') return null;

  // Case 1: GeoJSON format { type: 'Point', coordinates: [lon, lat] }
  if (
    'type' in location &&
    location.type === 'Point' &&
    'coordinates' in location
  ) {
    const coords = (location as { coordinates: unknown }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lng, lat] = coords;
      if (typeof lng === 'number' && typeof lat === 'number') {
        return { lat, lng };
      }
    }
  }

  // Case 2: Direct coordinates array [lon, lat]
  if (Array.isArray(location) && location.length >= 2) {
    const [lng, lat] = location;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return { lat, lng };
    }
  }

  // Case 3: Object with x/y or lon/lat properties
  if ('x' in location && 'y' in location) {
    const x = (location as { x: unknown }).x;
    const y = (location as { y: unknown }).y;
    if (typeof x === 'number' && typeof y === 'number') {
      return { lat: y, lng: x }; // Assuming x is longitude, y is latitude
    }
  }

  if ('lon' in location && 'lat' in location) {
    const lon = (location as { lon: unknown }).lon;
    const lat = (location as { lat: unknown }).lat;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return { lat, lng: lon };
    }
  }

  return null;
}

/**
 * Convert location to PostGIS GeoJSON point format
 * Format: { type: 'Point', coordinates: [lng, lat] }
 */
export function locationToPostGIS(
  location: { lat: number; lng: number } | null
): { type: 'Point'; coordinates: [number, number] } | null {
  if (!location) return null;
  return {
    type: 'Point',
    coordinates: [location.lng, location.lat],
  };
}
