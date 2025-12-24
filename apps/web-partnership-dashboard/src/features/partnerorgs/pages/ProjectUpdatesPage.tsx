'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { useProjectUpdates } from '../api/useProjectUpdates';
import { UpdateFeed } from '../components/UpdateFeed';

export const ProjectUpdatesPage: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();
  const { data: updates, isLoading } = useProjectUpdates(
    projectId || 'all',
    orgId
  );

  if (isLoading) {
    return <div className='text-neutral-500'>Loading updates...</div>;
  }

  if (!updates || updates.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No updates available for this project
        </CardContent>
      </Card>
    );
  }

  return <UpdateFeed updates={updates} />;
};

export default ProjectUpdatesPage;
