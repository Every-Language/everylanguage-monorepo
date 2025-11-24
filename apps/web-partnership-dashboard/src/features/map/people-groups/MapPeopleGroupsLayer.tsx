'use client';

import React from 'react';
import { Source, Layer, Popup } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMapContext } from '../context/MapContext';
import {
  useSelection,
  useSetSelection,
  useSelectionMode,
} from '../inspector/state/inspectorStore';
import { useTheme } from '@/shared/theme';
import { fetchPeopleGroupsWithLocation } from './api';
import type { PeopleGroupWithLocation } from './types';

interface MapPeopleGroupsLayerProps {
  show: boolean;
  clustered?: boolean;
  opacity?: number;
}

interface HoveredPeopleGroup {
  peopleGroup: PeopleGroupWithLocation;
  coordinates: [number, number];
}

// Helper function to calculate JPScale score (0-5) for clustering
// Used for clustering to calculate average status
function getBibleStatusScore(peopleGroup: PeopleGroupWithLocation): number {
  const bibleStatus = peopleGroup.primary_language_bible_status;

  // Full Bible (bible_status = 5)
  if (bibleStatus === 5) return 5;

  // Full New Testament (bible_status = 4)
  if (bibleStatus === 4) return 4;

  // Portions (bible_status = 1-3)
  if (bibleStatus !== null && bibleStatus > 0 && bibleStatus < 4) return 2;

  // No scripture (bible_status = 0 or null)
  return 0;
}

// Helper function to determine color based on primary language bible translation status
// Color scheme (same as languages):
// - green = full bible (primary_language_bible_status = 5)
// - yellow = full new testament but no old testament (primary_language_bible_status = 4)
// - orange = portions (primary_language_bible_status = 1-3) OR has audio recordings OR has jesus film
// - red = no scripture (primary_language_bible_status = 0 or null)
function getPeopleGroupColor(peopleGroup: PeopleGroupWithLocation): string {
  const bibleStatus = peopleGroup.primary_language_bible_status;

  // Green: Full Bible (bible_status = 5)
  if (bibleStatus === 5) {
    return '#10b981'; // Green - success-600
  }

  // Yellow: Full New Testament but no Old Testament (bible_status = 4)
  if (bibleStatus === 4) {
    return '#eab308'; // Yellow - warning-500
  }

  // Orange: Portions OR audio recordings OR jesus film
  if (
    (bibleStatus !== null && bibleStatus > 0 && bibleStatus < 4) ||
    peopleGroup.has_audio_recordings === true ||
    peopleGroup.has_jesus_film === true
  ) {
    return '#eb6a38'; // Orange
  }

  // Red: No scripture
  return '#ef4444'; // Red - error-600
}

// Helper function to get status text label
function getPeopleGroupStatusText(
  peopleGroup: PeopleGroupWithLocation
): string {
  if (peopleGroup.least_reached === true) return 'Least Reached';
  if (peopleGroup.frontier === true) return 'Frontier';
  if (peopleGroup.jpscale !== null) return `Scale ${peopleGroup.jpscale}`;
  return 'Unknown';
}

// Helper function to get status pill color
function getPeopleGroupStatusPillColor(
  peopleGroup: PeopleGroupWithLocation
): string {
  if (peopleGroup.least_reached === true || peopleGroup.jpscale === 1) {
    return 'bg-error-600'; // Red
  }
  if (peopleGroup.frontier === true || peopleGroup.jpscale === 2) {
    return 'bg-[#eb6a38]'; // Orange
  }
  if (peopleGroup.jpscale === 3) {
    return 'bg-warning-500'; // Yellow
  }
  if (peopleGroup.jpscale === 4 || peopleGroup.jpscale === 5) {
    return 'bg-success-600'; // Green
  }
  return 'bg-neutral-500'; // Gray
}

// Helper function to get Bible translation status text
function getBibleTranslationStatusText(
  peopleGroup: PeopleGroupWithLocation
): string {
  const bibleStatus = peopleGroup.primary_language_bible_status;

  // Full Bible (bible_status = 5)
  if (bibleStatus === 5) return 'Full Bible';

  // Full New Testament (bible_status = 4)
  if (bibleStatus === 4) return 'New Testament';

  // Portions (bible_status = 1-3)
  if (bibleStatus !== null && bibleStatus > 0 && bibleStatus < 4) {
    return 'Portions';
  }

  // Has audio recordings or Jesus Film but no scripture
  if (
    peopleGroup.has_audio_recordings === true ||
    peopleGroup.has_jesus_film === true
  ) {
    return 'Audio/Film Available';
  }

  // No scripture (bible_status = 0 or null)
  return 'No Scripture';
}

