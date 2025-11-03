import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { type SectionType } from '../config/layoutTypes';
import { type MapSelection } from '../inspector/state/inspectorStore';
import { SectionRenderer } from './SectionRenderer';
import { FadeSwitch } from './shared/FadeTransition';
import { HeaderSkeleton, BodySkeleton } from './shared/Skeletons';

interface MobileBottomSheetProps {
  sections: SectionType[];
  selection: MapSelection | null;
  onHeightChange?: (height: number, snapPoints: number[]) => void;
}

type SheetState = 'collapsed' | 'half' | 'full';

const SHEET_STATES = {
  collapsed: 80, // Just header visible
  half: 0, // Will be calculated as 50% of viewport
  full: 0, // Will be calculated as viewport height minus app header
} as const;

/**
 * Mobile Bottom Sheet - iOS-style modal with 3 states
 *
 * States:
 * - collapsed: Only header visible (80px)
 * - half: 50% of viewport height
 * - full: Full screen minus app header (56px)
 *
 * Behavior:
 * - Swipe/drag to transition between states
 * - Tap header when collapsed → opens to half
 * - When entity selected and collapsed → opens to half
 * - No map interaction while dragging
 */
export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  sections,
  selection,
  onHeightChange,
}) => {
  const navigate = useNavigate();
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = React.useRef<HTMLDivElement | null>(null);

  // Drag state
  const dragState = React.useRef({
    isDragging: false,
    startY: 0,
    startHeight: 0,
  });

  // Calculate snap points based on viewport
  const snapPoints = React.useMemo(() => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      collapsed: SHEET_STATES.collapsed,
      half: Math.round(vh * 0.5),
      full: vh - 56, // 56px = app header height
    };
  }, []);

  const [state, setState] = React.useState<SheetState>('collapsed');
  const [height, setHeight] = React.useState<number>(snapPoints.collapsed);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const selectionKey = selection ? `${selection.kind}:${selection.id}` : 'none';

  // Sync state with height
  React.useEffect(() => {
    const newHeight = snapPoints[state];
    setHeight(newHeight);
  }, [state, snapPoints]);

  // Notify parent of height changes
  React.useEffect(() => {
    if (onHeightChange) {
      onHeightChange(height, [
        snapPoints.collapsed,
        snapPoints.half,
        snapPoints.full,
      ]);
    }
  }, [height, snapPoints, onHeightChange]);

  // When entity selected and currently collapsed → open to half
  React.useEffect(() => {
    if (selection && state === 'collapsed') {
      setIsTransitioning(true);
      setState('half');
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [selection]); // Intentionally only depend on selection

  // Fetch header data (avoid .single() to prevent 406 errors)
  const regionHeader = useQuery({
    enabled: !!selection && selection.kind === 'region',
    queryKey: ['mobile-header-region', selection?.id],
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
    queryKey: ['mobile-header-language', selection?.id],
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

  const isLoading =
    (!!selection &&
      selection.kind === 'region' &&
      (regionHeader.isLoading ||
        (!regionHeader.data && regionHeader.isFetching))) ||
    (!!selection &&
      selection.kind === 'language_entity' &&
      (languageHeader.isLoading ||
        (!languageHeader.data && languageHeader.isFetching)));

  const headerTitle =
    regionHeader.data?.name || languageHeader.data?.name || '';
  const headerSubtitle = selection
    ? selection.kind === 'language_entity'
      ? 'LANGUAGE'
      : selection.kind.toUpperCase()
    : '';

  // Handle drag gestures
  const handleDragStart = React.useCallback(
    (clientY: number) => {
      // Only allow dragging from handle or header, not when content is scrolled
      const content = contentRef.current;
      if (content && content.scrollTop > 0) return false;

      dragState.current = {
        isDragging: true,
        startY: clientY,
        startHeight: height,
      };

      setIsTransitioning(false);
      if (sheetRef.current) {
        sheetRef.current.style.userSelect = 'none';
      }
      document.body.style.overflow = 'hidden';

      return true;
    },
    [height]
  );

  const handleDragMove = React.useCallback(
    (clientY: number) => {
      if (!dragState.current.isDragging) return;

      const deltaY = dragState.current.startY - clientY;
      let newHeight = dragState.current.startHeight + deltaY;

      // Apply constraints with rubber banding
      const minHeight = snapPoints.collapsed;
      const maxHeight = snapPoints.full;

      if (newHeight < minHeight) {
        newHeight = minHeight - (minHeight - newHeight) * 0.3;
      } else if (newHeight > maxHeight) {
        newHeight = maxHeight + (newHeight - maxHeight) * 0.3;
      }

      setHeight(Math.round(newHeight));
    },
    [snapPoints]
  );

  const handleDragEnd = React.useCallback(() => {
    if (!dragState.current.isDragging) return;

    dragState.current.isDragging = false;
    if (sheetRef.current) {
      sheetRef.current.style.userSelect = '';
    }
    document.body.style.overflow = '';

    // Snap to nearest state
    const currentHeight = height;
    const distances = {
      collapsed: Math.abs(currentHeight - snapPoints.collapsed),
      half: Math.abs(currentHeight - snapPoints.half),
      full: Math.abs(currentHeight - snapPoints.full),
    };

    const nearest = Object.entries(distances).reduce((a, b) =>
      a[1] < b[1] ? a : b
    )[0] as SheetState;

    setIsTransitioning(true);
    setState(nearest);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [height, snapPoints]);

  // Touch event handlers
  React.useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const started = handleDragStart(touch.clientY);
      if (started) {
        e.stopPropagation(); // Prevent map interaction
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragState.current.isDragging) return;
      e.preventDefault(); // Prevent scroll
      e.stopPropagation(); // Prevent map panning
      const touch = e.touches[0];
      handleDragMove(touch.clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!dragState.current.isDragging) return;
      e.stopPropagation(); // Prevent map interaction
      handleDragEnd();
    };

    // Attach to handle and header
    const handle = handleRef.current;
    if (handle) {
      handle.addEventListener('touchstart', onTouchStart, { passive: false });
    }

    // Global move/end listeners
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      if (handle) {
        handle.removeEventListener('touchstart', onTouchStart);
      }
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Mouse events for desktop testing
  React.useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const onMouseDown = (e: MouseEvent) => {
      handleDragStart(e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current.isDragging) return;
      e.preventDefault();
      handleDragMove(e.clientY);
    };

    const onMouseUp = () => {
      handleDragEnd();
    };

    const handle = handleRef.current;
    if (handle) {
      handle.addEventListener('mousedown', onMouseDown);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      if (handle) {
        handle.removeEventListener('mousedown', onMouseDown);
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Handle header tap when collapsed
  const handleHeaderTap = React.useCallback(() => {
    if (state === 'collapsed') {
      setIsTransitioning(true);
      setState('half');
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [state]);

  return (
    <>
      {/* Backdrop (shown when expanded past half) */}
      {height > snapPoints.half && (
        <div
          className='fixed inset-0 bg-black/20 z-10'
          style={{
            opacity: Math.min(
              1,
              (height - snapPoints.half) / (snapPoints.full - snapPoints.half)
            ),
            transition: isTransitioning ? 'opacity 300ms ease-out' : 'none',
          }}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className='fixed left-0 right-0 bottom-0 z-20 rounded-t-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl flex flex-col'
        style={{
          height: `${height}px`,
          transition: isTransitioning
            ? 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)'
            : 'none',
        }}
      >
        {/* Drag handle */}
        <div
          ref={handleRef}
          className='flex items-center justify-center py-2 cursor-grab active:cursor-grabbing flex-shrink-0'
          onClick={handleHeaderTap}
        >
          <div className='h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700' />
        </div>

        {/* Header */}
        <div
          className='px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0'
          onClick={handleHeaderTap}
        >
          <FadeSwitch switchKey={selectionKey}>
            {isLoading ? (
              <HeaderSkeleton
                onBack={() => navigate(-1)}
                showBackButton={!!selection}
              />
            ) : selection ? (
              <div className='flex items-center gap-3'>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigate(-1);
                  }}
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

        {/* Content */}
        <div ref={contentRef} className='flex-1 overflow-y-auto p-4'>
          {isLoading ? (
            <BodySkeleton />
          ) : (
            <FadeSwitch switchKey={selectionKey}>
              <div className='space-y-4'>
                {sections.map(sectionType => (
                  <div key={sectionType}>
                    <SectionRenderer
                      type={sectionType}
                      selection={selection}
                      scrollRef={contentRef as React.RefObject<HTMLDivElement>}
                    />
                  </div>
                ))}
              </div>
            </FadeSwitch>
          )}
        </div>
      </div>
    </>
  );
};
