import React from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { normalizeBboxForMap, centerOfBbox } from '../inspector/utils/geo';

interface MapContextValue {
  mapRef: React.MutableRefObject<MapRef | null>;
  flyTo: (opts: {
    longitude: number;
    latitude: number;
    zoom?: number;
    onComplete?: () => void;
  }) => void;
  fitBounds: (
    bbox: [number, number, number, number],
    opts?: {
      padding?:
        | number
        | { top?: number; bottom?: number; left?: number; right?: number };
      maxZoom?: number;
    }
  ) => void;
}

const MapContext = React.createContext<MapContextValue | null>(null);

export const MapProvider: React.FC<{
  mapRef: React.MutableRefObject<MapRef | null>;
  children: React.ReactNode;
}> = ({ mapRef, children }) => {
  const userInteractedRef = React.useRef(false);
  const lastRequestKeyRef = React.useRef<string | null>(null);
  const lastRequestAtRef = React.useRef<number>(0);

  // Mark user interaction to avoid fighting their camera; reset on programmatic moves
  React.useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const onUserMoveStart = () => {
      userInteractedRef.current = true;
    };
    map.on?.('dragstart', onUserMoveStart);
    map.on?.('zoomstart', onUserMoveStart);
    map.on?.('rotatestart', onUserMoveStart);
    return () => {
      map.off?.('dragstart', onUserMoveStart);
      map.off?.('zoomstart', onUserMoveStart);
      map.off?.('rotatestart', onUserMoveStart);
    };
  }, [mapRef]);
  const flyTo = React.useCallback(
    (opts: {
      longitude: number;
      latitude: number;
      zoom?: number;
      onComplete?: () => void;
    }) => {
      const map = mapRef.current;
      if (!map) return;
      const underlyingMap = map.getMap();
      if (!underlyingMap) return;

      // Set up completion callback if provided
      if (opts.onComplete) {
        const handleIdle = () => {
          underlyingMap.off('idle', handleIdle);
          opts.onComplete?.();
        };
        underlyingMap.once('idle', handleIdle);
      }

      map.flyTo({
        center: [opts.longitude, opts.latitude],
        zoom: opts.zoom ?? 4,
        speed: 0.5,
        curve: 1.2,
        essential: true,
      });
    },
    [mapRef]
  );

  const fitBounds = React.useCallback(
    (
      bbox: [number, number, number, number],
      opts?: {
        padding?:
          | number
          | { top?: number; bottom?: number; left?: number; right?: number };
        maxZoom?: number;
      }
    ) => {
      const map = mapRef.current;
      if (!map) return;
      try {
        const { box, recommendFlyTo } = normalizeBboxForMap(bbox);
        // Normalize padding for key generation
        const paddingKey =
          typeof opts?.padding === 'object'
            ? `${opts.padding.top ?? 60},${opts.padding.bottom ?? 60},${opts.padding.left ?? 60},${opts.padding.right ?? 60}`
            : (opts?.padding ?? 40);
        // Drop duplicate requests for the same bbox/maxZoom/padding within 300ms (helps with StrictMode double-effects)
        const key = `${box[0].toFixed(6)},${box[1].toFixed(6)},${box[2].toFixed(6)},${box[3].toFixed(6)}|${paddingKey}|${opts?.maxZoom ?? 8}`;
        const now = Date.now();
        if (
          lastRequestKeyRef.current === key &&
          now - lastRequestAtRef.current < 300
        ) {
          return;
        }
        lastRequestKeyRef.current = key;
        lastRequestAtRef.current = now;
        const perform = () => {
          // Stop any in-flight animations before starting a new camera op
          try {
            (map as unknown as { stop?: () => void }).stop?.();
          } catch {
            /* noop */
          }
          if (recommendFlyTo) {
            const [cx, cy] = centerOfBbox(box);
            userInteractedRef.current = false;
            map.flyTo({
              center: [cx, cy],
              zoom: opts?.maxZoom ?? 4,
              essential: true,
            });
            return;
          }
          userInteractedRef.current = false;
          const padding:
            | number
            | { top: number; bottom: number; left: number; right: number } =
            typeof opts?.padding === 'object'
              ? {
                  top: opts.padding.top ?? 40,
                  bottom: opts.padding.bottom ?? 40,
                  left: opts.padding.left ?? 40,
                  right: opts.padding.right ?? 40,
                }
              : (opts?.padding ?? 40);
          map.fitBounds(
            [
              [box[0], box[1]],
              [box[2], box[3]],
            ],
            {
              padding: padding,
              maxZoom: opts?.maxZoom ?? 8,
              duration: 900,
              essential: true,
            }
          );
          // Note: previously we used a fallback flyTo if no significant change occurred.
          // At the user's request, this behavior has been removed to avoid unexpected zooms.
        };

        const underlying = (
          map as unknown as {
            getMap?: () => {
              isStyleLoaded?: () => boolean;
              once?: (ev: string, fn: () => void) => void;
              on?: (ev: string, fn: () => void) => void;
              isMoving?: () => boolean;
              isZooming?: () => boolean;
              isRotating?: () => boolean;
            };
          }
        ).getMap?.();
        if (
          underlying &&
          typeof underlying.isStyleLoaded === 'function' &&
          !underlying.isStyleLoaded()
        ) {
          underlying.once?.('style.load', perform);
          // Safety net: poll for style load for up to 1500ms in case event was missed
          const start = Date.now();
          const poll = () => {
            const u = (
              map as unknown as {
                getMap?: () => { isStyleLoaded?: () => boolean };
              }
            ).getMap?.();
            const loaded = !!(
              u &&
              typeof u.isStyleLoaded === 'function' &&
              u.isStyleLoaded()
            );
            if (loaded) {
              perform();
              return;
            }
            if (Date.now() - start > 1500) {
              perform();
              return;
            }
            requestAnimationFrame(poll);
          };
          requestAnimationFrame(poll);
        } else if (
          underlying &&
          (underlying.isMoving?.() ||
            underlying.isZooming?.() ||
            underlying.isRotating?.())
        ) {
          // Defer until current user move finishes
          underlying.once?.('moveend', () => requestAnimationFrame(perform));
        } else {
          // Defer to next frame to avoid conflicts with ongoing map transitions
          requestAnimationFrame(perform);
        }
      } catch {
        // no-op: camera ops are best-effort
      }
    },
    [mapRef]
  );

  const value = React.useMemo(
    () => ({ mapRef, flyTo, fitBounds }),
    [mapRef, flyTo, fitBounds]
  );
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapContext = (): MapContextValue => {
  const ctx = React.useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
};