// Helper function to get Bible translation status pill color (matches dot color)
function getBibleTranslationStatusPillColor(
  peopleGroup: PeopleGroupWithLocation
): string {
  const bibleStatus = peopleGroup.primary_language_bible_status;

  // Green: Full Bible (bible_status = 5)
  if (bibleStatus === 5) {
    return 'bg-success-600'; // Green
  }

  // Yellow: Full New Testament (bible_status = 4)
  if (bibleStatus === 4) {
    return 'bg-warning-500'; // Yellow
  }

  // Orange: Portions OR audio recordings OR jesus film
  if (
    (bibleStatus !== null && bibleStatus > 0 && bibleStatus < 4) ||
    peopleGroup.has_audio_recordings === true ||
    peopleGroup.has_jesus_film === true
  ) {
    return 'bg-[#eb6a38]'; // Orange
  }

  // Red: No scripture
  return 'bg-error-600'; // Red
}

// Convert people groups to GeoJSON FeatureCollection
function toFeatureCollection(
  peopleGroups: PeopleGroupWithLocation[],
  selectedPeopleGroupId: string | null
): GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    people_group_id: string;
    people_group_name: string;
    region_name: string;
    color: string;
    jpscale: number | null;
    least_reached: boolean | null;
    frontier: boolean | null;
    is_selected: boolean;
    has_selection: boolean;
  }
> {
  const hasSelection = selectedPeopleGroupId !== null;
  const features: GeoJSON.Feature<
    GeoJSON.Point,
    {
      people_group_id: string;
      people_group_name: string;
      region_name: string;
      color: string;
      bible_status_score: number; // For clustering aggregation
      jpscale: number | null;
      least_reached: boolean | null;
      frontier: boolean | null;
      is_selected: boolean;
      has_selection: boolean;
    }
  >[] = peopleGroups.map(pg => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [pg.longitude, pg.latitude],
    },
    properties: {
      people_group_id: pg.people_group_id,
      people_group_name: pg.people_group_name,
      region_name: pg.region_name,
      color: getPeopleGroupColor(pg),
      bible_status_score: getBibleStatusScore(pg), // For clustering aggregation
      jpscale: pg.jpscale,
      least_reached: pg.least_reached,
      frontier: pg.frontier,
      is_selected: selectedPeopleGroupId === pg.people_group_id,
      has_selection: hasSelection,
    },
  }));

  return { type: 'FeatureCollection', features };
}

