'use client';

import React from 'react';
import type { ColorGradient } from '../analytics/types';
import {
  TIME_PERIOD_SLIDER_OPTIONS,
  getSliderIndexFromHours,
  getHoursFromSliderIndex,
} from '../analytics/constants';
import { Slider } from '../../../shared/components/ui/Slider';

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
  colorGradient: _colorGradient, // Keep prop for API compatibility, but UI removed
  onTimePeriodChange,
  onColorGradientChange: _onColorGradientChange, // Keep prop for API compatibility, but UI removed
}) => {
  const sliderIndex = getSliderIndexFromHours(timePeriodHours);
  const currentLabel =
    TIME_PERIOD_SLIDER_OPTIONS[sliderIndex]?.label ?? '1 month';

  const handleSliderChange = (value: number[]) => {
    const newIndex = value[0];
    const newHours = getHoursFromSliderIndex(newIndex);
    onTimePeriodChange(newHours);
  };

  return (
    <div className='space-y-4'>
      <div>
        <div className='flex items-center justify-between mb-2'>
          <label className='text-sm font-medium'>Time Period</label>
          <span className='text-sm text-neutral-600 dark:text-neutral-400'>
            {currentLabel}
          </span>
        </div>
        <Slider
          value={[sliderIndex]}
          onValueChange={handleSliderChange}
          min={0}
          max={TIME_PERIOD_SLIDER_OPTIONS.length - 1}
          step={1}
          className='w-full'
        />
        {/* Show labels below slider */}
        <div className='flex justify-between mt-2 text-xs text-neutral-500 dark:text-neutral-400'>
          <span>{TIME_PERIOD_SLIDER_OPTIONS[0]?.label}</span>
          <span>
            {
              TIME_PERIOD_SLIDER_OPTIONS[TIME_PERIOD_SLIDER_OPTIONS.length - 1]
                ?.label
            }
          </span>
        </div>
      </div>
    </div>
  );
};
