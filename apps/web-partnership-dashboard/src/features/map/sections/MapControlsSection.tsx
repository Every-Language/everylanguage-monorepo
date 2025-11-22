import React from 'react';
import { type LayerKey } from '../components/LayerToggles';
import { GlobalListeningSettingsSection } from './GlobalListeningSettingsSection';
import { LanguagesSettingsSection } from './LanguagesSettingsSection';
import { PeopleGroupsSettingsSection } from './PeopleGroupsSettingsSection';
import type { ColorGradient } from '../analytics/types';

export type LayerState = Record<LayerKey, boolean>;

interface MapControlsSectionProps {
  value: LayerState;
  onChange: (next: LayerState) => void;
  embeddable?: boolean;
  globalListeningSettings?: {
    timePeriodHours: number;
    colorGradient: ColorGradient;
  };
  onGlobalListeningSettingsChange?: (settings: {
    timePeriodHours: number;
    colorGradient: ColorGradient;
  }) => void;
  languagesSettings?: {
    clustered: boolean;
  };
  onLanguagesSettingsChange?: (settings: { clustered: boolean }) => void;
  peopleGroupsSettings?: {
    clustered: boolean;
  };
  onPeopleGroupsSettingsChange?: (settings: { clustered: boolean }) => void;
}

/**
 * Map Controls Section for toggling map layers (countries, listening, projects)
 * Can render as embedded section or standalone control based on embeddable prop
 */
export const MapControlsSection: React.FC<MapControlsSectionProps> = ({
  value,
  onChange,
  embeddable = true,
  globalListeningSettings,
  onGlobalListeningSettingsChange,
  languagesSettings,
  onLanguagesSettingsChange,
  peopleGroupsSettings,
  onPeopleGroupsSettingsChange,
}) => {
  const toggle = (k: LayerKey) => onChange({ ...value, [k]: !value[k] });

  const content = (
    <div>
      <div className='text-sm font-medium mb-2'>Layers</div>
      {(
        [
          'countries',
          'projects',
          'globalListening',
          'languages',
          'peopleGroups',
        ] as LayerKey[]
      ).map(k => (
        <label
          key={k}
          className='flex items-center justify-between text-sm py-1 select-none'
        >
          <span className='capitalize'>
            {k === 'globalListening'
              ? 'Global Listening'
              : k === 'peopleGroups'
                ? 'People Groups'
                : k}
          </span>
          <span className='relative inline-flex items-center'>
            <input
              type='checkbox'
              checked={value[k]}
              onChange={() => toggle(k)}
              className='sr-only peer'
              aria-label={`${k} layer toggle`}
            />
            <span className='block w-10 h-6 rounded-full bg-neutral-300 dark:bg-neutral-700 peer-checked:bg-primary-600 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background' />
            <span className='absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full shadow-sm transform transition peer-checked:translate-x-4' />
          </span>
        </label>
      ))}
      {value.globalListening &&
        globalListeningSettings &&
        onGlobalListeningSettingsChange && (
          <div className='mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
            <GlobalListeningSettingsSection
              timePeriodHours={globalListeningSettings.timePeriodHours}
              colorGradient={globalListeningSettings.colorGradient}
              onTimePeriodChange={hours =>
                onGlobalListeningSettingsChange({
                  ...globalListeningSettings,
                  timePeriodHours: hours,
                })
              }
              onColorGradientChange={gradient =>
                onGlobalListeningSettingsChange({
                  ...globalListeningSettings,
                  colorGradient: gradient,
                })
              }
            />
          </div>
        )}
      {value.languages && languagesSettings && onLanguagesSettingsChange && (
        <div className='mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
          <LanguagesSettingsSection
            clustered={languagesSettings.clustered}
            onClusteredChange={clustered =>
              onLanguagesSettingsChange({
                ...languagesSettings,
                clustered,
              })
            }
          />
        </div>
      )}
      {value.peopleGroups &&
        peopleGroupsSettings &&
        onPeopleGroupsSettingsChange && (
          <div className='mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
            <PeopleGroupsSettingsSection
              clustered={peopleGroupsSettings.clustered}
              onClusteredChange={clustered =>
                onPeopleGroupsSettingsChange({
                  ...peopleGroupsSettings,
                  clustered,
                })
              }
            />
          </div>
        )}
    </div>
  );

  // When embeddable, return just the content (will be styled by parent panel)
  if (embeddable) {
    return content;
  }

  // When not embeddable, render as floating control
  return (
    <div className='absolute left-4 top-24 z-10'>
      <div className='rounded-xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 shadow p-3'>
        {content}
      </div>
    </div>
  );
};
