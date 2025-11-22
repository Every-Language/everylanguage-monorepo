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
import { CountUp } from '../components/CountUp';
import { usePartnerOrgProjects } from '../hooks/usePartnerOrgProjects';
import { useProjectProgress } from '../hooks/useProjectProgress';
import { useProjectDistribution } from '../hooks/useProjectDistribution';
import { ProjectCardSkeleton } from '@/shared/components/ui/Skeletons';

export const PartnerOrgOverviewPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    orgId!
  );
  const { data: progressData, isLoading: progressLoading } = useProjectProgress(
    'all',
    orgId
  );
  const { data: distributionData, isLoading: distributionLoading } =
    useProjectDistribution('all', orgId);

  // Get unique projects (may have multiple allocations) - ALWAYS call useMemo
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

  // Calculate progress per project - ALWAYS call useMemo
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

  // Calculate distribution stats per project - ALWAYS call useMemo
  const projectDistribution = React.useMemo(() => {
    if (!distributionData || !uniqueProjects || uniqueProjects.length === 0)
      return new Map();
    const distMap = new Map<
      string,
      { downloads: number; listeningHours: number }
    >();

    // Use per-language stats if available (from 'all' mode)
    if (
      (distributionData as any).perLanguageStats &&
      typeof (distributionData as any).perLanguageStats === 'object'
    ) {
      for (const project of uniqueProjects) {
        const langStats = ((distributionData as any).perLanguageStats as any)[
          project.language_entity_id
        ];
        if (langStats) {
          distMap.set(project.project_id, {
            downloads: langStats.downloads || 0,
            listeningHours: langStats.listeningHours || 0,
          });
        } else {
          distMap.set(project.project_id, {
            downloads: 0,
            listeningHours: 0,
          });
        }
      }
    } else {
      // Fallback: show zeros if no per-language breakdown
      for (const project of uniqueProjects) {
        distMap.set(project.project_id, {
          downloads: 0,
          listeningHours: 0,
        });
      }
    }

    return distMap;
  }, [distributionData, uniqueProjects]);

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
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {uniqueProjects.map(project => {
          const progress = projectProgress.get(project.project_id);
          const distribution = projectDistribution.get(project.project_id);

          return (
            <Card
              key={project.project_id}
              className='border border-neutral-200 dark:border-neutral-800 hover:shadow-md transition-shadow'
            >
              <CardHeader>
                <CardTitle className='text-lg'>
                  <Link
                    href={`/partner-org/${orgId}/progress`}
                    className='text-accent-600 hover:text-accent-700 dark:text-accent-600 dark:hover:text-accent-500'
                  >
                    {project.language_name}
                  </Link>
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

                {/* Distribution Stats */}
                {distributionLoading ? (
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
                ) : distribution ? (
                  <div className='grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
                    <div>
                      <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Downloads
                      </div>
                      <div className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                        <CountUp value={distribution.downloads} />
                      </div>
                    </div>
                    <div>
                      <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Listening Hours
                      </div>
                      <div className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                        <CountUp value={distribution.listeningHours} />
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
