'use client';

import React from 'react';

interface LanguagesSettingsSectionProps {
  clustered: boolean;
  onClusteredChange: (clustered: boolean) => void;
}

export const LanguagesSettingsSection: React.FC<
  LanguagesSettingsSectionProps
> = ({ clustered, onClusteredChange }) => {
  return (
    <div className='space-y-4'>
      <div>
        <div className='flex items-center justify-between mb-2'>
          <label className='text-sm font-medium'>Display Mode</label>
        </div>
        <div className='space-y-2'>
          <label className='flex items-center justify-between text-sm py-1 select-none cursor-pointer'>
            <span>Clustered</span>
            <span className='relative inline-flex items-center'>
              <input
                type='checkbox'
                checked={clustered}
                onChange={e => onClusteredChange(e.target.checked)}
                className='sr-only peer'
                aria-label='clustered toggle'
              />
              <span className='block w-10 h-6 rounded-full bg-neutral-300 dark:bg-neutral-700 peer-checked:bg-primary-600 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background' />
              <span className='absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full shadow-sm transform transition peer-checked:translate-x-4' />
            </span>
          </label>
          <p className='text-xs text-neutral-500 dark:text-neutral-400'>
            {clustered
              ? 'Points are grouped into clusters for better performance'
              : 'Show individual language points'}
          </p>
        </div>
      </div>
    </div>
  );
};
