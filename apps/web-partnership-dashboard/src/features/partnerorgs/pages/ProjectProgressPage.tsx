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
import { useProjectProgress } from '../api/useProjectProgress';
import { useBookProgress } from '../api/useBookProgress';
import { Progress } from '@/shared/components/ui/Progress';
import { normalizeSupabaseRelation } from '@/shared/utils/supabase-helpers';

export const ProjectProgressPage: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();
  const { data: progressData, isLoading } = useProjectProgress(
    projectId || 'all',
    orgId
  );

  // Get audio version IDs for book progress
  const audioVersionIds = React.useMemo(() => {
    if (!progressData?.versions) return [];
    return progressData.versions
      .filter(v => v.version_type === 'audio')
      .map(v => v.id)
      .filter((id): id is string => !!id);
  }, [progressData]);

  const { data: bookProgress, isLoading: bookProgressLoading } =
    useBookProgress(audioVersionIds);

  if (isLoading) {
    return (
      <div className='text-neutral-500'>Loading translation progress...</div>
    );
  }

  if (
    !progressData ||
    !progressData.versions ||
    progressData.versions.length === 0
  ) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No versions found for this project
        </CardContent>
      </Card>
    );
  }

  const { stats, versions } = progressData;

  return (
    <div className='space-y-6'>
      {/* Stats row */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Books Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={stats.totalBooksDone} />/{stats.totalBooks}
            </div>
            <div className='mt-3'>
              <AnimatedProgress
                value={stats.totalBooksDone}
                max={stats.totalBooks}
                color='accent'
              />
            </div>
          </CardContent>
        </Card>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Chapters Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={stats.totalChaptersDone} />/{stats.totalChapters}
            </div>
            <div className='mt-3'>
              <AnimatedProgress
                value={stats.totalChaptersDone}
                max={stats.totalChapters}
                color='accent'
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Book-by-book breakdown for audio versions */}
      {bookProgress && bookProgress.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle>Book-by-Book Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {bookProgressLoading ? (
              <div className='text-neutral-500'>Loading book progress...</div>
            ) : (
              <div className='space-y-2'>
                {bookProgress.map(book => {
                  const progressPercent =
                    book.total_chapters > 0
                      ? (book.chapters_with_audio / book.total_chapters) * 100
                      : 0;
                  return (
                    <div
                      key={book.book_id}
                      className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-3'>
                      <div className='flex items-center justify-between mb-2'>
                        <div className='font-medium'>{book.book.name}</div>
                        <div className='text-sm text-neutral-500'>
                          {book.chapters_with_audio} / {book.total_chapters}{' '}
                          chapters
                        </div>
                      </div>
                      <Progress value={progressPercent} className='h-2' />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Versions */}
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {versions.map(version => {
              const summary = normalizeSupabaseRelation(
                version.progress_summary
              );

              const booksComplete = summary?.books_complete || 0;
              const totalBooks = summary?.total_books || 66;
              const chaptersComplete =
                version.version_type === 'audio'
                  ? summary?.chapters_with_audio || 0
                  : summary?.complete_chapters || 0;
              const totalChapters = summary?.total_chapters || 1189;
              const versesCovered = summary?.covered_verses || 0;
              const totalVerses = summary?.total_verses || 0;

              return (
                <div
                  key={version.id}
                  className='border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='font-semibold'>{version.name}</div>
                    <span className='text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 capitalize'>
                      {version.version_type}
                    </span>
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <div className='text-neutral-500'>Books</div>
                      <div className='font-semibold'>
                        {booksComplete} / {totalBooks}
                      </div>
                    </div>
                    <div>
                      <div className='text-neutral-500'>Chapters</div>
                      <div className='font-semibold'>
                        {chaptersComplete} / {totalChapters}
                      </div>
                    </div>
                    <div>
                      <div className='text-neutral-500'>Verses</div>
                      <div className='font-semibold'>
                        {versesCovered.toLocaleString()} /{' '}
                        {totalVerses.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className='text-neutral-500'>Progress</div>
                      <div className='font-semibold'>
                        {totalChapters > 0
                          ? Math.round((chaptersComplete / totalChapters) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectProgressPage;
