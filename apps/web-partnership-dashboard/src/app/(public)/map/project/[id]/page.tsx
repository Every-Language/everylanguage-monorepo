import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Details | EverlyLanguage Map',
  description: 'View Bible translation project details',
};

export const revalidate = 3600;

/**
 * Empty page - the map is rendered in the layout.tsx
 * RouteSync will handle updating the selection based on the URL
 */
export default function ProjectMapPage() {
  return null;
}
