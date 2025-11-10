import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Region Details | EverlyLanguage Map',
  description: 'View Bible translation progress in this region',
};

export const revalidate = 3600;

/**
 * Empty page - the map is rendered in the layout.tsx
 * RouteSync will handle updating the selection based on the URL
 */
export default function RegionMapPage() {
  return null;
}
