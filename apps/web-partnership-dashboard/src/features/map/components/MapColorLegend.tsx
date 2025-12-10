'use client';

import React from 'react';
import type { LayerState } from '../sections/MapControlsSection';
import type { SelectionMode } from '../inspector/state/inspectorStore';
import type { ColorGradient } from '../analytics/types';

interface MapColorLegendProps {
  activeLayers: LayerState;
  selectionMode: SelectionMode;
  globalListeningGradient?: ColorGradient;
}

interface LegendItem {
  color: string;
  label: string;
  isGradient?: boolean;
}

/**
 * Color legend items for Bible status-based layers (People Groups, Languages, Countries)
 */
const BIBLE_STATUS_LEGEND_ITEMS: LegendItem[] = [
  {
    color: '#10b981', // Green - success-600
    label: 'Full Bible',
  },
  {
    color: '#eab308', // Yellow - warning-500
    label: 'New Testament',
  },
  {
    color: '#eb6a38', // Orange
    label: 'Portions',
  },
  {
    color: '#ef4444', // Red - error-600
    label: 'No Scripture',
  },
];

/**
 * Color legend items for Countries (uses "Mostly" prefix)
 */
const COUNTRIES_LEGEND_ITEMS: LegendItem[] = [
  {
    color: '#10b981',
    label: 'Mostly Full Bible',
  },
  {
    color: '#eab308',
    label: 'Mostly New Testament',
  },
  {
    color: '#eb6a38',
    label: 'Mostly Portions',
  },
  {
    color: '#ef4444',
    label: 'Mostly No Scripture',
  },
];

/**
 * Projects legend item (single gold color)
 */
const PROJECTS_LEGEND_ITEMS: LegendItem[] = [
  {
    color: '#ad915a', // Accent-600 (gold)
    label: 'Project',
  },
];

/**
 * MapColorLegend component displays color legends for active map layers
 */
export const MapColorLegend: React.FC<MapColorLegendProps> = ({
  activeLayers,
  selectionMode: _selectionMode,
  globalListeningGradient,
}) => {
  const hasActiveLayers = Object.values(activeLayers).some(Boolean);

  if (!hasActiveLayers) {
    return null;
  }

  const legendSections: Array<{
    title: string;
    items: LegendItem[];
  }> = [];

  // Add People Groups legend
  if (activeLayers.peopleGroups) {
    legendSections.push({
      title: 'People Groups',
      items: BIBLE_STATUS_LEGEND_ITEMS,
    });
  }

  // Add Languages legend
  if (activeLayers.languages) {
    legendSections.push({
      title: 'Languages',
      items: BIBLE_STATUS_LEGEND_ITEMS,
    });
  }

  // Add Countries legend
  if (activeLayers.countries) {
    legendSections.push({
      title: 'Countries',
      items: COUNTRIES_LEGEND_ITEMS,
    });
  }

  // Add Projects legend
  if (activeLayers.projects) {
    legendSections.push({
      title: 'Projects',
      items: PROJECTS_LEGEND_ITEMS,
    });
  }

  // Add Global Listening gradient legend
  if (activeLayers.globalListening && globalListeningGradient) {
    // Create gradient string for display
    const gradientStops = globalListeningGradient
      .map(stop => `${stop.color} ${stop.position * 100}%`)
      .join(', ');

    legendSections.push({
      title: 'Global Listening',
      items: [
        {
          color: `linear-gradient(to right, ${gradientStops})`,
          label: 'Low → High',
          isGradient: true,
        },
      ],
    });
  }

  if (legendSections.length === 0) {
    return null;
  }

  return (
    <div className='mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
      <div className='text-sm font-medium mb-3'>Color Legend</div>
      <div className='space-y-4'>
        {legendSections.map(section => (
          <div key={section.title}>
            <div className='text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5'>
              {section.title}
            </div>
            <div className='space-y-1.5'>
              {section.items.map((item, index) => {
                const isGradient = item.isGradient ?? false;
                return (
                  <div
                    key={`${section.title}-${index}`}
                    className='flex items-center gap-2'>
                    {isGradient ? (
                      <div
                        className='h-3 w-12 rounded flex-shrink-0 border border-neutral-300 dark:border-neutral-600'
                        style={{
                          background: item.color,
                        }}
                        aria-hidden='true'
                      />
                    ) : (
                      <div
                        className='w-3 h-3 rounded-full flex-shrink-0 border border-neutral-300 dark:border-neutral-600'
                        style={{
                          backgroundColor: item.color,
                        }}
                        aria-hidden='true'
                      />
                    )}
                    <div className='text-xs text-neutral-700 dark:text-neutral-300'>
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
