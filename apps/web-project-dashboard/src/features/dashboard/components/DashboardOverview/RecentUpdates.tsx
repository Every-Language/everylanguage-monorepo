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
import { useCurrentProject } from '../../hooks/useCurrentProject';
import { Link, useParams } from 'react-router-dom';
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
  const { projectId } = useParams<{ projectId: string }>();
  const { project } = useCurrentProject();
  const { data: updates, isLoading } = useProjectUpdates(project?.id || null);

  if (!project) {
    return null;
  }

  const recentUpdates = updates?.slice(0, 5) || [];

  // Build the updates link based on whether we're in a project route
  const updatesLink = projectId
    ? `/project/${projectId}/updates`
    : '/project-updates';

  return (
    <Card>
      <CardHeader className='py-3 px-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base'>Recent Updates</CardTitle>
          <Button
            variant='ghost'
            size='sm'
            as={Link}
            to={updatesLink}
            className='h-7 text-xs'
            rightIcon={<ArrowRightIcon className='h-3 w-3' />}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className='px-4 pb-4 pt-0'>
        {isLoading ? (
          <div className='flex items-center justify-center py-6'>
            <LoadingSpinner size='sm' />
          </div>
        ) : recentUpdates.length === 0 ? (
          <div className='text-center py-6'>
            <p className='text-sm text-neutral-600 dark:text-neutral-400 mb-3'>
              No updates yet. Be the first to share progress!
            </p>
            <Button as={Link} to={updatesLink} variant='outline' size='sm'>
              Post Update
            </Button>
          </div>
        ) : (
          <div className='space-y-3'>
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
                  className='border-b border-neutral-200 dark:border-neutral-800 last:border-0 pb-3 last:pb-0'>
                  <div className='flex items-start justify-between mb-0.5'>
                    <h4 className='text-sm font-semibold text-neutral-900 dark:text-neutral-100'>
                      {update.title}
                    </h4>
                  </div>
                  <p className='text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-1.5'>
                    {update.body}
                  </p>
                  <div className='text-[10px] text-neutral-500'>
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
