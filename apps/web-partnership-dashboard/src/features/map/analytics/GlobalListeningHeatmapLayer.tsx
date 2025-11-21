'use client';

import React from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import { useMapContext } from '../context/MapContext';
import { useSelection } from '../inspector/state/inspectorStore';
import { fetchGlobalSessionsHeatmap, fetchLanguageNames } from './api';
import type { GlobalHeatmapPoint, ColorGradient } from './types';
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';

interface GlobalListeningHeatmapLayerProps {
  show: boolean;
  timePeriodHours: number;
  colorGradient: ColorGradient;
}

// Convert color gradient to MapLibre expression
function colorGradientToExpression(
  gradient: ColorGradient
): ExpressionSpecification {
  const stops: Array<[number, string]> = gradient.map(stop => [
    stop.position,
    stop.color,
  ]);
  // Flatten stops array manually for compatibility
  const flattened: Array<number | string> = [];
  for (const stop of stops) {
    flattened.push(stop[0], stop[1]);
  }
  return [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    ...flattened,
  ] as unknown as ExpressionSpecification;
}

// Convert heatmap points to GeoJSON FeatureCollection
function toFeatureCollection(
  points: GlobalHeatmapPoint[]
): GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    weight: number;
    ageNormalized: number;
    mostRecentSessionStart: string | null;
    mostRecentChapterListen: string | null;
    languages: string[];
    sessionCount: number;
    totalDurationSeconds: number;
  }
> {
  const features: GeoJSON.Feature<
    GeoJSON.Point,
    {
      weight: number;
      ageNormalized: number;
      mostRecentSessionStart: string | null;
      mostRecentChapterListen: string | null;
      languages: string[];
      sessionCount: number;
      totalDurationSeconds: number;
    }
  >[] = points.map(p => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [p.lon, p.lat],
    },
    properties: {
      weight: p.intensity,
      ageNormalized: p.ageNormalized,
      mostRecentSessionStart: p.mostRecentSessionStart,
      mostRecentChapterListen: p.mostRecentChapterListen,
      languages: p.languages,
      sessionCount: p.sessionCount,
      totalDurationSeconds: p.totalDurationSeconds,
    },
  }));

  return { type: 'FeatureCollection', features };
}

export const GlobalListeningHeatmapLayer: React.FC<
  GlobalListeningHeatmapLayerProps
