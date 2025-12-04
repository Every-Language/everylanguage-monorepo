import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  LoadingSpinner,
} from '@/shared/design-system';
import { useProjectUpdates } from '@/features/project-updates';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

export const RecentUpdates: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  const { data: updates, isLoading } = useProjectUpdates(
    selectedProject?.id || null
  );

  if (!selectedProject) {
    return null;
  }

  const recentUpdates = updates?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Recent Updates</CardTitle>
          <Button
            variant='ghost'
            size='sm'
            as={Link}
            to='/project-updates'
            rightIcon={<ArrowRightIcon className='h-4 w-4' />}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <LoadingSpinner />
          </div>
        ) : recentUpdates.length === 0 ? (
          <div className='text-center py-8'>
            <p className='text-neutral-600 dark:text-neutral-400 mb-4'>
              No updates yet. Be the first to share progress!
            </p>
            <Button as={Link} to='/project-updates' variant='outline'>
              Post Update
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            {recentUpdates.map(update => {
              const creator = Array.isArray(update.creator)
                ? update.creator[0]
                : update.creator;
              const creatorName =
                creator && typeof creator === 'object' && 'full_name' in creator
                  ? (creator as { full_name: string | null }).full_name
                  : null;
              return (
                <div
                  key={update.id}
                  className='border-b border-neutral-200 dark:border-neutral-800 last:border-0 pb-4 last:pb-0'>
                  <div className='flex items-start justify-between mb-1'>
                    <h4 className='font-semibold text-neutral-900 dark:text-neutral-100'>
                      {update.title}
                    </h4>
                  </div>
                  <p className='text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-2'>
                    {update.body}
                  </p>
                  <div className='text-xs text-neutral-500'>
                    {formatDate(update.created_at)}
                    {creatorName && <> • by {creatorName}</>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
