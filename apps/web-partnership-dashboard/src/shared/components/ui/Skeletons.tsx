import React from 'react';
import { cn } from '../../theme/utils';
import { Card, CardHeader, CardContent } from './Card';

/**
 * Skeleton component for project cards (used in overview and progress pages)
 */
interface ProjectCardSkeletonProps {
  count?: number;
  className?: string;
}

export const ProjectCardSkeleton: React.FC<ProjectCardSkeletonProps> = ({
  count = 3,
  className,
}) => {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}>
      {Array.from({ length: count }).map((_, idx) => (
        <Card
          key={`project-skeleton-${idx}`}
          className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <div className='h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 animate-pulse mb-2' />
            <div className='h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2 animate-pulse' />
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Progress section skeleton */}
            <div>
              <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 animate-pulse mb-2' />
              <div className='flex items-center justify-between mb-1'>
                <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse' />
                <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-8 animate-pulse' />
              </div>
              <div className='h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse' />
            </div>
            {/* Distribution stats skeleton */}
            <div className='grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
              <div>
                <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse mb-2' />
                <div className='h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-20 animate-pulse' />
              </div>
              <div>
                <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20 animate-pulse mb-2' />
                <div className='h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse' />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * Skeleton component for stats cards (downloads, listening hours, etc.)
 */
interface StatsCardSkeletonProps {
  count?: number;
  className?: string;
}

export const StatsCardSkeleton: React.FC<StatsCardSkeletonProps> = ({
  count = 2,
  className,
}) => {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <Card
          key={`stats-skeleton-${idx}`}
          className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
          </CardHeader>
          <CardContent>
            <div className='h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse mb-2' />
            <div className='h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-40 animate-pulse' />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * Skeleton component for table rows (donations table)
 */
interface TableRowSkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({
  count = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={className}>
      {/* Table Header Skeleton */}
      <div className='grid grid-cols-[1fr_1fr_1fr_2fr] gap-4 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800'>
        {Array.from({ length: columns }).map((_, idx) => (
          <div
            key={`header-${idx}`}
            className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse'
          />
        ))}
      </div>
      {/* Table Rows Skeleton */}
      {Array.from({ length: count }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className='grid grid-cols-[1fr_1fr_1fr_2fr] gap-4 px-4 py-4 border-b border-neutral-200 dark:border-neutral-800'>
          <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20 animate-pulse' />
          <div className='h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse' />
          <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse' />
          <div className='space-y-1'>
            <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
            <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-40 animate-pulse' />
            <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse mt-2 pt-1 border-t border-neutral-200 dark:border-neutral-800' />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton component for map placeholder
 */
interface MapSkeletonProps {
  height?: string;
  className?: string;
}

export const MapSkeleton: React.FC<MapSkeletonProps> = ({
  height = '600px',
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center',
        className
      )}
      style={{ height }}>
      <div className='text-center text-neutral-500'>
        <div className='h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-48 animate-pulse mx-auto mb-2' />
        <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-64 animate-pulse mx-auto' />
      </div>
    </div>
  );
};

/**
 * Skeleton component for feed items (updates, activity feed)
 */
interface FeedItemSkeletonProps {
  count?: number;
  className?: string;
}

export const FeedItemSkeleton: React.FC<FeedItemSkeletonProps> = ({
  count = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <Card
          key={`feed-skeleton-${idx}`}
          className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 animate-pulse mb-2' />
                <div className='h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-48 animate-pulse' />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full animate-pulse' />
              <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6 animate-pulse' />
              <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4/6 animate-pulse' />
            </div>
            {/* Media attachments skeleton */}
            {idx % 2 === 0 && (
              <div className='mt-6 space-y-4'>
                <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {Array.from({ length: 2 }).map((_, mediaIdx) => (
                    <div
                      key={`media-${mediaIdx}`}
                      className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-4'>
                      <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse mb-2' />
                      <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * Skeleton component for member cards
 */
interface MemberCardSkeletonProps {
  count?: number;
  className?: string;
}

export const MemberCardSkeleton: React.FC<MemberCardSkeletonProps> = ({
  count = 3,
  className,
}) => {
  return (
    <div className={className}>
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <div className='h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {Array.from({ length: count }).map((_, idx) => (
              <div
                key={`member-skeleton-${idx}`}
                className='flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg'>
                <div className='flex-1'>
                  <div className='h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-40 animate-pulse mb-2' />
                  <div className='h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-48 animate-pulse' />
                </div>
                <div className='text-right'>
                  <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse mb-1' />
                  <div className='h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-16 animate-pulse' />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
