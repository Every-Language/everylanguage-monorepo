'use client';

import React from 'react';
import type { ColorGradient } from '../analytics/types';
import {
  TIME_PERIOD_OPTIONS,
  DEFAULT_COLOR_GRADIENT,
} from '../analytics/constants';

interface GlobalListeningSettingsSectionProps {
  timePeriodHours: number;
  colorGradient: ColorGradient;
  onTimePeriodChange: (hours: number) => void;
  onColorGradientChange: (gradient: ColorGradient) => void;
}

export const GlobalListeningSettingsSection: React.FC<
  GlobalListeningSettingsSectionProps
> = ({
  timePeriodHours,
  colorGradient,
  onTimePeriodChange,
  onColorGradientChange,
}) => {
  return (
    <div className='space-y-4'>
      <div>
        <label className='text-sm font-medium mb-2 block'>Time Period</label>
        <select
          value={timePeriodHours}
          onChange={e => onTimePeriodChange(Number(e.target.value))}
          className='w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900'
        >
          {TIME_PERIOD_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className='text-sm font-medium mb-2 block'>Color Gradient</label>
        <div className='space-y-2'>
          {/* Preset gradients */}
          <div className='grid grid-cols-2 gap-2'>
            <button
              onClick={() => onColorGradientChange(DEFAULT_COLOR_GRADIENT)}
              className={`px-3 py-2 text-xs border rounded-md ${
                JSON.stringify(colorGradient) ===
                JSON.stringify(DEFAULT_COLOR_GRADIENT)
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              Blue → Red
            </button>
            <button
              onClick={() =>
                onColorGradientChange([
                  { position: 0, color: 'rgba(0,0,0,0)' },
                  { position: 0.2, color: 'rgba(34, 197, 94, 0.35)' },
                  { position: 0.4, color: 'rgba(59, 130, 246, 0.55)' },
                  { position: 0.6, color: 'rgba(168, 85, 247, 0.7)' },
                  { position: 0.8, color: 'rgba(236, 72, 153, 0.85)' },
                  { position: 1, color: 'rgba(239, 68, 68, 0.95)' },
                ])
              }
              className={`px-3 py-2 text-xs border rounded-md ${
                JSON.stringify(colorGradient) !==
                JSON.stringify(DEFAULT_COLOR_GRADIENT)
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              Green → Purple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
