import React from 'react';

interface SkeletonLineProps {
  className?: string;
}

/**
 * Basic skeleton line for loading states
 */
export const SkeletonLine: React.FC<SkeletonLineProps> = ({ className }) => (
  <div
    className={`h-3 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse ${className ?? ''}`}
  />
);

interface HeaderSkeletonProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

/**
 * Skeleton for panel headers with optional back button
 */
export const HeaderSkeleton: React.FC<HeaderSkeletonProps> = ({
  onBack,
  showBackButton = true,
}) => (
  <div className='flex items-center gap-3'>
    {showBackButton && onBack && (
      <button
        onClick={onBack}
        aria-label='Back'
        className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800'
      >
        ←
      </button>
    )}
    <div className='flex flex-col gap-2'>
      <SkeletonLine className='w-20' />
      <div className='h-5 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse w-40' />
    </div>
  </div>
);

/**
 * Skeleton for panel body content
 */
export const BodySkeleton: React.FC = () => (
  <div className='flex flex-col gap-3'>
    <div className='flex gap-2'>
      <div className='h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse' />
      <div className='h-4 w-16 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse' />
    </div>
    <SkeletonLine className='w-3/4' />
    <SkeletonLine className='w-full' />
    <SkeletonLine className='w-5/6' />
    <SkeletonLine className='w-1/2' />
    <SkeletonLine className='w-2/3' />
    <SkeletonLine className='w-3/5' />
  </div>
);

interface TreeSkeletonProps {
  bare?: boolean;
}

/**
 * Skeleton for hierarchy tree views
 */
export const TreeSkeleton: React.FC<TreeSkeletonProps> = ({ bare }) => {
  if (bare) {
    return (
      <div className='pt-1 flex flex-col gap-2'>
        <SkeletonLine className='w-3/4' />
        <SkeletonLine className='w-2/3' />
        <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2 flex flex-col gap-2'>
          <SkeletonLine className='w-4/5' />
          <SkeletonLine className='w-3/5' />
        </div>
        <SkeletonLine className='w-1/2' />
      </div>
    );
  }

  return (
    <div className='mb-2'>
      <div className='sticky top-0 z-10 bg-white dark:bg-neutral-900 -mx-3 -mt-3 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800'>
        <div className='text-xs font-semibold tracking-wide text-neutral-500'>
          Loading relationships…
        </div>
      </div>
      <div className='pt-2 flex flex-col gap-2'>
        <SkeletonLine className='w-3/4' />
        <SkeletonLine className='w-2/3' />
        <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2 flex flex-col gap-2'>
          <SkeletonLine className='w-4/5' />
          <SkeletonLine className='w-3/5' />
        </div>
        <SkeletonLine className='w-1/2' />
      </div>
    </div>
  );
};

/**
 * Simple skeleton for left panel header
 */
export const LeftHeaderSkeleton: React.FC = () => (
  <div className='flex flex-col gap-2'>
    <SkeletonLine className='w-20' />
    <div className='h-5 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse w-40' />
  </div>
);

/**
 * Simple skeleton for left panel body
 */
export const LeftBodySkeleton: React.FC = () => (
  <div className='flex flex-col gap-2 p-1'>
    <SkeletonLine className='w-3/4' />
    <SkeletonLine className='w-2/3' />
    <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2 flex flex-col gap-2'>
      <SkeletonLine className='w-4/5' />
      <SkeletonLine className='w-3/5' />
    </div>
    <SkeletonLine className='w-1/2' />
  </div>
);