export const MapPeopleGroupsLayer: React.FC<MapPeopleGroupsLayerProps> = ({
  show,
  clustered = false,
  opacity = 1.0,
}) => {
  const { mapRef } = useMapContext();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const setSelection = useSetSelection();
  const selectionMode = useSelectionMode();
  const selection = useSelection();

  const selectedPeopleGroupId =
    selection?.kind === 'people_group' ? selection.id : null;

  // Debug logging for clustering state
  React.useEffect(() => {
    if (show) {
      console.log('[MapPeopleGroupsLayer] Clustering state:', {
        clustered,
        show,
      });
    }
  }, [clustered, show]);

  const [viewportBounds, setViewportBounds] = React.useState<
    [number, number, number, number] | null
  >(null);
  const [zoom, setZoom] = React.useState<number>(1.5);
  const [hoveredPeopleGroup, setHoveredPeopleGroup] =
    React.useState<HoveredPeopleGroup | null>(null);
  const [hoveredPeopleGroupId, setHoveredPeopleGroupId] = React.useState<
    string | null
  >(null);
  const [hoveredClusterId, setHoveredClusterId] = React.useState<number | null>(
    null
  );
  const [pulseAnimationValue, setPulseAnimationValue] = React.useState(0);
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

        // Expand bounds by 5% for better coverage
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

  // Fetch people groups data based on viewport
  const peopleGroupsQuery = useQuery({
    enabled: show && viewportBounds !== null,
    queryKey: ['people-groups-with-location', viewportBounds, zoom],
    queryFn: () => {
      return fetchPeopleGroupsWithLocation({
        bbox: viewportBounds!,
        zoom,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
    // Keep previous data while fetching to prevent blinking
    placeholderData: previousData =>
      previousData as PeopleGroupWithLocation[] | undefined,
  });

  // Convert to GeoJSON FeatureCollection
  const featureCollection = React.useMemo(() => {
    if (!peopleGroupsQuery.data || peopleGroupsQuery.data.length === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }
    return toFeatureCollection(peopleGroupsQuery.data, selectedPeopleGroupId);
  }, [peopleGroupsQuery.data, selectedPeopleGroupId]);

  // Create pulse layer feature collection for selected people group
  const pulseFeatureCollection = React.useMemo(() => {
    if (!selectedPeopleGroupId || !peopleGroupsQuery.data) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }
    const selectedPeopleGroup = peopleGroupsQuery.data.find(
      pg => pg.people_group_id === selectedPeopleGroupId
    );
    if (!selectedPeopleGroup) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              selectedPeopleGroup.longitude,
              selectedPeopleGroup.latitude,
            ],
          },
          properties: {
            id: selectedPeopleGroup.people_group_id,
            color: getPeopleGroupColor(selectedPeopleGroup),
          },
        },
      ],
    };
  }, [selectedPeopleGroupId, peopleGroupsQuery.data]);

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
          ? ['people-groups-clusters', 'people-groups-unclustered']
          : ['people-groups-layer'];

        // Check if any layer exists
        const hasLayer = layerIds.some(id => map.getLayer(id));
        if (!hasLayer) {
          setHoveredPeopleGroup(null);
          return;
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: layerIds,
        });

        // Update cursor style
        map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';

        // Update hovered people group
        if (features.length > 0) {
          const feature = features[0];
          const props = feature.properties as {
            cluster?: boolean;
            cluster_id?: number;
            point_count?: number;
            people_group_id?: string;
            people_group_name?: string;
            region_name?: string;
            color?: string;
            jpscale?: number | null;
            least_reached?: boolean | null;
            frontier?: boolean | null;
          };
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];

          // Handle cluster hover
          if (props.cluster && props.cluster_id !== undefined) {
            setHoveredPeopleGroup(null);
            setHoveredPeopleGroupId(null);
            setHoveredClusterId(props.cluster_id);
            map.getCanvas().style.cursor = 'pointer';
            return;
          }

          // Not a cluster, clear cluster hover
          setHoveredClusterId(null);

          if (
            props.people_group_id &&
            props.people_group_name &&
            props.region_name &&
            coords
          ) {
            // Find the full people group data
            const peopleGroupData = peopleGroupsQuery.data?.find(
              pg => pg.people_group_id === props.people_group_id
            );

            if (peopleGroupData) {
              setHoveredPeopleGroup({
                peopleGroup: peopleGroupData,
                coordinates: coords,
              });
              setHoveredPeopleGroupId(props.people_group_id);
            }
          }
        } else {
          setHoveredPeopleGroup(null);
          setHoveredPeopleGroupId(null);
          setHoveredClusterId(null);
        }
      } catch (error) {
        console.debug('Error querying people group features:', error);
      }
    };

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      try {
        // Determine which layers to query based on clustering mode
        const layerIds = clustered
          ? ['people-groups-clusters', 'people-groups-unclustered']
          : ['people-groups-layer'];

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
            people_group_id?: string;
          };

          // Handle cluster click - zoom in by fixed amount
          if (props.cluster && clustered) {
            e.originalEvent?.stopPropagation?.();
            const mapInstance = mapRef.current?.getMap();
            if (mapInstance) {
              const coords = (feature.geometry as GeoJSON.Point)
                .coordinates as [number, number];
              const currentZoom = mapInstance.getZoom();
              const newZoom = Math.min(currentZoom + 2, 18); // Zoom in by 2 levels, max zoom 18
              mapInstance.easeTo({
                center: coords,
                zoom: newZoom,
                duration: 500,
              });
            }
            return;
          }

          // Handle individual point click
          if (props.people_group_id) {
            // Only allow selection if in people_group mode
            if (selectionMode !== 'people_group') return;

            // Set selection
            setSelection({
              kind: 'people_group',
              id: props.people_group_id,
            });
            // Navigate to people group page
            router.push(
              `/map/people-group/${encodeURIComponent(props.people_group_id)}`
            );
          }
        }
      } catch (error) {
        console.debug('Error handling people group click:', error);
      }
    };

    const handleMouseLeave = () => {
      setHoveredPeopleGroup(null);
      setHoveredPeopleGroupId(null);
      setHoveredClusterId(null);
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
  }, [
    mapRef,
    show,
    clustered,
    peopleGroupsQuery.data,
    router,
    setSelection,
    selectionMode,
    selectedPeopleGroupId,
    hoveredPeopleGroupId,
    hoveredClusterId,
  ]);

  // Animate pulse effect for selected people group (opacity pulse, not size)
  React.useEffect(() => {
    if (!show || !selectedPeopleGroupId) {
      setPulseAnimationValue(0);
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
      setPulseAnimationValue(pulseValue);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [show, selectedPeopleGroupId]);

  // Debug logging for feature collection
  React.useEffect(() => {
    if (show && featureCollection.features.length > 0) {
      console.log('[MapPeopleGroupsLayer] Feature collection:', {
        featureCount: featureCollection.features.length,
        clustered,
        sampleFeatures: featureCollection.features.slice(0, 3).map(f => ({
          id: f.properties.people_group_id,
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
      ? ['people-groups-layer'] // Remove individual layer when switching to clustered
      : [
          'people-groups-clusters',
          'people-groups-cluster-count',
          'people-groups-unclustered',
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
  const displayData = peopleGroupsQuery.data;

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
        key={`people-groups-source-${clustered ? 'clustered' : 'individual'}`}
        id='people-groups-source'
        type='geojson'
        data={featureCollection}
        {...(clustered
          ? {
              cluster: true,
              clusterRadius: 50,
              clusterMaxZoom: 4, // Clusters break apart into individual points when zoom >= 4
              clusterProperties: {
                // Aggregate Bible status scores for average calculation
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
              key='people-groups-clusters'
              id='people-groups-clusters'
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
                  4,
                  '#eab308', // Yellow - new testament
                  5,
                  '#10b981', // Green - full bible
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  [
                    'case',
                    ['==', ['get', 'cluster_id'], hoveredClusterId || -1],
                    28, // 20 * 1.4 for hovered small clusters
                    20, // Base radius for small clusters
                  ],
                  100,
                  [
                    'case',
                    ['==', ['get', 'cluster_id'], hoveredClusterId || -1],
                    42, // 30 * 1.4 for hovered medium clusters
                    30, // Medium clusters
                  ],
                  750,
                  [
                    'case',
                    ['==', ['get', 'cluster_id'], hoveredClusterId || -1],
                    56, // 40 * 1.4 for hovered large clusters
                    40, // Large clusters
                  ],
                ],
                'circle-stroke-color': markerStrokeColor,
                'circle-stroke-width': 2,
                'circle-opacity': [
                  '*',
                  opacity * 0.8,
                  [
                    'case',
                    ['get', 'is_selected'],
                    1.0,
                    [
                      'case',
                      ['get', 'has_selection'],
                      0.625, // 0.5 / 0.8 = 0.625 to maintain relative opacity
                      1.0,
                    ],
                  ],
                ],
              }}
            />,
            /* Cluster count labels */
            <Layer
              key='people-groups-cluster-count'
              id='people-groups-cluster-count'
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
              key='people-groups-unclustered'
              id='people-groups-unclustered'
              type='circle'
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0,
                  [
                    'case',
                    ['get', 'is_selected'],
                    4.2, // 3 * 1.4 for selected
                    [
                      'case',
                      [
                        '==',
                        ['get', 'people_group_id'],
                        hoveredPeopleGroupId || '',
                      ],
                      4.2, // 3 * 1.4 for hovered
                      3,
                    ],
                  ],
                  6,
                  [
                    'case',
                    ['get', 'is_selected'],
                    7, // 5 * 1.4 for selected
                    [
                      'case',
                      [
                        '==',
                        ['get', 'people_group_id'],
                        hoveredPeopleGroupId || '',
                      ],
                      7, // 5 * 1.4 for hovered
                      5,
                    ],
                  ],
                  12,
                  [
                    'case',
                    ['get', 'is_selected'],
                    11.2, // 8 * 1.4 for selected
                    [
                      'case',
                      [
                        '==',
                        ['get', 'people_group_id'],
                        hoveredPeopleGroupId || '',
                      ],
                      11.2, // 8 * 1.4 for hovered
                      8,
                    ],
                  ],
                ],
                'circle-color': ['get', 'color'],
                'circle-stroke-color': markerStrokeColor,
                'circle-stroke-width': 1.5,
                'circle-opacity': [
                  '*',
                  opacity * 0.9,
                  [
                    'case',
                    ['get', 'is_selected'],
                    1.0,
                    [
                      'case',
                      ['get', 'has_selection'],
                      0.556, // 0.5 / 0.9 = 0.556 to maintain relative opacity
                      1.0,
                    ],
                  ],
                ],
              }}
            />,
          ]
        ) : (
          /* Individual points (non-clustered mode) */
          <Layer
            id='people-groups-layer'
            type='circle'
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                [
                  'case',
                  ['get', 'is_selected'],
                  4.2, // 3 * 1.4 for selected
                  [
                    'case',
                    [
                      '==',
                      ['get', 'people_group_id'],
                      hoveredPeopleGroupId || '',
                    ],
                    4.2, // 3 * 1.4 for hovered
                    3,
                  ],
                ],
                6,
                [
                  'case',
                  ['get', 'is_selected'],
                  7, // 5 * 1.4 for selected
                  [
                    'case',
                    [
                      '==',
                      ['get', 'people_group_id'],
                      hoveredPeopleGroupId || '',
                    ],
                    7, // 5 * 1.4 for hovered
                    5,
                  ],
                ],
                12,
                [
                  'case',
                  ['get', 'is_selected'],
                  11.2, // 8 * 1.4 for selected
                  [
                    'case',
                    [
                      '==',
                      ['get', 'people_group_id'],
                      hoveredPeopleGroupId || '',
                    ],
                    11.2, // 8 * 1.4 for hovered
                    8,
                  ],
                ],
              ],
              'circle-color': ['get', 'color'],
              'circle-stroke-color': markerStrokeColor,
              'circle-stroke-width': 1.5,
              'circle-opacity': [
                '*',
                opacity * 0.9,
                [
                  'case',
                  ['get', 'is_selected'],
                  1.0,
                  [
                    'case',
                    ['get', 'has_selection'],
                    0.556, // 0.5 / 0.9 = 0.556 to maintain relative opacity
                    1.0,
                  ],
                ],
              ],
            }}
          />
        )}
      </Source>

      {/* Pulse animation layer for selected people group */}
      {pulseFeatureCollection.features.length > 0 && (
        <Source
          id='people-groups-pulse-source'
          type='geojson'
          data={pulseFeatureCollection}
        >
          <Layer
            id='people-groups-pulse-layer'
            type='circle'
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                6 + pulseAnimationValue * 4,
                6,
                10 + pulseAnimationValue * 6,
                12,
                16 + pulseAnimationValue * 8,
              ],
              'circle-color': ['get', 'color'],
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                Math.max(0, 0.3 - pulseAnimationValue * 0.3),
                6,
                Math.max(0, 0.25 - pulseAnimationValue * 0.25),
                12,
                Math.max(0, 0.2 - pulseAnimationValue * 0.2),
              ],
              'circle-stroke-width': 0,
            }}
          />
        </Source>
      )}

      {/* Hover tooltip popup */}
      {hoveredPeopleGroup && (
        <Popup
          longitude={hoveredPeopleGroup.coordinates[0]}
          latitude={hoveredPeopleGroup.coordinates[1]}
          closeButton={false}
          closeOnClick={false}
          anchor='bottom'
          offset={[0, -8]}
          className='people-groups-popup'
        >
          <div className='px-2 py-1.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded border border-neutral-200 dark:border-neutral-700 shadow-sm min-w-[180px]'>
            <div className='font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100'>
              People Group
            </div>
            <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
              {hoveredPeopleGroup.peopleGroup.peop_name_in_country ||
                hoveredPeopleGroup.peopleGroup.people_group_name}
            </div>
            <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 mb-2'>
              {hoveredPeopleGroup.peopleGroup.region_name}
            </div>
            {/* Primary Language and Bible Translation Status */}
            <div className='mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700'>
              <div className='text-xs font-medium mb-1.5 text-neutral-900 dark:text-neutral-100'>
                Primary Language
              </div>
              <div className='text-xs text-neutral-700 dark:text-neutral-300 mb-1.5'>
                {hoveredPeopleGroup.peopleGroup.primary_language_name ||
                  'Unknown'}
              </div>
              <div className='flex items-center gap-2'>
                <span
                  className={`${getBibleTranslationStatusPillColor(hoveredPeopleGroup.peopleGroup)} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
                >
                  {getBibleTranslationStatusText(
                    hoveredPeopleGroup.peopleGroup
                  )}
                </span>
              </div>
            </div>
          </div>
        </Popup>
      )}

      {/* CSS for popup dark mode styling */}
      <style>{`
        .people-groups-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .people-groups-popup .maplibregl-popup-tip {
          border-top-color: rgb(229 231 235) !important;
        }
        .dark .people-groups-popup .maplibregl-popup-tip {
          border-top-color: rgb(55 65 81) !important;
        }
      `}</style>
    </>
  );
};
