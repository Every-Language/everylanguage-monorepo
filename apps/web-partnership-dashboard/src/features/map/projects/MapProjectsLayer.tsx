'use client';

import React from 'react';
import { Source, Layer, Popup } from 'react-map-gl/maplibre';
import { useQuery } from '@tanstack/react-query';
import { fetchProjectsWithLocation } from './api';
import { useMapContext } from '../context/MapContext';
import { useTheme } from '@/shared/theme';
import type * as maplibregl from 'maplibre-gl';

interface HoveredProject {
  id: string;
  name: string;
  targetLanguageName: string | null;
  coordinates: [number, number];
}

export const MapProjectsLayer: React.FC<{ show: boolean }> = ({ show }) => {
  const { mapRef } = useMapContext();
  const { resolvedTheme } = useTheme();
  const [hoveredProject, setHoveredProject] =
    React.useState<HoveredProject | null>(null);
  const [visibleProjectIds, setVisibleProjectIds] = React.useState<Set<string>>(
    new Set()
  );
  const [pulseAnimationTime, setPulseAnimationTime] = React.useState(0);

  // Fetch projects with location data
  const projectsQuery = useQuery({
    enabled: show,
    queryKey: ['projects-with-location'],
    queryFn: fetchProjectsWithLocation,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Convert projects to GeoJSON FeatureCollection
  const featureCollection = React.useMemo(() => {
    if (!projectsQuery.data || projectsQuery.data.length === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }

    const features: GeoJSON.Feature<
      GeoJSON.Point,
      {
        id: string;
        name: string;
        target_language_name: string | null;
      }
    >[] = projectsQuery.data.map(project => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: project.location!.coordinates,
      },
      properties: {
        id: project.id,
        name: project.name,
        target_language_name: project.target_language_name,
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [projectsQuery.data]);

  // Create feature collection for visible projects (for pinging animation)
  const visibleProjectsCollection = React.useMemo(() => {
    if (!projectsQuery.data || visibleProjectIds.size === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }

    const features: GeoJSON.Feature<
      GeoJSON.Point,
      {
        id: string;
        name: string;
        target_language_name: string | null;
      }
    >[] = projectsQuery.data
      .filter(project => visibleProjectIds.has(project.id))
      .map(project => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: project.location!.coordinates,
        },
        properties: {
          id: project.id,
          name: project.name,
          target_language_name: project.target_language_name,
        },
      }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [projectsQuery.data, visibleProjectIds]);

  // Theme colors - using accent (gold) colors for projects
  const markerColor = React.useMemo(() => {
    // Accent-600: #ad915a (gold)
    return '#ad915a';
  }, []);

  const markerStrokeColor = React.useMemo(() => {
    // White for light theme, darker for dark theme
    return resolvedTheme === 'light' ? '#ffffff' : '#1e1e1e';
  }, [resolvedTheme]);

  // Track visible projects in viewport for pinging animation
  React.useEffect(() => {
    if (!show || !projectsQuery.data || projectsQuery.data.length === 0) {
      return;
    }

    const map = mapRef.current?.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    const updateVisibleProjects = () => {
      try {
        const bounds = map.getBounds();
        if (!bounds) return;

        const visibleIds = new Set<string>();

        projectsQuery.data.forEach(project => {
          if (!project.location) return;
          const [lng, lat] = project.location.coordinates;
          if (bounds.contains([lng, lat])) {
            visibleIds.add(project.id);
          }
        });

        setVisibleProjectIds(visibleIds);
      } catch (error) {
        // Silently handle errors (e.g., map not fully loaded)
        console.debug('Error updating visible projects:', error);
      }
    };

    // Update on map move/zoom
    map.on('moveend', updateVisibleProjects);
    map.on('zoomend', updateVisibleProjects);
    map.on('resize', updateVisibleProjects);

    // Initial update
    updateVisibleProjects();

    return () => {
      map.off('moveend', updateVisibleProjects);
      map.off('zoomend', updateVisibleProjects);
      map.off('resize', updateVisibleProjects);
    };
  }, [mapRef, show, projectsQuery.data]);

  // Handle mouse events on the map for hover tooltips
  React.useEffect(() => {
    if (!show) return;

    const map = mapRef.current?.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      try {
        // Build layers array - only include pulse layer if it exists
        const layersToQuery = ['projects-layer'];
        if (visibleProjectsCollection.features.length > 0) {
          // Check if layer exists before querying
          const style = map.getStyle();
          if (style && style.layers) {
            const layerExists = style.layers.some(
              layer => layer.id === 'projects-pulse-layer'
            );
            if (layerExists) {
              layersToQuery.push('projects-pulse-layer');
            }
          }
        }

        // Query features at mouse position
        const features = map.queryRenderedFeatures(e.point, {
          layers: layersToQuery,
        });

        // Update cursor style
        map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';

        // Update hovered project
        if (features.length > 0) {
          const feature = features[0];
          const props = feature.properties as {
            id?: string;
            name?: string;
            target_language_name?: string | null;
          };
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];

          if (props.id && props.name && coords) {
            setHoveredProject({
              id: props.id,
              name: props.name,
              targetLanguageName: props.target_language_name ?? null,
              coordinates: coords,
            });
          }
        } else {
          setHoveredProject(null);
        }
      } catch (error) {
        // Silently handle errors (e.g., layer doesn't exist yet)
        // This can happen during initial render or when layers are being added/removed
        console.debug('Error querying map features:', error);
      }
    };

    const handleMouseLeave = () => {
      setHoveredProject(null);
      map.getCanvas().style.cursor = '';
    };

    map.on('mousemove', handleMouseMove);
    map.on('mouseleave', handleMouseLeave);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseleave', handleMouseLeave);
    };
  }, [mapRef, show, visibleProjectsCollection.features.length]);

  // Animate pulse effect for visible projects
  React.useEffect(() => {
    if (!show || visibleProjectsCollection.features.length === 0) {
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
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [show, visibleProjectsCollection.features.length]);

  // Calculate pulse animation values (MapLibre expressions don't support Math.max)
  const pulseRadiusBase = React.useMemo(() => {
    return {
      zoom0: 6 + pulseAnimationTime * 4,
      zoom6: 10 + pulseAnimationTime * 6,
      zoom12: 16 + pulseAnimationTime * 8,
    };
  }, [pulseAnimationTime]);

  const pulseOpacity = React.useMemo(() => {
    const baseOpacity0 = 0.3 - pulseAnimationTime * 0.3;
    const baseOpacity6 = 0.25 - pulseAnimationTime * 0.25;
    const baseOpacity12 = 0.2 - pulseAnimationTime * 0.2;
    return {
      zoom0: Math.max(0, baseOpacity0),
      zoom6: Math.max(0, baseOpacity6),
      zoom12: Math.max(0, baseOpacity12),
    };
  }, [pulseAnimationTime]);

  if (!show || !featureCollection.features.length) {
    return null;
  }

  return (
    <>
      <Source id='projects-source' type='geojson' data={featureCollection}>
        {/* Main project markers */}
        <Layer
          id='projects-layer'
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
            'circle-color': markerColor,
            'circle-stroke-color': markerStrokeColor,
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.9,
          }}
        />
      </Source>

      {/* Pinging animation layer for visible projects */}
      {visibleProjectsCollection.features.length > 0 && (
        <Source
          id='projects-pulse-source'
          type='geojson'
          data={visibleProjectsCollection}
        >
          <Layer
            id='projects-pulse-layer'
            type='circle'
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                pulseRadiusBase.zoom0,
                6,
                pulseRadiusBase.zoom6,
                12,
                pulseRadiusBase.zoom12,
              ],
              'circle-color': markerColor,
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                pulseOpacity.zoom0,
                6,
                pulseOpacity.zoom6,
                12,
                pulseOpacity.zoom12,
              ],
              'circle-stroke-width': 0,
            }}
          />
        </Source>
      )}

      {/* Tooltip popup */}
      {hoveredProject && (
        <Popup
          longitude={hoveredProject.coordinates[0]}
          latitude={hoveredProject.coordinates[1]}
          closeButton={false}
          closeOnClick={false}
          anchor='bottom'
          offset={[0, -8]}
          className='projects-popup'
        >
          <div className='px-2 py-1 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded border border-neutral-200 dark:border-neutral-700 shadow-sm'>
            <div className='font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100'>
              Project
            </div>
            <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
              {hoveredProject.name}
            </div>
            {hoveredProject.targetLanguageName && (
              <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-0.5'>
                {hoveredProject.targetLanguageName}
              </div>
            )}
          </div>
        </Popup>
      )}

      {/* CSS for popup dark mode styling */}
      <style>{`
        .projects-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .projects-popup .maplibregl-popup-tip {
          border-top-color: rgb(229 231 235) !important;
        }
        .dark .projects-popup .maplibregl-popup-tip {
          border-top-color: rgb(55 65 81) !important;
        }
      `}</style>
    </>
  );
};
