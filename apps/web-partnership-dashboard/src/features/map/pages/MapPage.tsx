import React from 'react';
import { MapShell } from '../components/MapShell';
import {
  useSelection,
  useSelectionMode,
} from '../inspector/state/inspectorStore';
import { MapOverlayLayers } from '../inspector/components/MapOverlayLayers';
import { RouteSync } from '../inspector/components/RouteSync';
import { MapProjectsLayer } from '../projects/MapProjectsLayer';
import { GlobalListeningHeatmapLayer } from '../analytics/GlobalListeningHeatmapLayer';
import { MapLanguagesLayer } from '../languages/MapLanguagesLayer';
import { MapPeopleGroupsLayer } from '../people-groups/MapPeopleGroupsLayer';
import { MapCountriesLayer } from '../countries/MapCountriesLayer';
import {
  DEFAULT_COLOR_GRADIENT,
  DEFAULT_TIME_PERIOD_HOURS,
} from '../analytics/constants';
import { InspectorPanel } from '../components/InspectorPanel';
import { MobileBottomSheet } from '../components/MobileBottomSheet';
import { MobileSheetProvider } from '../context/MobileSheetProvider';
import { DEFAULT_LAYOUT } from '../config/layouts';
import { MapFocusHandler } from '../components/MapFocusHandler';
import { useProjectsEnabled } from '@/shared/hooks/useFeatureFlags';
import { SelectionModeTabs } from '../components/SelectionModeTabs';

/**
 * MapPage - Main map view with configurable inspector panels
 *
 * Supports both desktop (multi-panel) and mobile (bottom sheet) layouts
 */
export const MapPage: React.FC = () => {
  const selectionMode = useSelectionMode();
  const selection = useSelection();
  const projectsEnabled = useProjectsEnabled();

  // Initialize layer state based on selection mode
  const getInitialLayers = React.useCallback(() => {
    switch (selectionMode) {
      case 'language':
        return {
          projects: false,
          countries: false,
          globalListening: false,
          languages: true, // Always on
          peopleGroups: false,
        };
      case 'region':
        return {
          projects: false,
          countries: true, // Always on
          globalListening: false,
          languages: false,
          peopleGroups: false,
        };
      case 'people_group':
        return {
          projects: false,
          countries: false,
          globalListening: false,
          languages: false,
          peopleGroups: true, // Always on
        };
    }
  }, [selectionMode]);

  const [layers, setLayers] = React.useState(getInitialLayers);

  // Reset layers when mode changes
  React.useEffect(() => {
    setLayers(getInitialLayers());
  }, [selectionMode, getInitialLayers]);

  const [globalListeningSettings, setGlobalListeningSettings] = React.useState<{
    timePeriodHours: number;
    colorGradient: typeof DEFAULT_COLOR_GRADIENT;
  }>({
    timePeriodHours: DEFAULT_TIME_PERIOD_HOURS, // Default: 1 month
    colorGradient: DEFAULT_COLOR_GRADIENT,
  });
  const [languagesSettings, setLanguagesSettings] = React.useState<{
    clustered: boolean;
  }>({
    clustered: false, // Default: show individual points
  });
  const [peopleGroupsSettings, setPeopleGroupsSettings] = React.useState<{
    clustered: boolean;
  }>({
    clustered: false, // Default: show individual points
  });
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

  // Calculate opacity for each layer - always 100% opacity when enabled
  const getLayerOpacity = React.useCallback(
    (layerType: 'languages' | 'peopleGroups' | 'countries') => {
      const FULL_OPACITY = 1.0;
      // Return full opacity if layer is enabled, otherwise 0
      return layers[layerType] ? FULL_OPACITY : 0;
    },
    [layers]
  );

  const languagesOpacity = getLayerOpacity('languages');
  const peopleGroupsOpacity = getLayerOpacity('peopleGroups');
  const countriesOpacity = getLayerOpacity('countries');

  // Track if component has mounted to avoid hydration mismatch
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate horizontal offset to center selector over visible map area
  const selectorLeftOffset = React.useMemo(() => {
    // Always use 50% during SSR and initial render to match server render
    if (
      !isMounted ||
      typeof window === 'undefined' ||
      windowWidth === undefined
    ) {
      return '50%';
    }
    const isDesktop = windowWidth >= 768;
    if (!isDesktop) {
      return '50%'; // Center on mobile
    }
    // Center of visible map = window center + (right padding - left padding) / 2
    const offset = (mapPadding.right - mapPadding.left) / 2;
    return `calc(50% - ${offset}px)`;
  }, [mapPadding, windowWidth, isMounted]);

  return (
    <div className='h-full w-full'>
      {/* Floating mode selector - positioned below header, centered over visible map */}
      <div
        className='absolute top-8 z-20 md:top-8'
        style={{
          left: selectorLeftOffset,
          transform: 'translateX(-50%)',
        }}>
        <div className='w-[400px] md:w-[400px]'>
          <SelectionModeTabs />
        </div>
      </div>

      <MobileSheetProvider
        height={mobileSheetHeight ?? 80}
        snapPoints={mobileSnapPoints ?? [80, 360, 744]}
        isDragging={mobileSheetDragging}>
        <MapShell countriesEnabled={layers.countries} padding={mapPadding}>
          <RouteSync />
          <MapFocusHandler />
          {/* Countries layer - base layer for region mode */}
          {selectionMode === 'region' && (
            <MapCountriesLayer
              show={layers.countries}
              opacity={countriesOpacity}
            />
          )}
          <MapOverlayLayers
            countriesEnabled={layers.countries}
            opacity={countriesOpacity}
          />
          {projectsEnabled && <MapProjectsLayer show={layers.projects} />}
          <GlobalListeningHeatmapLayer
            show={layers.globalListening}
            timePeriodHours={globalListeningSettings.timePeriodHours}
            colorGradient={globalListeningSettings.colorGradient}
          />
          <MapLanguagesLayer
            show={layers.languages}
            clustered={languagesSettings.clustered}
            opacity={languagesOpacity}
          />
          <MapPeopleGroupsLayer
            show={layers.peopleGroups}
            clustered={peopleGroupsSettings.clustered}
            opacity={peopleGroupsOpacity}
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
                globalListeningSettings={globalListeningSettings}
                onGlobalListeningSettingsChange={setGlobalListeningSettings}
                languagesSettings={languagesSettings}
                onLanguagesSettingsChange={setLanguagesSettings}
                peopleGroupsSettings={peopleGroupsSettings}
                onPeopleGroupsSettingsChange={setPeopleGroupsSettings}
              />
            ))}
          </div>

          {/* Mobile bottom sheet */}
          <div className='md:hidden'>
            <MobileBottomSheet
              selection={selection}
              onHeightChange={handleMobileSheetHeight}
              onDraggingChange={handleMobileSheetDragging}
              layers={layers}
              onLayersChange={setLayers}
              globalListeningSettings={globalListeningSettings}
              onGlobalListeningSettingsChange={setGlobalListeningSettings}
              languagesSettings={languagesSettings}
              onLanguagesSettingsChange={setLanguagesSettings}
              peopleGroupsSettings={peopleGroupsSettings}
              onPeopleGroupsSettingsChange={setPeopleGroupsSettings}
            />
          </div>
        </MapShell>
      </MobileSheetProvider>
    </div>
  );
};

export default MapPage;
