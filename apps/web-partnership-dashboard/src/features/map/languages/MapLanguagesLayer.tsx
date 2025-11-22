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
  clustered?: boolean;
}

interface HoveredLanguage {
  language: LanguageWithLocation;
  coordinates: [number, number];
}

// Helper function to calculate bible status score (0-4)
// Used for clustering to calculate average status
// Score mapping:
// - 4 = Full Bible (green)
// - 3 = New Testament (yellow)
// - 2 = Portions (orange/red)
// - 0 = No Scripture (red)
function getBibleStatusScore(language: LanguageWithLocation): number {
  const category = getBibleStatusCategory(language);
  switch (category) {
    case 'full_bible':
      return 4; // Full Bible = highest score
    case 'new_testament':
      return 3; // New Testament = high score
    case 'portions':
      return 2; // Portions = medium score
    case 'no_scripture':
      return 0; // No Scripture = lowest score
  }
}

// Helper function to determine color based on bible translation status
// Color scheme:
// - green = full bible (bible_status = 5 OR has_full_audio_bible)
// - yellow = full new testament but no old testament (bible_status = 4)
// - orange = portions OR audio recordings (JP or GRN) OR jesus film
// - red = no scripture
function getBibleStatusColor(language: LanguageWithLocation): string {
  // Green: Full Bible (bible_status = 5 OR has_full_audio_bible)
  if (language.bible_status === 5 || language.has_full_audio_bible === true) {
    return '#10b981'; // Green - success-600
  }

  // Yellow: Full New Testament but no Old Testament (bible_status = 4)
  if (language.bible_status === 4) {
    return '#eab308'; // Yellow - warning-500 (lighter yellow)
  }

  // Orange: Portions OR audio recordings (JP or GRN) OR jesus film
  if (
    language.has_text_portions === true ||
    language.has_audio_portions === true ||
    language.has_jesus_film === true ||
    (language.bible_status !== null &&
      language.bible_status > 0 &&
      language.bible_status < 4)
  ) {
    return '#eb6a38'; // Orange
  }

  // Red: No scripture
  return '#ef4444'; // Red - error-600
}

// Helper function to get bible status text and category
// Returns: 'full_bible' | 'new_testament' | 'portions' | 'no_scripture'
function getBibleStatusCategory(
  language: LanguageWithLocation
): 'full_bible' | 'new_testament' | 'portions' | 'no_scripture' {
  // Full Bible (bible_status = 5 OR has_full_audio_bible)
  if (language.bible_status === 5 || language.has_full_audio_bible === true) {
    return 'full_bible';
  }

  // Full New Testament but no Old Testament (bible_status = 4)
  if (language.bible_status === 4) {
    return 'new_testament';
  }

  // Portions OR audio recordings (JP or GRN) OR jesus film
  if (
    language.has_text_portions === true ||
    language.has_audio_portions === true ||
    language.has_jesus_film === true ||
    (language.bible_status !== null &&
      language.bible_status > 0 &&
      language.bible_status < 4)
  ) {
    return 'portions';
  }

  // No scripture
  return 'no_scripture';
}

// Helper function to get bible status text label
function getBibleStatusText(language: LanguageWithLocation): string {
  const category = getBibleStatusCategory(language);
  switch (category) {
    case 'full_bible':
      return 'Full Bible';
    case 'new_testament':
      return 'New Testament';
    case 'portions':
      return 'Portions';
    case 'no_scripture':
      return 'No Scripture';
  }
}

// Helper function to get bible status pill color
function getBibleStatusPillColor(language: LanguageWithLocation): string {
  const category = getBibleStatusCategory(language);
  switch (category) {
    case 'full_bible':
      return 'bg-success-600'; // Green
    case 'new_testament':
      return 'bg-warning-500'; // Yellow
    case 'portions':
      return 'bg-[#eb6a38]'; // Orange
    case 'no_scripture':
      return 'bg-error-600'; // Red
  }
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
      bible_status: number | null;
      has_jesus_film: boolean | null;
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
      bible_status_score: getBibleStatusScore(lang), // For clustering aggregation
      has_full_audio_bible: lang.has_full_audio_bible,
      has_audio_portions: lang.has_audio_portions,
      has_text_portions: lang.has_text_portions,
      bible_status: lang.bible_status,
      has_jesus_film: lang.has_jesus_film,
    },
  }));

  return { type: 'FeatureCollection', features };
}

