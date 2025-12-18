import { useCallback, useMemo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { useTheme } from '../../theme';
import { X } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface Location {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  location: { lat: number; lng: number } | null;
  onLocationChange: (location: { lat: number; lng: number } | null) => void;
  height?: string;
}

export function LocationPicker({
  location,
  onLocationChange,
  height = '400px',
}: LocationPickerProps) {
  const { resolvedTheme } = useTheme();

  // Determine map style based on theme
  const mapStyle = useMemo(() => {
    return resolvedTheme === 'light'
      ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }, [resolvedTheme]);

  // Initial view state - center on location if available, otherwise default to world view
  const initialViewState = useMemo(() => {
    if (location) {
      return {
        longitude: location.lng,
        latitude: location.lat,
        zoom: 10,
      };
    }
    return {
      longitude: 0,
      latitude: 20,
      zoom: 1.5,
    };
  }, [location]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      onLocationChange({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      });
    },
    [onLocationChange]
  );

  const handleMarkerDrag = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      onLocationChange({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      });
    },
    [onLocationChange]
  );

  const handleRemoveLocation = useCallback(() => {
    onLocationChange(null);
  }, [onLocationChange]);

  return (
    <div className='relative'>
      <div
        className='rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700'
        style={{ height }}>
        <Map
          mapLib={maplibregl}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
          cursor='crosshair'>
          {location && (
            <Marker
              longitude={location.lng}
              latitude={location.lat}
              draggable
              onDrag={handleMarkerDrag}
              anchor='center'>
              <div className='relative'>
                <div className='w-6 h-6 bg-primary-600 dark:bg-primary-500 rounded-full border-2 border-white dark:border-neutral-900 shadow-lg' />
                <div className='absolute inset-0 w-6 h-6 bg-primary-600 dark:bg-primary-500 rounded-full animate-ping opacity-20' />
              </div>
            </Marker>
          )}
          <NavigationControl position='bottom-right' />
        </Map>
      </div>
      {location && (
        <div className='mt-2 flex items-center justify-between'>
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            <span className='font-medium'>Lat:</span> {location.lat.toFixed(6)},{' '}
            <span className='font-medium'>Lng:</span> {location.lng.toFixed(6)}
          </div>
          <button
            onClick={handleRemoveLocation}
            className='flex items-center gap-1 px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
            type='button'>
            <X className='h-4 w-4' />
            Remove Location
          </button>
        </div>
      )}
      {!location && (
        <div className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
          Click on the map to set a location
        </div>
      )}
    </div>
  );
}
