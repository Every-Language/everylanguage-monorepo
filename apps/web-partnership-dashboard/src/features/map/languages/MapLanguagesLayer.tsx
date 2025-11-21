'use client';

import React from 'react';
import { Source, Layer, Popup } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMapContext } from '../context/MapContext';
import { useSetSelection } from '../inspector/state/inspectorStore';
import { useTheme } from '@/shared/theme';
import { fetchLanguagesWithLocation } from './api';
import type { LanguageWithLocation } from './types';

interface MapLanguagesLayerProps {
  show: boolean;
}

interface HoveredLanguage {
  language: LanguageWithLocation;
  coordinates: [number, number];
}

// Helper function to determine color based on bible translation status
function getBibleStatusColor(language: LanguageWithLocation): string {
  if (language.has_full_audio_bible === true) {
    return '#10b981'; // Green - success-600
  }
  if (
    language.has_audio_portions === true ||
    language.has_text_portions === true
  ) {
    return '#f59e0b'; // Orange - warning-500
  }
  return '#ef4444'; // Red - error-600
}

// Helper function to get bible status text
function getBibleStatusText(language: LanguageWithLocation): string {
  const statuses: string[] = [];
  if (language.has_full_audio_bible === true) {
    statuses.push('Full Audio Bible');
  }
  if (language.has_audio_portions === true) {
    statuses.push('Audio Portions');
  }
  if (language.has_text_portions === true) {
    statuses.push('Text Portions');
  }
  if (statuses.length === 0) {
    return 'No Translation';
  }
  return statuses.join(', ');
}

// Convert languages to GeoJSON FeatureCollection
function toFeatureCollection(
  languages: LanguageWithLocation[]
): GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    language_entity_id: string;
    language_name: string;
    region_name: string;
    color: string;
    has_full_audio_bible: boolean | null;
    has_audio_portions: boolean | null;
    has_text_portions: boolean | null;
  }
> {
  const features: GeoJSON.Feature<
    GeoJSON.Point,
    {
      language_entity_id: string;
      language_name: string;
      region_name: string;
      color: string;
      has_full_audio_bible: boolean | null;
      has_audio_portions: boolean | null;
      has_text_portions: boolean | null;
    }
  >[] = languages.map(lang => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lang.longitude, lang.latitude],
    },
    properties: {
      language_entity_id: lang.language_entity_id,
      language_name: lang.language_name,
      region_name: lang.region_name,
      color: getBibleStatusColor(lang),
      has_full_audio_bible: lang.has_full_audio_bible,
      has_audio_portions: lang.has_audio_portions,
      has_text_portions: lang.has_text_portions,
    },
  }));

  return { type: 'FeatureCollection', features };
}

