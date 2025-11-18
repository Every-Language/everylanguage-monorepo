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

        // Find the best progress across all versions (audio and text)
        let bestChaptersDone = 0;
        let bestChaptersTotal = 1189; // Default to standard Bible chapter count
        let bestVersionType: 'audio' | 'text' | null = null;

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
                bestVersionType = version.version_type;
              }
            }
          }
        }

        return (
          <Card
            key={project.project_id}
            className='border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
          >
            <CardHeader>
              <CardTitle className='text-neutral-900 dark:text-neutral-100'>
                {project.language_name} • {project.project_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Best Progress */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-neutral-500 dark:text-neutral-400'>
                    {bestVersionType === 'audio'
                      ? 'Audio'
                      : bestVersionType === 'text'
                        ? 'Text'
                        : 'Bible'}{' '}
                    Progress
                  </span>
                  <span className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    <CountUp value={bestChaptersDone} /> / {bestChaptersTotal}{' '}
                    chapters
                  </span>
                </div>
                <AnimatedProgress
                  value={bestChaptersDone}
                  max={bestChaptersTotal}
                  color='accent'
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
