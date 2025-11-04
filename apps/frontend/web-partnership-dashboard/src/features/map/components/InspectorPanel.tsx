import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { type PanelConfig } from '../config/layoutTypes';
import { type MapSelection } from '../inspector/state/inspectorStore';
import { type LayerState } from '../sections/MapControlsSection';
import { SectionRenderer } from './SectionRenderer';
import { FadeSwitch } from './shared/FadeTransition';
import { HeaderSkeleton, BodySkeleton } from './shared/Skeletons';

interface InspectorPanelProps {
  config: PanelConfig;
  selection: MapSelection | null;
  layers?: LayerState;
  onLayersChange?: (next: LayerState) => void;
}

/**
 * Generic Inspector Panel that renders sections based on configuration.
 * Used for desktop layouts (left, right, or bottom positioned panels).
 */
export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  config,
  selection,
  layers,
  onLayersChange,
}) => {
  const navigate = useNavigate();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : 'none';

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
        (!projectHeader.data && projectHeader.isFetching)));

  const headerTitle =
    regionHeader.data?.name ||
    languageHeader.data?.name ||
    projectHeader.data?.name ||
    '';
  const headerSubtitle = selection
    ? selection.kind === 'language_entity'
      ? 'LANGUAGE'
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
              onBack={() => navigate(-1)}
              showBackButton={!!selection}
            />
          ) : selection ? (
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate(-1)}
                aria-label='Back'
                className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800'
              >
                ←
              </button>
              <div>
                <div className='text-xs uppercase tracking-wide text-neutral-500'>
                  {headerSubtitle}
                </div>
                <div className='text-lg font-semibold leading-tight'>
                  {headerTitle}
                </div>
              </div>
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
                  />
                </div>
              ))}
            </div>
          </FadeSwitch>
        )}
      </div>
    </div>
  );
};
