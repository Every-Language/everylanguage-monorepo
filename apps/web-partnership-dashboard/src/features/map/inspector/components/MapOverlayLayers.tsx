import React from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useSelection } from '../state/inspectorStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { useLanguageOverlayGeometries } from '../hooks/overlay';

// Overlay that highlights regions for selected language or project.
// Region highlighting is now handled by MapCountriesLayer in region mode.
export const MapOverlayLayers: React.FC<{
  countriesEnabled?: boolean;
  opacity?: number;
}> = ({ countriesEnabled = true, opacity = 1.0 }) => {
  const selection = useSelection();

  const projectRegionIdQuery = useQuery({
    enabled: !!selection && selection.kind === 'project',
    queryKey: [
      'overlay-project-region',
      selection?.kind,
      selection ? (selection as { id: string }).id : null,
    ],
    queryFn: async () => {
      if (!selection || selection.kind !== 'project')
        return null as string | null;
      const { data } = await supabase
        .from('projects')
        .select('region_id')
        .eq('id', selection.id)
        .limit(1);
      if (!data || data.length === 0) return null as string | null;
      return ((data as any)?.[0]?.region_id ?? null) as string | null;
    },
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  // Only show language regions overlay (for language mode)
  const langRegionsQuery = useLanguageOverlayGeometries(
    selection?.kind === 'language_entity' ? selection.id : null,
    { enabled: !!selection && selection.kind === 'language_entity' }
  );

  const features: GeoJSON.Feature[] = [];

  // Add language regions (for language mode)
  if (langRegionsQuery.data?.length) {
    for (const g of langRegionsQuery.data)
      features.push({ type: 'Feature', geometry: g, properties: {} });
  }

  // Add project region (for project selection)
  if (projectRegionIdQuery.data) {
    // Note: We would need to fetch the boundary here, but for now
    // project region highlighting can be handled separately if needed
    // This keeps the component focused on language region overlays
  }

  if (!countriesEnabled || !features.length) return null;

  const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

  const fillOpacity = 0.25 * opacity;
  const lineWidth = 2;

  return (
    <Source id='selection-overlay' type='geojson' data={fc}>
      <Layer
        id='selection-fill'
        type='fill'
        paint={{ 'fill-color': '#ad915a', 'fill-opacity': fillOpacity }}
      />
      <Layer
        id='selection-outline'
        type='line'
        paint={{ 'line-color': '#ad915a', 'line-width': lineWidth }}
      />
    </Source>
  );
};