export const MapLanguagesLayer: React.FC<MapLanguagesLayerProps> = ({
  show,
  clustered = false,
}) => {
  const { mapRef } = useMapContext();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const setSelection = useSetSelection();

  // Debug logging for clustering state
  React.useEffect(() => {
    if (show) {
      console.log('[MapLanguagesLayer] Clustering state:', {
        clustered,
        show,
      });
    }
  }, [clustered, show]);
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
        // Determine which layers to query based on clustering mode
        const layerIds = clustered
          ? ['languages-clusters', 'languages-unclustered']
          : ['languages-layer'];

        // Check if any layer exists
        const hasLayer = layerIds.some(id => map.getLayer(id));
        if (!hasLayer) {
          setHoveredLanguage(null);
          return;
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: layerIds,
        });

        // Update cursor style
        map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';

        // Update hovered language
        if (features.length > 0) {
          const feature = features[0];
          const props = feature.properties as {
            cluster?: boolean;
            cluster_id?: number;
            point_count?: number;
            language_entity_id?: string;
            language_name?: string;
            region_name?: string;
            color?: string;
            has_full_audio_bible?: boolean | null;
            has_audio_portions?: boolean | null;
            has_text_portions?: boolean | null;
            bible_status?: number | null;
            has_jesus_film?: boolean | null;
          };
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];

          // Skip clusters for hover (only show tooltip for individual points)
          if (props.cluster) {
            setHoveredLanguage(null);
            return;
          }

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
        // Determine which layers to query based on clustering mode
        const layerIds = clustered
          ? ['languages-clusters', 'languages-unclustered']
          : ['languages-layer'];

        const hasLayer = layerIds.some(id => map.getLayer(id));
        if (!hasLayer) {
          return;
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: layerIds,
        });

        if (features.length > 0) {
          // Stop event propagation to prevent MapShell click handler from firing
          e.originalEvent?.stopPropagation?.();

          const feature = features[0];
          const props = feature.properties as {
            cluster?: boolean;
            cluster_id?: number;
            point_count?: number;
            language_entity_id?: string;
          };

          // Handle cluster click - zoom in
          if (props.cluster && clustered) {
            const clusterId = props.cluster_id;
            const pointCount = props.point_count;
            if (clusterId !== undefined && pointCount !== undefined) {
              const source = map.getSource(
                'languages-source'
              ) as maplibregl.GeoJSONSource;
              if (
                source &&
                typeof source.getClusterExpansionZoom === 'function'
              ) {
                // TypeScript types don't include callback, but runtime API supports it
                (source.getClusterExpansionZoom as any)(
                  clusterId,
                  (err: Error | null, zoom?: number) => {
                    if (err || zoom === undefined) return;
                    const mapInstance = mapRef.current?.getMap();
                    if (mapInstance) {
                      const coords = (feature.geometry as GeoJSON.Point)
                        .coordinates as [number, number];
                      mapInstance.easeTo({
                        center: coords,
                        zoom: zoom,
                        duration: 500,
                      });
                    }
                  }
                );
              }
            }
            return;
          }

          // Handle individual point click
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
  }, [mapRef, show, clustered, languagesQuery.data, router, setSelection]);

  // Debug logging for feature collection
  React.useEffect(() => {
    if (show && featureCollection.features.length > 0) {
      console.log('[MapLanguagesLayer] Feature collection:', {
        featureCount: featureCollection.features.length,
        clustered,
        sampleFeatures: featureCollection.features.slice(0, 3).map(f => ({
          id: f.properties.language_entity_id,
          hasScore:
            typeof (f.properties as any).bible_status_score === 'number',
        })),
      });
    }
  }, [show, featureCollection, clustered]);

  // Clean up old layers when switching clustering modes
  React.useEffect(() => {
    if (!show) return;

    const map = mapRef.current?.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    // Remove old layers if they exist (in case of mode switch)
    const oldLayerIds = clustered
      ? ['languages-layer'] // Remove individual layer when switching to clustered
      : [
          'languages-clusters',
          'languages-cluster-count',
          'languages-unclustered',
        ]; // Remove cluster layers when switching to individual

    oldLayerIds.forEach(layerId => {
      if (map.getLayer(layerId)) {
        try {
          map.removeLayer(layerId);
        } catch {
          // Layer might not exist, ignore
        }
      }
    });
  }, [clustered, show, mapRef]);

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
      <Source
        key={`languages-source-${clustered ? 'clustered' : 'individual'}`}
        id='languages-source'
        type='geojson'
        data={featureCollection}
        {...(clustered
          ? {
              cluster: true,
              clusterRadius: 50,
              clusterMaxZoom: 4, // Clusters break apart into individual points when zoom >= 8
              clusterProperties: {
                // Aggregate bible status scores for average calculation
                sum_score: ['+', ['get', 'bible_status_score']],
              },
            }
          : {
              cluster: false,
            })}
      >
        {clustered ? (
          [
            /* Cluster circles */
            <Layer
              key='languages-clusters'
              id='languages-clusters'
              type='circle'
              filter={['has', 'point_count']}
              paint={{
                'circle-color': [
                  'interpolate',
                  ['linear'],
                  ['/', ['get', 'sum_score'], ['get', 'point_count']],
                  0,
                  '#ef4444', // Red - no scripture
                  2,
                  '#eb6a38', // Orange - portions
                  3,
                  '#eab308', // Yellow - new testament
                  4,
                  '#10b981', // Green - full bible
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  20, // Base radius for small clusters
                  100,
                  30, // Medium clusters
                  750,
                  40, // Large clusters
                ],
                'circle-stroke-color': markerStrokeColor,
                'circle-stroke-width': 2,
                'circle-opacity': 0.8,
              }}
            />,
            /* Cluster count labels */
            <Layer
              key='languages-cluster-count'
              id='languages-cluster-count'
              type='symbol'
              filter={['has', 'point_count']}
              layout={{
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-size': 12,
              }}
              paint={{
                'text-color': '#ffffff',
              }}
            />,
            /* Unclustered points */
            <Layer
              key='languages-unclustered'
              id='languages-unclustered'
              type='circle'
              filter={['!', ['has', 'point_count']]}
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
            />,
          ]
        ) : (
          /* Individual points (non-clustered mode) */
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
        )}
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
              <div className='text-xs font-medium mb-1.5 text-neutral-900 dark:text-neutral-100'>
                Bible Translation Status
              </div>
              <div className='flex items-center gap-2'>
                <span
                  className={`${getBibleStatusPillColor(hoveredLanguage.language)} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
                >
                  {getBibleStatusText(hoveredLanguage.language)}
                </span>
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