export const MapLanguagesLayer: React.FC<MapLanguagesLayerProps> = ({
  show,
}) => {
  const { mapRef } = useMapContext();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const setSelection = useSetSelection();
  const [viewportBounds, setViewportBounds] = React.useState<
    [number, number, number, number] | null
  >(null);
  const [zoom, setZoom] = React.useState<number>(1.5);
  const [hoveredLanguage, setHoveredLanguage] =
    React.useState<HoveredLanguage | null>(null);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Track viewport bounds and zoom
  React.useEffect(() => {
    if (!show) return;

    const map = mapRef.current?.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    const updateViewport = () => {
      try {
        const bounds = map.getBounds();
        if (!bounds) return;

        const currentZoom = map.getZoom();
        setZoom(currentZoom);

        // Expand bounds by 5% for better coverage (smaller than heatmap since points are discrete)
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const lngSpan = ne.lng - sw.lng;
        const latSpan = ne.lat - sw.lat;

        const expandedBounds: [number, number, number, number] = [
          sw.lng - lngSpan * 0.05, // minLng
          sw.lat - latSpan * 0.05, // minLat
          ne.lng + lngSpan * 0.05, // maxLng
          ne.lat + latSpan * 0.05, // maxLat
        ];

        // Debounce viewport updates (300ms)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          // Only update if bounds have changed significantly
          const boundsChanged =
            !viewportBounds ||
            Math.abs(expandedBounds[0] - viewportBounds[0]) > 0.01 ||
            Math.abs(expandedBounds[1] - viewportBounds[1]) > 0.01 ||
            Math.abs(expandedBounds[2] - viewportBounds[2]) > 0.01 ||
            Math.abs(expandedBounds[3] - viewportBounds[3]) > 0.01;

          if (boundsChanged) {
            setViewportBounds(expandedBounds);
          }
        }, 300);
      } catch (error) {
        console.debug('Error updating viewport:', error);
      }
    };

    // Initial update
    updateViewport();

    // Update on map move/zoom
    map.on('moveend', updateViewport);
    map.on('zoomend', updateViewport);
    map.on('resize', updateViewport);

    return () => {
      map.off('moveend', updateViewport);
      map.off('zoomend', updateViewport);
      map.off('resize', updateViewport);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // viewportBounds intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, show]);

  // Fetch languages data based on viewport
  const languagesQuery = useQuery({
    enabled: show && viewportBounds !== null,
    queryKey: ['languages-with-location', viewportBounds, zoom],
    queryFn: () => {
      return fetchLanguagesWithLocation({
        bbox: viewportBounds!,
        zoom,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
    // Keep previous data while fetching to prevent blinking
    placeholderData: previousData =>
      previousData as LanguageWithLocation[] | undefined,
  });

  // Convert to GeoJSON FeatureCollection
  const featureCollection = React.useMemo(() => {
    if (!languagesQuery.data || languagesQuery.data.length === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }
    return toFeatureCollection(languagesQuery.data);
  }, [languagesQuery.data]);

  // Theme colors for stroke
  const markerStrokeColor = React.useMemo(() => {
    return resolvedTheme === 'light' ? '#ffffff' : '#1e1e1e';
  }, [resolvedTheme]);

  // Handle mouse events for hover tooltips and click selection
  React.useEffect(() => {
    if (!show) return;

    const map = mapRef.current?.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      try {
        // Check if layer exists before querying
        if (!map.getLayer('languages-layer')) {
          setHoveredLanguage(null);
          return;
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: ['languages-layer'],
        });

        // Update cursor style
        map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';

        // Update hovered language
        if (features.length > 0) {
          const feature = features[0];
          const props = feature.properties as {
            language_entity_id?: string;
            language_name?: string;
            region_name?: string;
            color?: string;
            has_full_audio_bible?: boolean | null;
            has_audio_portions?: boolean | null;
            has_text_portions?: boolean | null;
          };
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];

          if (
            props.language_entity_id &&
            props.language_name &&
            props.region_name &&
            coords
          ) {
            // Find the full language data
            const languageData = languagesQuery.data?.find(
              lang => lang.language_entity_id === props.language_entity_id
            );

            if (languageData) {
              setHoveredLanguage({
                language: languageData,
                coordinates: coords,
              });
            }
          }
        } else {
          setHoveredLanguage(null);
        }
      } catch (error) {
        console.debug('Error querying language features:', error);
      }
    };

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      try {
        if (!map.getLayer('languages-layer')) {
          return;
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: ['languages-layer'],
        });

        if (features.length > 0) {
          // Stop event propagation to prevent MapShell click handler from firing
          e.originalEvent?.stopPropagation?.();

          const feature = features[0];
          const props = feature.properties as {
            language_entity_id?: string;
          };

          if (props.language_entity_id) {
            // Set selection
            setSelection({
              kind: 'language_entity',
              id: props.language_entity_id,
            });
            // Navigate to language page
            router.push(
              `/map/language/${encodeURIComponent(props.language_entity_id)}`
            );
          }
        }
      } catch (error) {
        console.debug('Error handling language click:', error);
      }
    };

    const handleMouseLeave = () => {
      setHoveredLanguage(null);
      map.getCanvas().style.cursor = '';
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);
    map.on('mouseleave', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      map.off('mouseleave', handleMouseLeave);
    };
  }, [mapRef, show, languagesQuery.data, router, setSelection]);

  // Keep showing previous data while loading new data
  const displayData = languagesQuery.data;

  if (
    !show ||
    !displayData ||
    !Array.isArray(displayData) ||
    displayData.length === 0 ||
    featureCollection.features.length === 0
  ) {
    return null;
  }

  return (
    <>
      <Source id='languages-source' type='geojson' data={featureCollection}>
        {/* Main language markers */}
        <Layer
          id='languages-layer'
          type='circle'
          paint={{
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              3,
              6,
              5,
              12,
              8,
            ],
            'circle-color': ['get', 'color'],
            'circle-stroke-color': markerStrokeColor,
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.9,
          }}
        />
      </Source>

      {/* Hover tooltip popup */}
      {hoveredLanguage && (
        <Popup
          longitude={hoveredLanguage.coordinates[0]}
          latitude={hoveredLanguage.coordinates[1]}
          closeButton={false}
          closeOnClick={false}
          anchor='bottom'
          offset={[0, -8]}
          className='languages-popup'
        >
          <div className='px-2 py-1.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded border border-neutral-200 dark:border-neutral-700 shadow-sm min-w-[180px]'>
            <div className='font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100'>
              Language
            </div>
            <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
              {hoveredLanguage.language.language_name}
            </div>
            <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 mb-2'>
              {hoveredLanguage.language.region_name}
            </div>
            {/* Bible status breakdown */}
            <div className='mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700'>
              <div className='text-xs font-medium mb-1 text-neutral-900 dark:text-neutral-100'>
                Bible Translation Status
              </div>
              <div className='text-xs text-neutral-600 dark:text-neutral-400'>
                {getBibleStatusText(hoveredLanguage.language)}
              </div>
            </div>
          </div>
        </Popup>
      )}

      {/* CSS for popup dark mode styling */}
      <style>{`
        .languages-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .languages-popup .maplibregl-popup-tip {
          border-top-color: rgb(229 231 235) !important;
        }
        .dark .languages-popup .maplibregl-popup-tip {
          border-top-color: rgb(55 65 81) !important;
        }
      `}</style>
    </>
  );
};
