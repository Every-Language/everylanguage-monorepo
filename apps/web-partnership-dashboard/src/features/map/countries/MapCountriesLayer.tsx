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
import { fetchCountriesWithBibleStatus } from './api';
import type { CountryWithBibleStatus } from './types';

interface MapCountriesLayerProps {
  show: boolean;
  opacity?: number;
}

interface HoveredCountry {
  country: CountryWithBibleStatus;
  coordinates: [number, number];
}

// Helper function to determine color based on bible status score
// Color scheme matches language points:
// - Green (#10b981): score >= 3.5 (mostly full bible/NT)
// - Yellow (#eab308): score >= 2.5 (mostly NT)
// - Orange (#eb6a38): score >= 1.0 (mostly portions)
// - Red (#ef4444): score < 1.0 (mostly no scripture)
function getBibleStatusColor(score: number): string {
  if (score >= 3.5) {
    return '#10b981'; // Green
  }
  if (score >= 2.5) {
    return '#eab308'; // Yellow
  }
  if (score >= 1.0) {
    return '#eb6a38'; // Orange
  }
  return '#ef4444'; // Red
}

// Helper function to get bible status text label
function getBibleStatusText(country: CountryWithBibleStatus): string {
  const score = country.bible_status_score;
  if (score >= 3.5) {
    return 'Mostly Full Bible';
  }
  if (score >= 2.5) {
    return 'Mostly New Testament';
  }
  if (score >= 1.0) {
    return 'Mostly Portions';
  }
  return 'Mostly No Scripture';
}

// Helper function to get bible status pill color
function getBibleStatusPillColor(country: CountryWithBibleStatus): string {
  const score = country.bible_status_score;
  if (score >= 3.5) {
    return 'bg-success-600'; // Green
  }
  if (score >= 2.5) {
    return 'bg-warning-500'; // Yellow
  }
  if (score >= 1.0) {
    return 'bg-[#eb6a38]'; // Orange
  }
  return 'bg-error-600'; // Red
}

// Convert countries to GeoJSON FeatureCollection
function toFeatureCollection(
  countries: CountryWithBibleStatus[],
  selectedRegionId: string | null
): GeoJSON.FeatureCollection<
  GeoJSON.MultiPolygon,
  {
    region_id: string;
    region_name: string;
    color: string;
    bible_status_score: number;
    is_selected: boolean;
    has_selection: boolean;
  }
> {
  const hasSelection = selectedRegionId !== null;
  const features: GeoJSON.Feature<
    GeoJSON.MultiPolygon,
    {
      region_id: string;
      region_name: string;
      color: string;
      bible_status_score: number;
      is_selected: boolean;
      has_selection: boolean;
    }
  >[] = countries.map(country => ({
    type: 'Feature',
    geometry: country.boundary_simplified,
    properties: {
      region_id: country.region_id,
      region_name: country.region_name,
      color: getBibleStatusColor(country.bible_status_score),
      bible_status_score: country.bible_status_score,
      is_selected: selectedRegionId === country.region_id,
      has_selection: hasSelection,
    },
  }));

  return { type: 'FeatureCollection', features };
}

