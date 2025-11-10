import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Bible Translation Map | EverlyLanguage',
  description:
    'Explore Bible translation progress for 7,000+ languages worldwide. Track real-time progress, see language distribution, and discover translation projects.',
  openGraph: {
    title: 'Global Bible Translation Map',
    description: 'Track Bible translation progress in real-time',
    type: 'website',
  },
};

export const revalidate = 3600;

/**
 * Empty page - the map is rendered in the layout.tsx
 * This allows the map to persist across route changes
 */
export default function MapPage() {
  return null;
}
