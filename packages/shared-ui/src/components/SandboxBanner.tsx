import * as React from 'react';

export interface SandboxBannerProps {
  /**
   * Whether to show the banner. Each app should determine this based on:
   * - Environment variable (VITE_ENVIRONMENT / NEXT_PUBLIC_ENVIRONMENT)
   * - Supabase URL containing "-dev"
   * - Development mode detection
   */
  show: boolean;
}

/**
 * Banner component that displays "sandbox mode" in the top right corner
 * when connected to a dev/preview Supabase project
 */
export function SandboxBanner({
  show,
}: SandboxBannerProps): React.JSX.Element | null {
  const [position, setPosition] = React.useState({ top: 16, left: 16 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [tooltipPosition, setTooltipPosition] = React.useState<
    'top' | 'bottom'
  >('bottom');
  const bannerRef = React.useRef<HTMLDivElement>(null);

  // Update tooltip position based on banner position
  React.useEffect(() => {
    if (!bannerRef.current) return;

    const bannerRect = bannerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const bannerCenterY = bannerRect.top + bannerRect.height / 2;

    // Show tooltip above if banner is in bottom half, below if in top half
    setTooltipPosition(bannerCenterY > viewportHeight / 2 ? 'top' : 'bottom');
  }, [position]);

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent): void => {
      if (!bannerRef.current) return;

      const bannerRect = bannerRef.current.getBoundingClientRect();
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Constrain to viewport bounds
      const maxLeft = window.innerWidth - bannerRect.width;
      const maxTop = window.innerHeight - bannerRect.height;

      setPosition({
        left: Math.max(0, Math.min(newLeft, maxLeft)),
        top: Math.max(0, Math.min(newTop, maxTop)),
      });
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!bannerRef.current) return;

    const bannerRect = bannerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - bannerRect.left,
      y: e.clientY - bannerRect.top,
    });
    setIsDragging(true);
  };

  if (!show) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      className='fixed z-50 pointer-events-none'
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}>
      <div className='group relative'>
        <div
          className='relative px-3 py-1.5 rounded-md shadow-lg text-xs font-semibold uppercase tracking-wide pointer-events-auto overflow-hidden cursor-grab active:cursor-grabbing select-none'
          onMouseDown={handleMouseDown}>
          <div
            className='absolute inset-0 rounded-md transition-all duration-200'
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.9)', // red-500 with 70% opacity
            }}></div>
          <div
            className='absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200'
            style={{
              backgroundColor: 'rgb(239, 68, 68)', // red-500 full opacity
            }}></div>
          <span className='relative text-white dark:text-white z-10'>
            Sandbox Mode
          </span>
        </div>
        <div
          className={`absolute left-0 right-0 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 text-center ${
            tooltipPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}>
          This website is connected to the development sandbox. No data will be
          transferred over to the live apps.
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              tooltipPosition === 'bottom'
                ? 'bottom-full mb-1 border-b-gray-900 dark:border-b-gray-800'
                : 'top-full mt-1 border-t-gray-900 dark:border-t-gray-800'
            }`}></div>
        </div>
      </div>
    </div>
  );
}
