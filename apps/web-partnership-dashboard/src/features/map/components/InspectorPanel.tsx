'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/shared/services/supabase';
import { Dialog } from '@/shared/components/ui/Dialog';
import { type PanelConfig } from '../config/layoutTypes';
import { type MapSelection } from '../inspector/state/inspectorStore';
import { type LayerState } from '../sections/MapControlsSection';
import type { ColorGradient } from '../analytics/types';
import { SectionRenderer } from './SectionRenderer';
import { FadeSwitch } from './shared/FadeTransition';
import { HeaderSkeleton, BodySkeleton } from './shared/Skeletons';
import { DonateButton } from './DonateButton';
import { DonateModal } from '@/features/funding/components/DonateFlow/DonateModal';
import type {
  DonationIntent,
  SelectedEntity,
} from '@/features/funding/state/types';

interface InspectorPanelProps {
  config: PanelConfig;
  selection: MapSelection | null;
  layers?: LayerState;
  onLayersChange?: (next: LayerState) => void;
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
 * Generic Inspector Panel that renders sections based on configuration.
 * Used for desktop layouts (left, right, or bottom positioned panels).
 */
export const InspectorPanel: React.FC<InspectorPanelProps> = props => {
  const {
    config,
    selection,
    layers,
    onLayersChange,
    globalListeningSettings,
    onGlobalListeningSettingsChange,
    languagesSettings,
    onLanguagesSettingsChange,
  } = props;
  const router = useRouter();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : 'none';
  const [donateOpen, setDonateOpen] = React.useState(false);
  const [initialDonateState, setInitialDonateState] = React.useState<{
    intent: DonationIntent;
    selectedEntity: SelectedEntity;
    step: number;
  } | null>(null);

  // Fetch header data
  const regionHeader = useQuery({
    enabled: !!selection && selection.kind === 'region',
    queryKey: ['inspector-header-region', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name,level')
        .eq('id', (selection as { id: string }).id)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as { id: string; name: string; level: string };
    },
    retry: false,
  });

  const languageHeader = useQuery({
    enabled: !!selection && selection.kind === 'language_entity',
    queryKey: ['inspector-header-language', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities')
        .select('id,name,level')
        .eq('id', (selection as { id: string }).id)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as { id: string; name: string; level: string };
    },
    retry: false,
  });

  const projectHeader = useQuery({
    enabled: !!selection && selection.kind === 'project',
    queryKey: ['inspector-header-project', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name')
        .eq('id', (selection as { id: string }).id)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as { id: string; name: string };
    },
    retry: false,
  });

  const peopleGroupHeader = useQuery({
    enabled: !!selection && selection.kind === 'people_group',
    queryKey: ['inspector-header-people-group', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people_groups')
        .select('id,name')
        .eq('id', (selection as { id: string }).id)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as { id: string; name: string };
    },
    retry: false,
  });

  const isLoading =
    (!!selection &&
      selection.kind === 'region' &&
      (regionHeader.isLoading ||
        (!regionHeader.data && regionHeader.isFetching))) ||
    (!!selection &&
      selection.kind === 'language_entity' &&
      (languageHeader.isLoading ||
        (!languageHeader.data && languageHeader.isFetching))) ||
    (!!selection &&
      selection.kind === 'project' &&
      (projectHeader.isLoading ||
        (!projectHeader.data && projectHeader.isFetching))) ||
    (!!selection &&
      selection.kind === 'people_group' &&
      (peopleGroupHeader.isLoading ||
        (!peopleGroupHeader.data && peopleGroupHeader.isFetching)));

  const headerTitle =
    regionHeader.data?.name ||
    languageHeader.data?.name ||
    projectHeader.data?.name ||
    peopleGroupHeader.data?.name ||
    '';
  const headerSubtitle = selection
    ? selection.kind === 'language_entity'
      ? 'LANGUAGE'
      : selection.kind === 'people_group'
        ? 'PEOPLE GROUP'
        : selection.kind.toUpperCase()
    : '';

  // Position classes
  const positionClasses = {
    left: 'left-4 top-4 bottom-4',
    right: 'right-4 top-4 bottom-4',
    bottom: 'bottom-4 left-4 right-4',
  };

  // Responsive width: use viewport-relative with max constraint
  const widthClass = 'w-[50vw] max-w-[480px]';

  return (
    <div
      className={`absolute ${positionClasses[config.position]} ${widthClass} flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-xl overflow-hidden`}
    >
      {/* Header */}
      <div className='flex-none px-3 py-2 border-b border-neutral-200 dark:border-neutral-800'>
        <FadeSwitch switchKey={selectionKey}>
          {isLoading ? (
            <HeaderSkeleton
              onBack={() => router.back()}
              showBackButton={!!selection}
            />
          ) : selection ? (
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3 flex-1 min-w-0'>
                <button
                  onClick={() => router.back()}
                  aria-label='Back'
                  className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex-shrink-0'
                >
                  ←
                </button>
                <div className='min-w-0'>
                  <div className='text-xs uppercase tracking-wide text-neutral-500'>
                    {headerSubtitle}
                  </div>
                  <div className='text-lg font-semibold leading-tight truncate'>
                    {headerTitle}
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push('/map')}
                aria-label='Close'
                className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex-shrink-0 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>
          ) : (
            <div>
              <div className='text-xs uppercase tracking-wide text-neutral-500'>
                MAP
              </div>
              <div className='text-lg font-semibold leading-tight'>
                Inspector
              </div>
            </div>
          )}
        </FadeSwitch>
      </div>

      {/* Body with sections */}
      <div ref={scrollRef} className='flex-auto overflow-y-auto p-4 space-y-4'>
        {isLoading ? (
          <BodySkeleton />
        ) : (
          <FadeSwitch switchKey={selectionKey}>
            <div className='space-y-4'>
              {config.sections.map(sectionType => (
                <div key={sectionType}>
                  <SectionRenderer
                    type={sectionType}
                    selection={selection}
                    scrollRef={scrollRef}
                    layers={layers}
                    onLayersChange={onLayersChange}
                    globalListeningSettings={globalListeningSettings}
                    onGlobalListeningSettingsChange={
                      onGlobalListeningSettingsChange
                    }
                    languagesSettings={languagesSettings}
                    onLanguagesSettingsChange={onLanguagesSettingsChange}
                    peopleGroupsSettings={props.peopleGroupsSettings}
                    onPeopleGroupsSettingsChange={
                      props.onPeopleGroupsSettingsChange
                    }
                  />
                </div>
              ))}
              {/* Donate button at bottom */}
              <DonateButton
                selection={selection}
                onClick={({ intent, selectedEntity }) => {
                  setInitialDonateState({
                    intent,
                    selectedEntity,
                    step: 2, // Skip to amount entry step
                  });
                  setDonateOpen(true);
                }}
              />
            </div>
          </FadeSwitch>
        )}
      </div>

      {/* Donate Modal */}
      <Dialog
        open={donateOpen}
        onOpenChange={open => {
          setDonateOpen(open);
          if (!open) {
            // Reset initial state when modal closes
            setInitialDonateState(null);
          }
        }}
      >
        {initialDonateState && (
          <DonateModal
            initialIntent={initialDonateState.intent}
            initialSelectedEntity={initialDonateState.selectedEntity}
            initialStep={initialDonateState.step}
          />
        )}
      </Dialog>
    </div>
  );
};
