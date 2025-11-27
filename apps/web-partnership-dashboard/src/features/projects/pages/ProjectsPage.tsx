'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { Progress } from '@/shared/components/ui/Progress';
import { CountUp } from '@/features/partnerorgs/components/CountUp';
import { usePartnerOrgProjects } from '@/features/partnerorgs/hooks/usePartnerOrgProjects';
import { useProjectProgress } from '@/features/partnerorgs/hooks/useProjectProgress';
import { ProjectCardSkeleton } from '@/shared/components/ui/Skeletons';

export const ProjectsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    orgId!
  );
  const { data: progressData, isLoading: progressLoading } = useProjectProgress(
    'all',
    orgId
  );

  // Get unique projects (may have multiple allocations)
  const uniqueProjects = React.useMemo(() => {
    if (!projects) return [];
    const seen = new Map<string, (typeof projects)[0]>();
    for (const project of projects) {
      if (!seen.has(project.project_id)) {
        seen.set(project.project_id, project);
      }
    }
    return Array.from(seen.values());
  }, [projects]);

  // Calculate progress per project
  const projectProgress = React.useMemo(() => {
    if (
      !progressData ||
      !Array.isArray(progressData) ||
      !uniqueProjects ||
      uniqueProjects.length === 0
    )
      return new Map();
    const progressMap = new Map<string, { completed: number; total: number }>();

    for (const project of uniqueProjects) {
      const versions = progressData.filter(
        (v: any) => v.project_id === project.project_id
      );

      // Find the best progress across all versions (audio and text)
      let bestChaptersDone = 0;
      let bestChaptersTotal = 1189; // Default to standard Bible chapter count

      if (versions.length > 0) {
        // Get the maximum progress across all versions (audio and text)
        for (const version of versions) {
          const summary = (version as any)?.progress_summary?.[0];
          if (summary) {
            let completed = 0;
            const total = summary.total_chapters || 1189;

            // Handle both audio and text versions
            if (version.version_type === 'audio') {
              completed = summary.chapters_with_audio || 0;
            } else if (version.version_type === 'text') {
              completed = summary.complete_chapters || 0;
            }

            // Take the max completed chapters (best progress)
            if (completed > bestChaptersDone) {
              bestChaptersDone = completed;
              bestChaptersTotal = total;
            }
          }
        }
      }

      if (bestChaptersTotal > 0) {
        progressMap.set(project.project_id, {
          completed: bestChaptersDone,
          total: bestChaptersTotal,
        });
      }
    }

    return progressMap;
  }, [progressData, uniqueProjects]);

  // Show skeleton while loading projects
  if (projectsLoading) {
    return <ProjectCardSkeleton count={3} />;
  }

  // Show empty state only after projects have loaded
  if (!uniqueProjects || uniqueProjects.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No projects found for this partner organization
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6'>
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {uniqueProjects.map(project => {
              const progress = projectProgress.get(project.project_id);

              return (
                <Link
                  key={project.project_id}
                  href={`/dashboard/partner-org/${orgId}/project/${project.project_id}`}
                  className='block'>
                  <Card className='border border-neutral-200 dark:border-neutral-800 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer h-full'>
                    <CardHeader>
                      <CardTitle className='text-lg text-neutral-900 dark:text-neutral-100'>
                        {project.language_name}
                      </CardTitle>
                      <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                        {project.project_name}
                      </div>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      {/* Bible Progress */}
                      {progressLoading ? (
                        <div>
                          <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 animate-pulse mb-2' />
                          <div className='flex items-center justify-between mb-1'>
                            <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse' />
                            <div className='h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-8 animate-pulse' />
                          </div>
                          <div className='h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse' />
                        </div>
                      ) : progress ? (
                        <div>
                          <div className='text-xs text-neutral-500 dark:text-neutral-400 mb-1'>
                            Bible Progress
                          </div>
                          <div className='flex items-center justify-between mb-1'>
                            <span className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                              <CountUp value={progress.completed} /> /{' '}
                              {progress.total} chapters
                            </span>
                            <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                              {Math.round(
                                (progress.completed / progress.total) * 100
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={(progress.completed / progress.total) * 100}
                            className='h-2'
                          />
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
