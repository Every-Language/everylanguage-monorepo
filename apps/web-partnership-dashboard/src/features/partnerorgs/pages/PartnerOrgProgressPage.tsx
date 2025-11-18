'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { AnimatedProgress } from '../components/AnimatedProgress';
import { CountUp } from '../components/CountUp';
import { usePartnerOrgProjects } from '../hooks/usePartnerOrgProjects';
import { useProjectProgress } from '../hooks/useProjectProgress';

export const PartnerOrgProgressPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    orgId!
  );
  const { data: progressData, isLoading: progressLoading } = useProjectProgress(
    'all',
    orgId
  );

  // Get unique projects - ALWAYS call useMemo before any returns
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

  // Group progress data by project - ALWAYS call useMemo before any returns
  const projectProgressMap = React.useMemo(() => {
    if (!progressData || !uniqueProjects || uniqueProjects.length === 0)
      return new Map();
    const map = new Map<string, any[]>();

    for (const project of uniqueProjects) {
      const versions = progressData.filter(
        (av: any) => av.project_id === project.project_id
      );
      if (versions.length > 0) {
        map.set(project.project_id, versions);
      }
    }

    return map;
  }, [progressData, uniqueProjects]);

  const _isLoading = projectsLoading || progressLoading; // Suppress unused warning

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
      {uniqueProjects.map(project => {
        const versions = projectProgressMap.get(project.project_id) || [];

        // Aggregate progress across all versions for this project
        // For overall progress, we want the maximum completed chapters across all versions
        // (since different versions might have different progress)
        let chaptersDone = 0;
        let chaptersTotal = 1189; // Default to standard Bible chapter count

        if (versions.length > 0) {
          // Get the maximum progress across all versions
          for (const version of versions) {
            const summary = (version as any)
              ?.audio_version_progress_summary?.[0];
            if (summary) {
              const completed = summary.chapters_completed || 0;
              const total = summary.total_chapters || 1189;
              // Take the max completed chapters (best progress)
              chaptersDone = Math.max(chaptersDone, completed);
              // Use the total from the first summary (should be consistent)
              if (chaptersTotal === 1189) {
                chaptersTotal = total;
              }
            }
          }
        }

        return (
          <Card
            key={project.project_id}
            className='border border-neutral-200 dark:border-neutral-800'
          >
            <CardHeader>
              <CardTitle>
                {project.language_name} • {project.project_name}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Overall Progress */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-neutral-500'>
                    Overall Progress
                  </span>
                  <span className='text-sm font-medium'>
                    <CountUp value={chaptersDone} /> / {chaptersTotal} chapters
                  </span>
                </div>
                <AnimatedProgress
                  value={chaptersDone}
                  max={chaptersTotal}
                  color='accent'
                />
              </div>

              {/* Audio Versions */}
              {versions.length > 0 && (
                <div>
                  <div className='text-sm font-medium mb-2'>Audio Versions</div>
                  <div className='space-y-2'>
                    {versions.map((version: any) => {
                      const summary =
                        version.audio_version_progress_summary?.[0];
                      const vChaptersDone = summary?.chapters_completed || 0;
                      const vChaptersTotal = summary?.total_chapters || 1189;

                      return (
                        <div key={version.id} className='text-sm'>
                          <div className='flex items-center justify-between mb-1'>
                            <span>{version.name}</span>
                            <span className='text-neutral-500'>
                              {vChaptersDone} / {vChaptersTotal}
                            </span>
                          </div>
                          <AnimatedProgress
                            value={vChaptersDone}
                            max={vChaptersTotal}
                            color='accent'
                            className='h-1'
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
