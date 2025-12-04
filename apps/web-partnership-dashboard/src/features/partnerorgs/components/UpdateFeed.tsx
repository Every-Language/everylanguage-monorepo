import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { UpdateCard } from './UpdateCard';
import type { PartnerOrgUpdate, ProjectUpdate } from '../types';

export interface UpdateFeedProps {
  updates: (PartnerOrgUpdate | ProjectUpdate)[];
  limit?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export const UpdateFeed: React.FC<UpdateFeedProps> = ({
  updates,
  limit,
  showViewAll = false,
  viewAllHref,
}) => {
  const displayedUpdates = limit ? updates.slice(0, limit) : updates;

  if (updates.length === 0) {
    return null;
  }

  if (limit && updates.length > limit) {
    // Show compact feed with "View all" link
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Recent Updates</CardTitle>
            {showViewAll && viewAllHref && (
              <Link
                href={viewAllHref}
                className='text-sm text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300'>
                View all →
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {displayedUpdates.map(update => (
              <UpdateCard
                key={update.id}
                update={update}
                variant='compact'
                showProject={false}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show full feed (no limit or all updates fit within limit)
  return (
    <div className='space-y-6'>
      {displayedUpdates.map(update => (
        <UpdateCard
          key={update.id}
          update={update}
          variant='full'
          showProject={true}
        />
      ))}
    </div>
  );
};
