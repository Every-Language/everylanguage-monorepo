'use client';

import { MapPage } from '@/features/map/pages/MapPage';

/**
 * Shared layout for all map routes
 * This ensures the map component persists across route changes,
 * preventing remounts when navigating between /map, /map/region/[id], etc.
 *
 * The children prop contains the page components, but they return null
 * so only the map is rendered.
 */
export default function MapLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  // Render MapPage - children (page components) return null so they're ignored
  return <MapPage />;
}
