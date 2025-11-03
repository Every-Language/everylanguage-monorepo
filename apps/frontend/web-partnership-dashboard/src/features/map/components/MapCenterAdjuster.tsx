import React from 'react';
import { useMapContext } from '../context/MapContext';
import type { MapSelection } from '../inspector/state/inspectorStore';
import type { LayoutConfig } from '../config/layoutTypes';

interface MapCenterAdjusterProps {
  selection: MapSelection | null;
  layout: LayoutConfig;
  mobileSheetHeight?: number;
  mobileSnapPoints?: number[];
}

/**
 * Component that adjusts map center based on panel positions and mobile sheet height.
 * Must be rendered inside MapProvider (i.e., as a child of MapShell).
 */
export const MapCenterAdjuster: React.FC<MapCenterAdjusterProps> = ({
  selection,
  layout,
  mobileSheetHeight,
  mobileSnapPoints,
}) => {
  const { mapRef } = useMapContext();
  const lastMobileOffsetRef = React.useRef<number>(0);
  const lastDesktopOffsetRef = React.useRef<number>(0);

  // Mobile map center adjustment
  React.useEffect(() => {
    if (!mobileSheetHeight || !mobileSnapPoints) return;

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) return;

    const minSnap = mobileSnapPoints[0];
    const maxSnap = mobileSnapPoints[1];

    if (mobileSheetHeight <= minSnap || mobileSheetHeight >= maxSnap) {
      lastMobileOffsetRef.current = 0;
      return;
    }

    const progress = (mobileSheetHeight - minSnap) / (maxSnap - minSnap);
    const latOffset = progress * 15;

    if (Math.abs(latOffset - lastMobileOffsetRef.current) < 0.5) return;
    lastMobileOffsetRef.current = latOffset;

    const center = (
      map as unknown as { getCenter?: () => { lng: number; lat: number } }
    ).getCenter?.();
    if (!center) return;

    (
      map as unknown as {
        easeTo?: (opts: { center: [number, number]; duration: number }) => void;
      }
    ).easeTo?.({
      center: [center.lng, center.lat + latOffset],
      duration: 100,
    });
  }, [mobileSheetHeight, mobileSnapPoints, mapRef]);

  // Desktop map center adjustment
  React.useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) return;

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const panel = layout.panels[0];
    if (!panel || !selection) {
      lastDesktopOffsetRef.current = 0;
      return;
    }

    const viewportWidth = window.innerWidth;
    const panelWidth = Math.min(viewportWidth * 0.5, 600);
    const pixelOffset = panelWidth / 2;
    const lngOffset = (pixelOffset / viewportWidth) * 360;
    const offsetDirection = panel.position === 'right' ? -1 : 1;
    const finalOffset = lngOffset * offsetDirection;

    if (Math.abs(finalOffset - lastDesktopOffsetRef.current) < 1) return;
    lastDesktopOffsetRef.current = finalOffset;

    const center = (
      map as unknown as { getCenter?: () => { lng: number; lat: number } }
    ).getCenter?.();
    if (!center) return;

    (
      map as unknown as {
        easeTo?: (opts: { center: [number, number]; duration: number }) => void;
      }
    ).easeTo?.({
      center: [center.lng + finalOffset, center.lat],
      duration: 300,
    });
  }, [selection, layout, mapRef]);

  return null;
};
