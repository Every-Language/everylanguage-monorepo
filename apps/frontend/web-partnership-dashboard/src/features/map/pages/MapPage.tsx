import React from 'react';
import { MapShell } from '../components/MapShell';
import { useSelection } from '../inspector/state/inspectorStore';
import { MapOverlayLayers } from '../inspector/components/MapOverlayLayers';
import { RouteSync } from '../inspector/components/RouteSync';
import { MapAnalyticsLayers } from '../analytics/MapAnalyticsLayers';
import { InspectorPanel } from '../components/InspectorPanel';
import { MobileBottomSheet } from '../components/MobileBottomSheet';
import { DEFAULT_LAYOUT } from '../config/layouts';

/**
 * MapPage - Main map view with configurable inspector panels
 *
 * Supports both desktop (multi-panel) and mobile (bottom sheet) layouts
 */
export const MapPage: React.FC = () => {
  const [layers, setLayers] = React.useState({
    projects: true,
    countries: true,
    listening: true,
  });
  const selection = useSelection();
  const layout = DEFAULT_LAYOUT; // Can be made dynamic in future for user preferences

  return (
    <MapShell countriesEnabled={layers.countries}>
      <RouteSync />
      <MapOverlayLayers countriesEnabled={layers.countries} />
      <MapAnalyticsLayers show={layers.listening} />

      {/* Desktop panels */}
      <div className='hidden md:block'>
        {layout.panels.map(panelConfig => (
          <InspectorPanel
            key={panelConfig.id}
            config={panelConfig}
            selection={selection}
            layers={layers}
            onLayersChange={setLayers}
          />
        ))}
      </div>

      {/* Mobile bottom sheet */}
      <div className='md:hidden'>
        <MobileBottomSheet
          sections={layout.mobilePanel?.sections ?? []}
          selection={selection}
        />
      </div>
    </MapShell>
  );
};

export default MapPage;
