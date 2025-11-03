import React from 'react';
import { MapShell } from '../components/MapShell';
import { useSelection } from '../inspector/state/inspectorStore';
import { MapOverlayLayers } from '../inspector/components/MapOverlayLayers';
import { RouteSync } from '../inspector/components/RouteSync';
import { MapAnalyticsLayers } from '../analytics/MapAnalyticsLayers';
import { InspectorPanel } from '../components/InspectorPanel';
import { MobileBottomSheet } from '../components/MobileBottomSheet';
import { MapCenterAdjuster } from '../components/MapCenterAdjuster';
import { MobileSheetProvider } from '../context/MobileSheetContext';
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
  const [mobileSheetHeight, setMobileSheetHeight] = React.useState<number>();
  const [mobileSnapPoints, setMobileSnapPoints] = React.useState<number[]>();

  const handleMobileSheetHeight = React.useCallback(
    (height: number, snapPoints: number[]) => {
      setMobileSheetHeight(height);
      setMobileSnapPoints(snapPoints);
    },
    []
  );

  return (
    <MobileSheetProvider
      height={mobileSheetHeight ?? 80}
      snapPoints={mobileSnapPoints ?? [80, 360, 744]}
    >
      <MapShell countriesEnabled={layers.countries}>
        <RouteSync />
        <MapOverlayLayers countriesEnabled={layers.countries} />
        <MapAnalyticsLayers show={layers.listening} />
        <MapCenterAdjuster
          selection={selection}
          layout={layout}
          mobileSheetHeight={mobileSheetHeight}
          mobileSnapPoints={mobileSnapPoints}
        />

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
            onHeightChange={handleMobileSheetHeight}
          />
        </div>
      </MapShell>
    </MobileSheetProvider>
  );
};

export default MapPage;
