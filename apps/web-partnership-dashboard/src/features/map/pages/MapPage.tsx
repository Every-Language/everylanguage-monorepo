import React from 'react';
import { MapShell } from '../components/MapShell';
import { useSelection } from '../inspector/state/inspectorStore';
import { MapOverlayLayers } from '../inspector/components/MapOverlayLayers';
import { RouteSync } from '../inspector/components/RouteSync';
import { MapAnalyticsLayers } from '../analytics/MapAnalyticsLayers';
import { MapProjectsLayer } from '../projects/MapProjectsLayer';
import { InspectorPanel } from '../components/InspectorPanel';
import { MobileBottomSheet } from '../components/MobileBottomSheet';
import { MobileSheetProvider } from '../context/MobileSheetProvider';
import { DEFAULT_LAYOUT } from '../config/layouts';
import { MapFocusHandler } from '../components/MapFocusHandler';

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
  const [mobileSheetDragging, setMobileSheetDragging] = React.useState(false);

  const handleMobileSheetHeight = React.useCallback(
    (height: number, snapPoints: number[]) => {
      setMobileSheetHeight(height);
      setMobileSnapPoints(snapPoints);
    },
    []
  );

  const handleMobileSheetDragging = React.useCallback((isDragging: boolean) => {
    setMobileSheetDragging(isDragging);
  }, []);

  // Track window width to recalculate padding on resize
  const [windowWidth, setWindowWidth] = React.useState<number | undefined>(
    typeof window !== 'undefined' ? window.innerWidth : undefined
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate map padding for desktop inspector panels
  const mapPadding = React.useMemo(() => {
    // Default to no padding
    const defaultPadding = { top: 0, bottom: 0, left: 0, right: 0 };

    if (typeof window === 'undefined' || windowWidth === undefined) {
      return defaultPadding;
    }
    const isDesktop = windowWidth >= 768; // md breakpoint

    if (!isDesktop) {
      return defaultPadding; // No padding on mobile
    }

    // Calculate panel width: 50vw with max of 480px, plus 16px spacing (left-4/right-4)
    const panelWidth = Math.min(windowWidth * 0.5, 480) + 16;

    // Determine which side has a panel
    const hasLeftPanel = layout.panels.some(p => p.position === 'left');
    const hasRightPanel = layout.panels.some(p => p.position === 'right');

    return {
      top: 0,
      bottom: 0,
      left: hasLeftPanel ? panelWidth : 0,
      right: hasRightPanel ? panelWidth : 0,
    };
  }, [layout.panels, windowWidth]);

  return (
    <div className='h-full w-full'>
      <MobileSheetProvider
        height={mobileSheetHeight ?? 80}
        snapPoints={mobileSnapPoints ?? [80, 360, 744]}
        isDragging={mobileSheetDragging}
      >
        <MapShell countriesEnabled={layers.countries} padding={mapPadding}>
          <RouteSync />
          <MapFocusHandler />
          <MapOverlayLayers countriesEnabled={layers.countries} />
          <MapAnalyticsLayers show={layers.listening} />
          <MapProjectsLayer show={layers.projects} />

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
              onDraggingChange={handleMobileSheetDragging}
            />
          </div>
        </MapShell>
      </MobileSheetProvider>
    </div>
  );
};

export default MapPage;
