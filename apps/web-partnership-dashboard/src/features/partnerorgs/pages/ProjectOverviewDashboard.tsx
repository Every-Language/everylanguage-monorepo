'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { CountUp } from '../components/CountUp';
import { useProjectProgress } from '../hooks/useProjectProgress';
import { useProjectListeningSessions } from '../hooks/useProjectListeningSessions';
import { useProjectUpdates } from '../hooks/useProjectUpdates';
import Link from 'next/link';

export const ProjectOverviewDashboard: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();

  const { data: versions, isLoading: progressLoading } = useProjectProgress(
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

  // Calculate total chapters completed across all versions
  const chaptersCompleted = React.useMemo(() => {
    if (!versions || !Array.isArray(versions) || versions.length === 0) {
      return 0;
    }

    let totalChaptersDone = 0;

    for (const version of versions) {
      const summary = Array.isArray(version.progress_summary)
        ? version.progress_summary[0]
        : null;

      if (summary) {
        let completed = 0;
        if (version.version_type === 'audio') {
          completed = (summary as any).chapters_with_audio || 0;
        } else if (version.version_type === 'text') {
          completed = (summary as any).complete_chapters || 0;
        }

        // Take the max across all versions
        totalChaptersDone = Math.max(totalChaptersDone, completed);
      }
    }

    return totalChaptersDone;
  }, [versions]);

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
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Total Chapters Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={chaptersCompleted} />
            </div>
            <div className='text-xs text-neutral-500 mt-1'>
              Across all versions
            </div>
          </CardContent>
        </Card>

        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Listening Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={sessionsCount} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates Feed */}
      {updates && updates.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Updates</CardTitle>
              <Link
                href={`/dashboard/partner-org/${orgId}/project/${projectId}/updates`}
                className='text-sm text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300'>
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {updates.slice(0, 3).map(update => {
                const formatDate = (dateString: string) => {
                  const date = new Date(dateString);
                  const now = new Date();
                  const diffMs = now.getTime() - date.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                  if (diffDays === 0) return 'Today';
                  if (diffDays === 1) return 'Yesterday';
                  if (diffDays < 7) return `${diffDays} days ago`;
                  return date.toLocaleDateString();
                };

                const project = Array.isArray(update.project)
                  ? update.project[0]
                  : update.project;
                const languageEntity = project?.language_entity
                  ? Array.isArray(project.language_entity)
                    ? project.language_entity[0]
                    : project.language_entity
                  : null;

                return (
                  <div
                    key={update.id}
                    className='border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0 last:pb-0'>
                    <div className='flex items-start justify-between mb-1'>
                      <div className='font-semibold'>{update.title}</div>
                      <div className='text-xs text-neutral-500'>
                        {formatDate(update.created_at)}
                      </div>
                    </div>
                    <div className='text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2'>
                      {update.body}
                    </div>
                    {languageEntity && (
                      <div className='text-xs text-neutral-500 mt-1'>
                        {languageEntity.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectOverviewDashboard;
