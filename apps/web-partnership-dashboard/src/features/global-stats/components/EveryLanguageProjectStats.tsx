import React from 'react';

type ProjectSummary = {
  active_projects_total: number;
  completed_projects_total: number;
  total_chapters_completed: number;
};

type ProjectRow = {
  project_id: string;
  project_name: string;
  language_name: string;
  has_audio: boolean;
  has_text: boolean;
  completed_chapters: number;
  total_chapters: number;
  progress_percentage: number;
};

type Props = {
  summary?: ProjectSummary;
  projects?: ProjectRow[];
  isLoading?: boolean;
  compact?: boolean; // For use in map inspector panel
};

const numberFormatter = new Intl.NumberFormat();

export const EveryLanguageProjectStats: React.FC<Props> = ({
  summary,
  projects = [],
  isLoading,
  compact = false,
}) => {
  const content = (
    <>
      {!compact && (
        <header className='space-y-1'>
          <p className='text-sm font-semibold text-neutral-500'>
            Every Language Projects
          </p>
          <h2 className='text-2xl font-bold'>Project Status</h2>
          <p className='text-sm text-neutral-500'>
            Snapshot of active initiatives and their current progress.
          </p>
        </header>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        <SummaryCard
          label='Active Projects'
          value={summary?.active_projects_total}
          isLoading={isLoading}
        />
        <SummaryCard
          label='Completed Projects'
          value={summary?.completed_projects_total}
          isLoading={isLoading}
        />
        <SummaryCard
          label='Chapters Completed'
          value={summary?.total_chapters_completed}
          isLoading={isLoading}
        />
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>Active projects</h3>
          <p className='text-sm text-neutral-500'>
            Showing up to {projects.length} projects
          </p>
        </div>

        {isLoading ? (
          <div className='space-y-3'>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`project-skeleton-${idx}`}
                className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4 animate-pulse'
              >
                <div className='h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800' />
                <div className='mt-3 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800' />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-center text-sm text-neutral-500'>
            No active projects to display yet.
          </div>
        ) : (
          <div className='space-y-3'>
            {projects.map(project => (
              <article
                key={project.project_id}
                className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <p className='font-semibold text-neutral-900 dark:text-neutral-50'>
                      {project.project_name}
                    </p>
                    <p className='text-sm text-neutral-500'>
                      {project.language_name} ·{' '}
                      {[
                        project.has_audio ? 'Audio' : null,
                        project.has_text ? 'Text' : null,
                      ]
                        .filter(Boolean)
                        .join(' & ') || 'In progress'}
                    </p>
                  </div>
                  <p className='text-sm font-semibold text-neutral-700 dark:text-neutral-200'>
                    {project.progress_percentage.toFixed(1)}%
                  </p>
                </div>
                <div className='mt-3 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800'>
                  <div
                    className='h-2 rounded-full bg-indigo-500 transition-all'
                    style={{
                      width: `${Math.min(project.progress_percentage, 100)}%`,
                    }}
                  />
                </div>
                <p className='mt-2 text-xs text-neutral-500'>
                  {numberFormatter.format(project.completed_chapters)} of{' '}
                  {numberFormatter.format(project.total_chapters)} chapters
                  completed
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (compact) {
    return <div className='space-y-6'>{content}</div>;
  }

  return (
    <section className='rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6 space-y-6'>
      {content}
    </section>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value?: number;
  isLoading?: boolean;
}> = ({ label, value, isLoading }) => {
  return (
    <article className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4'>
      <p className='text-sm text-neutral-500'>{label}</p>
      {isLoading ? (
        <div className='mt-3 h-8 w-24 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse' />
      ) : (
        <p className='mt-2 text-3xl font-bold'>
          {numberFormatter.format(value ?? 0)}
        </p>
      )}
    </article>
  );
};
