'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { StatsCard } from '../components/StatsCard';
import { UpdateFeed } from '../components/UpdateFeed';
import { useProjectProgress } from '../api/useProjectProgress';
import { useProjectListeningSessions } from '../api/useProjectListeningSessions';
import { useProjectUpdates } from '../api/useProjectUpdates';
import { Card, CardHeader, CardContent } from '@/shared/components/ui/Card';

export const ProjectOverviewDashboard: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();

  const { data: progressData, isLoading: progressLoading } = useProjectProgress(
    projectId || 'all',
    orgId
  );
  const { data: listeningSessions, isLoading: sessionsLoading } =
    useProjectListeningSessions(projectId!);
  const { data: updates, isLoading: updatesLoading } = useProjectUpdates(
    projectId!,
    orgId
  );

  const isLoading = progressLoading || sessionsLoading || updatesLoading;

  const chaptersCompleted = progressData?.stats.totalChaptersDone || 0;

  const sessionsCount = listeningSessions || 0;

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {[1, 2].map(i => (
            <Card
              key={i}
              className='border border-neutral-200 dark:border-neutral-800'>
              <CardHeader>
                <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse' />
              </CardHeader>
              <CardContent>
                <div className='h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Stats cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <StatsCard
          title='Total Chapters Completed'
          value={chaptersCompleted}
          subtitle='Across all versions'
          animated={true}
        />
        <StatsCard
          title='Listening Sessions'
          value={sessionsCount}
          animated={true}
        />
      </div>

      {/* Recent Updates Feed */}
      {updates && updates.length > 0 && (
        <UpdateFeed
          updates={updates}
          limit={3}
          showViewAll={true}
          viewAllHref={`/dashboard/partner-org/${orgId}/project/${projectId}/updates`}
        />
      )}
    </div>
  );
};

export default ProjectOverviewDashboard;
