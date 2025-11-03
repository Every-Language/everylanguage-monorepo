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
}

/**
 * Mobile Bottom Sheet with native-like drag interaction.
 * Supports three snap points: 20vh, 50vh, and 85vh with smooth animations.
 */
export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  sections,
  selection,
}) => {
  const navigate = useNavigate();
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const isDraggingRef = React.useRef(false);
  const startYRef = React.useRef(0);
  const startHeightRef = React.useRef(0);

  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : 800;
  const SNAP_POINTS = [
    Math.round(viewportHeight * 0.2), // 20vh - collapsed
    Math.round(viewportHeight * 0.5), // 50vh - half
    Math.round(viewportHeight * 0.85), // 85vh - expanded
  ];

  const [height, setHeight] = React.useState(SNAP_POINTS[0]);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const selectionKey = selection ? `${selection.kind}:${selection.id}` : 'none';

  // Fetch header data
  const regionHeader = useQuery({
    enabled: !!selection && selection.kind === 'region',
    queryKey: ['mobile-header-region', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name,level')
        .eq('id', (selection as { id: string }).id)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; level: string };
    },
  });

  const languageHeader = useQuery({
    enabled: !!selection && selection.kind === 'language_entity',
    queryKey: ['mobile-header-language', selection?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('language_entities')
        .select('id,name,level')
        .eq('id', (selection as { id: string }).id)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; level: string };
    },
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

  // Touch/drag handlers
  React.useEffect(() => {
    const sheet = sheetRef.current;
    const content = contentRef.current;
    if (!sheet || !content) return;

    const handleStart = (clientY: number) => {
      // Check if touch started on the handle or header (not the scrollable content)
      const contentScrollTop = content.scrollTop;
      if (contentScrollTop > 0) return; // Don't intercept if content is scrolled

      isDraggingRef.current = true;
      startYRef.current = clientY;
      startHeightRef.current = height;
      setIsTransitioning(false);

      // Prevent default to avoid conflicts
      sheet.style.userSelect = 'none';
      document.body.style.overflow = 'hidden';
    };

    const handleMove = (clientY: number) => {
      if (!isDraggingRef.current) return;

      const deltaY = startYRef.current - clientY;
      let newHeight = startHeightRef.current + deltaY;

      // Constrain to snap point range with rubber banding
      const minSnap = SNAP_POINTS[0];
      const maxSnap = SNAP_POINTS[SNAP_POINTS.length - 1];

      if (newHeight < minSnap) {
        // Rubber band below min
        newHeight = minSnap - (minSnap - newHeight) * 0.3;
      } else if (newHeight > maxSnap) {
        // Rubber band above max
        newHeight = maxSnap + (newHeight - maxSnap) * 0.3;
      }

      setHeight(Math.round(newHeight));
    };

    const handleEnd = () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      sheet.style.userSelect = '';
      document.body.style.overflow = '';

      // Snap to nearest snap point
      const nearest = SNAP_POINTS.reduce((prev, curr) =>
        Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
      );

      setIsTransitioning(true);
      setHeight(nearest);

      // Reset transition flag after animation
      setTimeout(() => setIsTransitioning(false), 300);
    };

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault(); // Prevent scroll while dragging
      const touch = e.touches[0];
      handleMove(touch.clientY);
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    // Mouse events (for testing on desktop)
    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      handleMove(e.clientY);
    };

    const onMouseUp = () => {
      handleEnd();
    };

    // Attach listeners
    const handle = sheet.querySelector('[data-sheet-handle]');
    const header = sheet.querySelector('[data-sheet-header]');

    handle?.addEventListener('touchstart', onTouchStart, { passive: false });
    handle?.addEventListener('mousedown', onMouseDown);
    header?.addEventListener('touchstart', onTouchStart, { passive: false });
    header?.addEventListener('mousedown', onMouseDown);

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      handle?.removeEventListener('touchstart', onTouchStart);
      handle?.removeEventListener('mousedown', onMouseDown);
      header?.removeEventListener('touchstart', onTouchStart);
      header?.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [height, SNAP_POINTS]);

  return (
    <>
      {/* Backdrop (shown when expanded) */}
      {height > SNAP_POINTS[1] && (
        <div
          className='fixed inset-0 bg-black/20 z-10'
          style={{
            opacity: Math.min(
              1,
              (height - SNAP_POINTS[1]) / (SNAP_POINTS[2] - SNAP_POINTS[1])
            ),
            transition: isTransitioning ? 'opacity 300ms ease-out' : 'none',
          }}
          onClick={() => {
            setIsTransitioning(true);
            setHeight(SNAP_POINTS[0]);
            setTimeout(() => setIsTransitioning(false), 300);
          }}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className='fixed left-0 right-0 bottom-0 z-20 rounded-t-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl'
        style={{
          height: `${height}px`,
          transition: isTransitioning
            ? 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)'
            : 'none',
          touchAction: 'none',
        }}
      >
        {/* Drag handle */}
        <div
          data-sheet-handle
          className='flex items-center justify-center py-2 cursor-grab active:cursor-grabbing'
        >
          <div className='h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700' />
        </div>

        {/* Header */}
        <div
          data-sheet-header
          className='px-4 pb-3 border-b border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing'
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

        {/* Content */}
        <div
          ref={contentRef}
          className='p-4 overflow-y-auto'
          style={{ height: `calc(100% - 60px)` }}
        >
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
                      scrollRef={contentRef}
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