export const MapCountriesLayer: React.FC<MapCountriesLayerProps> = ({
  show,
  opacity = 1.0,
}) => {
  const { mapRef } = useMapContext();
  const router = useRouter();
  const setSelection = useSetSelection();
  const selectionMode = useSelectionMode();
  const selection = useSelection();

  const selectedRegionId = selection?.kind === 'region' ? selection.id : null;

  const [hoveredCountry, setHoveredCountry] =
    React.useState<HoveredCountry | null>(null);
  const [pulseAnimationValue, setPulseAnimationValue] = React.useState(0);

  // Fetch countries data
  const countriesQuery = useQuery({
    enabled: show,
    queryKey: ['countries-with-bible-status'],
    queryFn: () => fetchCountriesWithBibleStatus(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection time
  });

  // Convert to GeoJSON FeatureCollection
  const featureCollection = React.useMemo(() => {
    if (!countriesQuery.data || countriesQuery.data.length === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }
    return toFeatureCollection(countriesQuery.data, selectedRegionId);
  }, [countriesQuery.data, selectedRegionId]);

  // Handle mouse events for hover tooltips and click selection
  React.useEffect(() => {
    if (!show) return;

    const map = mapRef.current?.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      try {
        const layerIds = ['countries-fill', 'countries-outline'];

        // Check if any layer exists
        const hasLayer = layerIds.some(id => map.getLayer(id));
        if (!hasLayer) {
          setHoveredCountry(null);
          return;
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: layerIds,
        });

        // Update cursor style
        map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';

        // Update hovered country
        if (features.length > 0) {
          const feature = features[0];
          const props = feature.properties as {
            region_id?: string;
            region_name?: string;
            color?: string;
            bible_status_score?: number;
          };

          if (props.region_id && props.region_name) {
            // Find the full country data
            const countryData = countriesQuery.data?.find(
              c => c.region_id === props.region_id
            );

            if (countryData) {
              // Use the mouse event's coordinates for popup positioning
              // This is more accurate and avoids centroid calculation issues
              const { lng, lat } = e.lngLat;

              // Validate coordinates
              if (
                typeof lng === 'number' &&
                typeof lat === 'number' &&
                !isNaN(lng) &&
                !isNaN(lat) &&
                isFinite(lng) &&
                isFinite(lat)
              ) {
                setHoveredCountry({
                  country: countryData,
                  coordinates: [lng, lat],
                });
              }
            }
          }
        } else {
          setHoveredCountry(null);
        }
      } catch (error) {
        console.debug('Error querying country features:', error);
      }
    };

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      try {
        const layerIds = ['countries-fill', 'countries-outline'];

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
            region_id?: string;
          };

          if (props.region_id) {
            // Only allow selection if in region mode
            if (selectionMode !== 'region') return;

            // Set selection
            setSelection({
              kind: 'region',
              id: props.region_id,
            });
            // Navigate to region page
            router.push(`/map/region/${encodeURIComponent(props.region_id)}`);
          }
        }
      } catch (error) {
        console.debug('Error handling country click:', error);
      }
    };

    const handleMouseLeave = () => {
      setHoveredCountry(null);
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
  }, [mapRef, show, countriesQuery.data, router, setSelection, selectionMode]);

  // Animate pulse effect for selected country
  React.useEffect(() => {
    if (!show || !selectedRegionId) {
      setPulseAnimationValue(0);
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 1500; // 1.5 seconds per pulse cycle

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
  }, [show, selectedRegionId]);

  // Apply pulsing animation to selected country fill opacity
  React.useEffect(() => {
    if (!show || !selectedRegionId || !mapRef.current) return;

    const map = mapRef.current.getMap() as maplibregl.Map | undefined;
    if (!map) return;

    // Calculate pulse values for fill opacity (0.2 to 0.4 for selected fill)
    const baseOpacity = 0.2;
    const pulseOpacity = baseOpacity + pulseAnimationValue * 0.2; // Pulse from 0.2 to 0.4

    try {
      // Update fill-opacity for selected country
      if (map.getLayer('countries-fill')) {
        map.setPaintProperty('countries-fill', 'fill-opacity', [
          'case',
          ['get', 'is_selected'],
          opacity * pulseOpacity, // Selected: pulsing opacity
          [
            'case',
            ['get', 'has_selection'],
            opacity * 0.15, // Others: 15% opacity fill when selected
            opacity * 0.3, // All: 30% opacity fill when no selection
          ],
        ]);
      }
    } catch (error) {
      // Layer might not be loaded yet, ignore
      console.debug('Error updating country fill pulse animation:', error);
    }
  }, [show, selectedRegionId, pulseAnimationValue, mapRef, opacity]);

  // Keep showing previous data while loading new data
  const displayData = countriesQuery.data;

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
      <Source id='countries-source' type='geojson' data={featureCollection}>
        {/* Fill layer for country polygons */}
        <Layer
          id='countries-fill'
          type='fill'
          paint={{
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['get', 'is_selected'],
              opacity * 0.3, // Selected: will be animated via useEffect
              [
                'case',
                ['get', 'has_selection'],
                opacity * 0.15, // Others: 15% opacity fill when selected
                opacity * 0.3, // All: 30% opacity fill when no selection
              ],
            ],
          }}
        />
        {/* Outline layer for country borders */}
        <Layer
          id='countries-outline'
          type='line'
          paint={{
            'line-color': ['get', 'color'],
            'line-width': [
              'case',
              ['get', 'is_selected'],
              3, // Selected: thicker border
              2, // Others: thinner border
            ],
            'line-opacity': [
              'case',
              ['get', 'is_selected'],
              opacity, // Selected: 100% opacity
              [
                'case',
                ['get', 'has_selection'],
                opacity * 0.5, // Others: 50% opacity when selected
                opacity, // All: 100% opacity when no selection
              ],
            ],
          }}
        />
      </Source>

      {/* Hover tooltip popup */}
      {hoveredCountry && (
        <Popup
          longitude={hoveredCountry.coordinates[0]}
          latitude={hoveredCountry.coordinates[1]}
          closeButton={false}
          closeOnClick={false}
          anchor='bottom'
          offset={[0, -8]}
          className='countries-popup'
        >
          <div className='px-2 py-1.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded border border-neutral-200 dark:border-neutral-700 shadow-sm min-w-[200px]'>
            <div className='font-semibold text-sm mb-1 text-neutral-900 dark:text-neutral-100'>
              Country
            </div>
            <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
              {hoveredCountry.country.region_name}
            </div>
            {/* Bible status breakdown */}
            <div className='mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700'>
              <div className='text-xs font-medium mb-1.5 text-neutral-900 dark:text-neutral-100'>
                Bible Translation Status
              </div>
              <div className='flex items-center gap-2 mb-2'>
                <span
                  className={`${getBibleStatusPillColor(hoveredCountry.country)} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}
                >
                  {getBibleStatusText(hoveredCountry.country)}
                </span>
              </div>
              <div className='text-xs text-neutral-600 dark:text-neutral-400 space-y-1'>
                <div>
                  Languages:{' '}
                  {hoveredCountry.country.language_count.toLocaleString()}
                </div>
                <div>
                  Full Bible:{' '}
                  {hoveredCountry.country.languages_full_bible.toLocaleString()}
                </div>
                <div>
                  New Testament:{' '}
                  {hoveredCountry.country.languages_new_testament.toLocaleString()}
                </div>
                <div>
                  Portions:{' '}
                  {hoveredCountry.country.languages_portions.toLocaleString()}
                </div>
                <div>
                  No Scripture:{' '}
                  {hoveredCountry.country.languages_no_scripture.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </Popup>
      )}

      {/* CSS for popup dark mode styling */}
      <style>{`
        .countries-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .countries-popup .maplibregl-popup-tip {
          border-top-color: rgb(229 231 235) !important;
        }
        .dark .countries-popup .maplibregl-popup-tip {
          border-top-color: rgb(55 65 81) !important;
        }
      `}</style>
    </>
  );
};
