'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  useSetLastUpdateFromRoute,
  useSetSelection,
  useClearSelection,
  useSelectionMode,
  useSetSelectionMode,
  useSelection,
} from '../state/inspectorStore';

// This component keeps the URL and inspector selection in sync both ways.
export const RouteSync: React.FC = () => {
  const pathname = usePathname();
  const selection = useSelection();
  const setSelection = useSetSelection();
  const clearSelection = useClearSelection();
  const setLastUpdateFromRoute = useSetLastUpdateFromRoute();
  const selectionMode = useSelectionMode();
  const setSelectionMode = useSetSelectionMode();
  const lastPathnameRef = React.useRef<string>('');
  const hasInitializedRef = React.useRef<boolean>(false);

  // Listen for URL changes -> update selection
  React.useEffect(() => {
    // On initial mount, always process the pathname
    // After that, only process if pathname actually changed
    if (!hasInitializedRef.current || pathname !== lastPathnameRef.current) {
      hasInitializedRef.current = true;
      lastPathnameRef.current = pathname;

      const match = pathname.match(
        /\/map\/(language|region|project|people-group)\/([^/]+)/
      );
      if (match) {
        const kind = match[1] as
          | 'language'
          | 'region'
          | 'project'
          | 'people-group';
        const id = decodeURIComponent(match[2]);

        // Auto-switch mode based on entity type (projects don't change mode)
        if (kind !== 'project') {
          const expectedMode =
            kind === 'language'
              ? 'language'
              : kind === 'region'
                ? 'region'
                : 'people_group';

          // Switch mode if different from current mode
          if (selectionMode !== expectedMode) {
            setSelectionMode(expectedMode);
          }
        }

        // Determine expected selection from URL
        // Preserve coordinates if the current selection has the same ID and kind
        const currentSelection = selection;
        const preserveCoordinates =
          (kind === 'language' &&
            currentSelection?.kind === 'language_entity' &&
            currentSelection.id === id &&
            currentSelection.coordinates) ||
          (kind === 'people-group' &&
            currentSelection?.kind === 'people_group' &&
            currentSelection.id === id &&
            currentSelection.coordinates);

        const expectedSelection =
          kind === 'language'
            ? {
                kind: 'language_entity' as const,
                id,
                ...(preserveCoordinates
                  ? { coordinates: currentSelection.coordinates }
                  : {}),
              }
            : kind === 'region'
              ? { kind: 'region' as const, id }
              : kind === 'people-group'
                ? {
                    kind: 'people_group' as const,
                    id,
                    ...(preserveCoordinates
                      ? { coordinates: currentSelection.coordinates }
                      : {}),
                  }
                : { kind: 'project' as const, id };

        // Set flag to prevent selection from triggering route change
        setLastUpdateFromRoute(true);
        setSelection(expectedSelection);
        // Reset flag after a short delay to allow programmatic navigation if needed
        setTimeout(() => setLastUpdateFromRoute(false), 100);
      } else if (pathname === '/map') {
        // Clear selection when navigating to base map page
        setLastUpdateFromRoute(true);
        clearSelection();
        setTimeout(() => setLastUpdateFromRoute(false), 100);
      }
    }
  }, [
    pathname,
    selection,
    setSelection,
    clearSelection,
    setLastUpdateFromRoute,
    selectionMode,
    setSelectionMode,
  ]);

  return null;
};
