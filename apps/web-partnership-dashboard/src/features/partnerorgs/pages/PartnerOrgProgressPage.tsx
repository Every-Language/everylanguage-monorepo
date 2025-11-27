'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
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
import { useBookProgress } from '../hooks/useBookProgress';
import { ProjectCardSkeleton } from '@/shared/components/ui/Skeletons';

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
    if (
      !progressData ||
      !Array.isArray(progressData) ||
      !uniqueProjects ||
      uniqueProjects.length === 0
    )
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

  // Get all audio version IDs for book progress fetching - MUST be called before any returns
  const allAudioVersionIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const versions of projectProgressMap.values()) {
      for (const version of versions) {
        if (version.version_type === 'audio' && version.id) {
          ids.push(version.id);
        }
      }
    }
    return ids;
  }, [projectProgressMap]);

  // Fetch book-level progress for all audio versions - MUST be called before any returns
  const { data: bookProgressData, isLoading: bookProgressLoading } =
    useBookProgress(allAudioVersionIds);

  // Group book progress by audio version ID - MUST be called before any returns
  const bookProgressByVersion = React.useMemo(() => {
    const map = new Map<string, typeof bookProgressData>();
    if (bookProgressData) {
      for (const book of bookProgressData) {
        const existing = map.get(book.audio_version_id) || [];
        map.set(book.audio_version_id, [...existing, book]);
      }
    }
    return map;
  }, [bookProgressData]);

  // Track expanded state for each project
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(
    new Set()
  );

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

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
    <div className='space-y-4'>
      {uniqueProjects.map(project => {
        const versions = projectProgressMap.get(project.project_id) || [];
        const isExpanded = expandedProjects.has(project.project_id);

        // Find the best progress across all versions (audio and text)
        let bestChaptersDone = 0;
        let bestChaptersTotal = 1189; // Default to standard Bible chapter count
        let bestVersionType: 'audio' | 'text' | null = null;
        let bestAudioVersionId: string | null = null;

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
                if (completed > bestChaptersDone && version.id) {
                  bestAudioVersionId = version.id;
                }
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

        // Get book progress for the best audio version (if available)
        const bookProgress =
          bestAudioVersionId && bookProgressByVersion.has(bestAudioVersionId)
            ? bookProgressByVersion.get(bestAudioVersionId) || []
            : [];

        return (
          <Card
            key={project.project_id}
            className='border border-neutral-200 dark:border-neutral-800 hover:shadow-md transition-shadow'>
            <CardHeader>
              <button
                onClick={() => toggleProject(project.project_id)}
                className='w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity'>
                <div className='flex-1'>
                  <CardTitle className='text-lg text-neutral-900 dark:text-neutral-100'>
                    {project.language_name} • {project.project_name}
                  </CardTitle>
                  {!progressLoading && (
                    <div className='flex items-center gap-4 mt-2'>
                      <span className='text-sm text-neutral-500 dark:text-neutral-400'>
                        {bestVersionType === 'audio'
                          ? 'Audio'
                          : bestVersionType === 'text'
                            ? 'Text'
                            : 'Bible'}{' '}
                        Progress
                      </span>
                      <span className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        <CountUp value={bestChaptersDone} /> /{' '}
                        {bestChaptersTotal} chapters
                      </span>
                    </div>
                  )}
                </div>
                <div className='ml-4 flex-shrink-0'>
                  {isExpanded ? (
                    <ChevronUpIcon className='w-5 h-5 text-neutral-500' />
                  ) : (
                    <ChevronDownIcon className='w-5 h-5 text-neutral-500' />
                  )}
                </div>
              </button>
            </CardHeader>
            {isExpanded && (
              <CardContent className='space-y-4 pt-0'>
                {/* Overall Progress */}
                {progressLoading ? (
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse' />
                      <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
                    </div>
                    <div className='h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse' />
                  </div>
                ) : (
                  <div>
                    <div className='text-xs text-neutral-500 dark:text-neutral-400 mb-1'>
                      {bestVersionType === 'audio'
                        ? 'Audio'
                        : bestVersionType === 'text'
                          ? 'Text'
                          : 'Bible'}{' '}
                      Progress
                    </div>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        <CountUp value={bestChaptersDone} /> /{' '}
                        {bestChaptersTotal} chapters
                      </span>
                      <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                        {Math.round(
                          (bestChaptersDone / bestChaptersTotal) * 100
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={(bestChaptersDone / bestChaptersTotal) * 100}
                      className='h-2'
                    />
                  </div>
                )}

                {/* Book-level Breakdown */}
                {bestVersionType === 'audio' && bookProgress.length > 0 && (
                  <div className='mt-6'>
                    <h4 className='text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3'>
                      Progress by Book
                    </h4>
                    <div className='space-y-2'>
                      {bookProgress.map(book => {
                        const progressPercent =
                          book.total_chapters > 0
                            ? (book.chapters_with_audio / book.total_chapters) *
                              100
                            : 0;
                        return (
                          <div
                            key={book.book_id}
                            className='flex items-center justify-between p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50'>
                            <div className='flex-1'>
                              <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                                {book.book.name}
                              </div>
                              <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                                {book.chapters_with_audio} /{' '}
                                {book.total_chapters} chapters
                              </div>
                            </div>
                            <div className='w-32 ml-4'>
                              <Progress
                                value={progressPercent}
                                className='h-2'
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {bestVersionType === 'audio' &&
                  bookProgressLoading &&
                  bookProgress.length === 0 && (
                    <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Loading book-level progress...
                    </div>
                  )}

                {bestVersionType === 'audio' &&
                  !bookProgressLoading &&
                  bookProgress.length === 0 && (
                    <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                      No book-level progress data available
                    </div>
                  )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
