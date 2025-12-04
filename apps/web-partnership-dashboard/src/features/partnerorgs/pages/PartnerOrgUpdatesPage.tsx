'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { usePartnerOrgUpdates } from '../api/usePartnerOrgUpdates';
import { FeedItemSkeleton } from '@/shared/components/ui/Skeletons';
import { UpdateFeed } from '../components/UpdateFeed';

export const PartnerOrgUpdatesPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: updates, isLoading } = usePartnerOrgUpdates(orgId!);

  if (isLoading) {
    return <FeedItemSkeleton count={5} />;
  }

  if (!updates || updates.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No updates available for this partner organization
        </CardContent>
      </Card>
    );
  }

  return <UpdateFeed updates={updates} />;
};
