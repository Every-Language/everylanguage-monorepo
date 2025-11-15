'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  useSetLastUpdateFromRoute,
  useSetSelection,
  useClearSelection,
} from '../state/inspectorStore';

// This component keeps the URL and inspector selection in sync both ways.
export const RouteSync: React.FC = () => {
  const pathname = usePathname();
  const setSelection = useSetSelection();
  const clearSelection = useClearSelection();
  const setLastUpdateFromRoute = useSetLastUpdateFromRoute();
  const lastPathnameRef = React.useRef<string>('');
  const hasInitializedRef = React.useRef<boolean>(false);

  // Listen for URL changes -> update selection
  React.useEffect(() => {
    // On initial mount, always process the pathname
    // After that, only process if pathname actually changed
    if (!hasInitializedRef.current || pathname !== lastPathnameRef.current) {
      hasInitializedRef.current = true;
      lastPathnameRef.current = pathname;

      const match = pathname.match(/\/map\/(language|region|project)\/([^/]+)/);
      if (match) {
        const kind = match[1] as 'language' | 'region' | 'project';
        const id = decodeURIComponent(match[2]);

        // Determine expected selection from URL
        const expectedSelection =
          kind === 'language'
            ? { kind: 'language_entity' as const, id }
            : kind === 'region'
              ? { kind: 'region' as const, id }
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
  }, [pathname, setSelection, clearSelection, setLastUpdateFromRoute]);

  return null;
};
