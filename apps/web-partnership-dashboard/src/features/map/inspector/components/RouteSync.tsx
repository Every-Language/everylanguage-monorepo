'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  useLastUpdateFromRoute,
  useSetLastUpdateFromRoute,
  useSetSelection,
} from '../state/inspectorStore';

// This component keeps the URL and inspector selection in sync both ways.
export const RouteSync: React.FC = () => {
  const pathname = usePathname();
  const setSelection = useSetSelection();
  const lastUpdateFromRoute = useLastUpdateFromRoute();
  const setLastUpdateFromRoute = useSetLastUpdateFromRoute();

  // Listen for URL changes -> update selection
  React.useEffect(() => {
    const match = pathname.match(/\/map\/(language|region|project)\/([^/]+)/);
    if (match && !lastUpdateFromRoute) {
      const kind = match[1] as 'language' | 'region' | 'project';
      const id = decodeURIComponent(match[2]);
      setLastUpdateFromRoute(true);
      setSelection(
        kind === 'language'
          ? { kind: 'language_entity', id }
          : kind === 'region'
            ? { kind: 'region', id }
            : { kind: 'project', id }
      );
      // Reset flag shortly after to allow programmatic pushes to navigate
      setTimeout(() => setLastUpdateFromRoute(false), 0);
    }
  }, [pathname, lastUpdateFromRoute, setSelection, setLastUpdateFromRoute]);

  return null;
};