> = ({ show, timePeriodHours, colorGradient }) => {
  const { mapRef } = useMapContext();
  const selection = useSelection();
  const [viewportBounds, setViewportBounds] = React.useState<
    [number, number, number, number] | null
  >(null);
  const [zoom, setZoom] = React.useState<number>(1.5);

  // Extract filter values from selection
  const languageEntityId =
    selection?.kind === 'language_entity' ? selection.id : null;
  const regionId = selection?.kind === 'region' ? selection.id : null;
  // Removed fadeOpacity - not needed since we keep previous data during fetch
  const [pulseAnimationTime, setPulseAnimationTime] = React.useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    point: GlobalHeatmapPoint;
    languages: Record<string, string>;
    x: number;
    y: number;
  } | null>(null);
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
        // Check if map is loaded before trying to get bounds
        if (!map.loaded()) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        const currentZoom = map.getZoom();
        setZoom(currentZoom);

        // Expand bounds by 10% for fade-in effect (render slightly larger than viewport)
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
          // Only update if bounds have changed significantly (avoid unnecessary fetches)
          // Compare with previous bounds to prevent refetching on tiny movements
          const boundsChanged =
            !viewportBounds ||
            Math.abs(expandedBounds[0] - viewportBounds[0]) > 0.01 ||
            Math.abs(expandedBounds[1] - viewportBounds[1]) > 0.01 ||
            Math.abs(expandedBounds[2] - viewportBounds[2]) > 0.01 ||
            Math.abs(expandedBounds[3] - viewportBounds[3]) > 0.01;

          if (boundsChanged) {
            // Update bounds immediately - React Query will keep previous data while fetching
            // This prevents the blinking effect
            setViewportBounds(expandedBounds);
          }
        }, 300);
      } catch (error) {
        console.debug('Error updating viewport:', error);
      }
    };

    // If map is already loaded, update viewport immediately
    // Otherwise, wait for the 'load' event
    if (map.loaded()) {
      updateViewport();
    } else {
      // Wait for map to load before getting bounds
      map.once('load', updateViewport);
    }

    // Update on map move/zoom
    map.on('moveend', updateViewport);
    map.on('zoomend', updateViewport);
    map.on('resize', updateViewport);

    return () => {
      map.off('load', updateViewport);
      map.off('moveend', updateViewport);
      map.off('zoomend', updateViewport);
      map.off('resize', updateViewport);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // viewportBounds intentionally excluded from deps - we only read it for comparison, not to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, show]);

  // Fetch heatmap data based on viewport
  const heatmapQuery = useQuery({
    enabled: show && viewportBounds !== null,
    queryKey: [
      'global-sessions-heatmap',
      viewportBounds,
      timePeriodHours,
      zoom,
      languageEntityId,
      regionId,
    ],
    queryFn: () => {
      return fetchGlobalSessionsHeatmap({
        bbox: viewportBounds!,
        timePeriodHours,
        zoom,
        languageEntityId: languageEntityId ?? undefined,
        regionId: regionId ?? undefined,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 2 minutes - RPC is faster, less frequent updates needed)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time (keep cached data longer)
    // Keep previous data while fetching to prevent blinking
    placeholderData: previousData =>
      previousData as GlobalHeatmapPoint[] | undefined,
  });

  // Fetch language names for hover tooltip
  const languageIds = React.useMemo(() => {
    if (!hoveredPoint) return [];
    return hoveredPoint.point.languages;
  }, [hoveredPoint]);

  const languageNamesQuery = useQuery({
    enabled: languageIds.length > 0,
    queryKey: ['language-names', languageIds],
    queryFn: () => fetchLanguageNames(languageIds),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Update hovered point languages when names are fetched
  React.useEffect(() => {
    if (hoveredPoint && languageNamesQuery.data) {
      setHoveredPoint({
        ...hoveredPoint,
        languages: languageNamesQuery.data,
      });
    }
  }, [hoveredPoint, languageNamesQuery.data]);

  // Handle mouse events for hover tooltips
  React.useEffect(() => {
    if (!show) return;

    const map = mapRef.current?.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      try {
        // Check if layer exists before querying
        if (!map.getLayer('global-listening-heatmap-layer')) {
          setHoveredPoint(null);
          return;
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: ['global-listening-heatmap-layer'],
        });

        if (features.length > 0) {
          const feature = features[0];
          const props = feature.properties as {
            weight?: number;
            ageNormalized?: number;
            mostRecentSessionStart?: string | null;
            mostRecentChapterListen?: string | null;
            languages?: string[];
            sessionCount?: number;
            totalDurationSeconds?: number;
          };

          if (props.languages && Array.isArray(props.languages)) {
            const point: GlobalHeatmapPoint = {
              lon: (feature.geometry as GeoJSON.Point).coordinates[0],
              lat: (feature.geometry as GeoJSON.Point).coordinates[1],
              intensity: Number(props.weight ?? 0),
              sessionCount: Number(props.sessionCount ?? 0),
              totalDurationSeconds: Number(props.totalDurationSeconds ?? 0),
              mostRecentSessionStart: props.mostRecentSessionStart ?? null,
              mostRecentChapterListen: props.mostRecentChapterListen ?? null,
              languages: props.languages,
              ageNormalized: Number(props.ageNormalized ?? 0),
            };

            setHoveredPoint({
              point,
              languages: {},
              x: e.point.x,
              y: e.point.y,
            });
          }
        } else {
          setHoveredPoint(null);
        }
      } catch (error) {
        console.debug('Error querying heatmap features:', error);
      }
    };

    const handleMouseLeave = () => {
      setHoveredPoint(null);
    };

    map.on('mousemove', handleMouseMove);
    map.on('mouseleave', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseleave', handleMouseLeave);
    };
  }, [mapRef, show]);

  // Animate pulse effect for recent sessions
  React.useEffect(() => {
    if (!show) {
      setPulseAnimationTime(0);
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 2000; // 2 seconds per pulse cycle

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;

      // Use sine wave for smooth pulsing effect (0 to 1)
      const pulseValue = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
      setPulseAnimationTime(pulseValue);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [show]);

  // Apply pulsing effect to heatmap intensity dynamically
  // Pulse multiplies the constant intensity (adds 0-20% boost)
  React.useEffect(() => {
    if (!show || !mapRef.current) return;

    const map = mapRef.current.getMap() as maplibregl.Map | undefined;
    if (!map || !map.getLayer('global-listening-heatmap-layer')) return;

    // Calculate pulse multiplier (1.0 to 1.2, adding 0-20% boost)
    const pulseMultiplier = 1 + pulseAnimationTime * 0.2;

    try {
      // Multiply the constant intensity by pulse multiplier
      map.setPaintProperty(
        'global-listening-heatmap-layer',
        'heatmap-intensity',
        1.6 * pulseMultiplier // Constant 1.6 * pulse (1.0 to 1.2)
      );
    } catch (error) {
      // Layer might not be loaded yet, ignore
      console.debug('Error updating heatmap intensity pulse:', error);
    }
  }, [show, pulseAnimationTime, mapRef]);

  // Keep showing previous data while loading new data to prevent blinking
  const displayData = heatmapQuery.data;

  if (
    !show ||
    !displayData ||
    !Array.isArray(displayData) ||
    displayData.length === 0
  ) {
    return null;
  }

  const featureCollection = toFeatureCollection(displayData);
  const colorExpression = colorGradientToExpression(colorGradient);

  return (
    <>
      <Source
        id='global-listening-heatmap'
        type='geojson'
        data={featureCollection}
      >
        <Layer
          id='global-listening-heatmap-layer'
          type='heatmap'
          paint={{
            // HEATMAP-WEIGHT: Controls how much each data point contributes to the heat
            // Data-driven: scales with session count AND total duration
            // Higher session count and duration = higher weight = stronger contribution
            // Combines both factors: sessionCount (log scale) + normalized duration
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              [
                '+',
                // Session count component (log scale, 0-1 range)
                [
                  'interpolate',
                  ['linear'],
                  ['log10', ['+', ['get', 'sessionCount'], 1]],
                  0,
                  0, // log10(1) = 0 → 0
                  1,
                  0.5, // log10(10) = 1 → 0.5
                  2,
                  0.8, // log10(100) = 2 → 0.8
                  3,
                  1.0, // log10(1000) = 3 → 1.0
                ],
                // Duration component (normalized, 0-0.5 range)
                // Duration in hours, normalized to 0-0.5 contribution
                [
                  'interpolate',
                  ['linear'],
                  [
                    'log10',
                    [
                      '+',
                      [
                        '/',
                        ['get', 'totalDurationSeconds'],
                        3600, // Convert seconds to hours
                      ],
                      1,
                    ],
                  ],
                  0,
                  0, // log10(1 hour) = 0 → 0
                  1,
                  0.1, // log10(10 hours) = 1 → 0.1
                  2,
                  0.2, // log10(100 hours) = 2 → 0.2
                  3,
                  0.3, // log10(1000 hours) = 3 → 0.3
                  4,
                  0.5, // log10(10000 hours) = 4 → 0.5
                ],
              ],
              0,
              0, // Combined 0 → weight 0
              0.5,
              0.3, // Combined 0.5 → weight 0.3
              1.0,
              0.6, // Combined 1.0 → weight 0.6
              1.5,
              1.0, // Combined 1.5 → weight 1.0 (max)
            ],

            // HEATMAP-INTENSITY: Multiplier for the overall heatmap strength (GLOBAL, not per-point)
            // Higher = brighter/more intense heatmap
            // Lower = dimmer/subtler heatmap
            // This affects how "hot" the colors appear
            // NOTE: This is GLOBAL - affects entire layer uniformly
            // Per-point variation is handled by heatmap-weight instead
            // Constant value (not zoom-based)
            'heatmap-intensity': 1,

            // HEATMAP-RADIUS: Size of each heat point in pixels
            // Larger radius = bigger, more spread out heat blobs
            // Smaller radius = tighter, more concentrated heat
            // This is the "spread" of heat around each data point
            // Data-driven: scales with session count AND total duration (not zoom)
            'heatmap-radius': [
              '+', // Add base radius to combined session+duration boost
              10, // Base radius (constant, not zoom-based)
              [
                '+',
                // Session count component
                [
                  'interpolate',
                  ['linear'],
                  ['log10', ['+', ['get', 'sessionCount'], 1]],
                  0,
                  0, // log10(1) = 0 → no boost
                  1,
                  3, // log10(10) = 1 → small boost (3px)
                  2,
                  8, // log10(100) = 2 → medium boost (8px)
                  3,
                  12, // log10(1000) = 3 → large boost (12px)
                ],
                // Duration component (in hours)
                [
                  'interpolate',
                  ['linear'],
                  [
                    'log10',
                    [
                      '+',
                      [
                        '/',
                        ['get', 'totalDurationSeconds'],
                        3600, // Convert seconds to hours
                      ],
                      1,
                    ],
                  ],
                  0,
                  0, // log10(1 hour) = 0 → no boost
                  1,
                  2, // log10(10 hours) = 1 → small boost (2px)
                  2,
                  5, // log10(100 hours) = 2 → medium boost (5px)
                  3,
                  8, // log10(1000 hours) = 3 → large boost (8px)
                  4,
                  12, // log10(10000 hours) = 4 → extra boost (12px)
                ],
              ],
            ],
            // [
            //   'interpolate',
            //   ['linear'],
            //   ['zoom'],
            //   0,   // At zoom level 0,
            //   20,  //   radius = 20px (large blobs for global view)
            //   2,   // At zoom level 2,
            //   25,  //   radius = 15px
            //   4,   // At zoom level 4 (continent/country view),
            //   30,  //   radius = 12px (increased from 10px for mid-zoom)
            //   8,   // At zoom level 8 (city view),
            //   25,  //   radius = 22px
            //   12,  // At zoom level 12 (street view),
            //   20,  //   radius = 30px
            // ],

            // HEATMAP-OPACITY: Overall transparency of the heatmap layer
            // 0.0 = completely transparent (invisible)
            // 1.0 = completely opaque (fully visible)
            // Lower opacity = more subtle, lets map features show through
            // Higher opacity = more prominent, dominates the map
            'heatmap-opacity': 0.7,
            'heatmap-color': colorExpression,
          }}
        />
      </Source>

      {/* Hover tooltip */}
      {hoveredPoint && (
        <div
          className='absolute pointer-events-none z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 max-w-xs'
          style={{
            left: `${hoveredPoint.x + 10}px`,
            top: `${hoveredPoint.y + 10}px`,
            transform: 'translate(0, 0)',
          }}
        >
          <div className='text-sm font-medium mb-2'>
            {hoveredPoint.point.sessionCount} session
            {hoveredPoint.point.sessionCount !== 1 ? 's' : ''}
          </div>
          <div className='text-xs text-neutral-600 dark:text-neutral-400 mb-2'>
            {Math.round(hoveredPoint.point.totalDurationSeconds / 60)} minutes
            total
          </div>
          {hoveredPoint.point.languages.length > 0 && (
            <div className='mt-2'>
              <div className='text-xs font-medium mb-1'>Languages:</div>
              <div className='text-xs text-neutral-600 dark:text-neutral-400 space-y-1'>
                {hoveredPoint.point.languages.map((langId, idx) => {
                  const langName =
                    hoveredPoint.languages[langId] || `Language ${idx + 1}`;
                  return (
                    <div key={langId}>
                      {idx === 0 && (
                        <span className='font-medium'>{langName}</span>
                      )}
                      {idx > 0 && <span>{langName}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
