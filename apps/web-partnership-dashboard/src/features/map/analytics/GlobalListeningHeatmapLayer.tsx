'use client';

import React from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import { useMapContext } from '../context/MapContext';
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
  const [viewportBounds, setViewportBounds] = React.useState<
    [number, number, number, number] | null
  >(null);
  const [zoom, setZoom] = React.useState<number>(1.5);
  const [fadeOpacity, setFadeOpacity] = React.useState<number>(1);
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
  const fadeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
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
          // Fade out old data
          setFadeOpacity(0);

          // After fade out, update bounds and fade in
          if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
          }

          fadeTimeoutRef.current = setTimeout(() => {
            setViewportBounds(expandedBounds);
            setFadeOpacity(1);
          }, 300); // Match fade duration
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
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [mapRef, show]);

  // Fetch heatmap data based on viewport
  const heatmapQuery = useQuery({
    enabled: show && viewportBounds !== null,
    queryKey: [
      'global-sessions-heatmap',
      viewportBounds,
      timePeriodHours,
      zoom,
    ],
    queryFn: () =>
      fetchGlobalSessionsHeatmap({
        bbox: viewportBounds!,
        timePeriodHours,
        zoom,
      }),
    staleTime: 2 * 60 * 1000, // 2 minutes
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
  React.useEffect(() => {
    if (!show || !mapRef.current) return;

    const map = mapRef.current.getMap() as maplibregl.Map | undefined;
    if (!map || !map.getLayer('global-listening-heatmap-layer')) return;

    // Calculate base intensity multiplier based on pulse
    // Pulse ranges from 0 to 1, so we add 0.1 to 0.3 multiplier (10-30% increase)
    const pulseMultiplier = 1 + pulseAnimationTime * 0.2;

    try {
      // Update intensity with pulse effect
      map.setPaintProperty(
        'global-listening-heatmap-layer',
        'heatmap-intensity',
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.8 * pulseMultiplier,
          6,
          1.2 * pulseMultiplier,
          9,
          1.6 * pulseMultiplier,
        ]
      );
    } catch (error) {
      // Layer might not be loaded yet, ignore
      console.debug('Error updating heatmap intensity:', error);
    }
  }, [show, pulseAnimationTime, mapRef]);

  if (!show || !heatmapQuery.data || heatmapQuery.data.length === 0) {
    return null;
  }

  const featureCollection = toFeatureCollection(heatmapQuery.data);
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
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'weight'],
              0,
              0,
              8,
              1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              0.8,
              6,
              1.2,
              9,
              1.6,
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              2,
              4,
              10,
              8,
              22,
              12,
              30,
            ],
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'ageNormalized'],
              0,
              0.3 * fadeOpacity, // Older points: lower opacity
              1,
              0.7 * fadeOpacity, // Recent points: higher opacity
            ],
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
