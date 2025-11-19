import React from 'react';

type ActivityItem =
  | {
      id: string;
      type: 'bible_audio';
      timestamp: string;
      language_name: string;
      book_name: string;
      chapter_number: number | null;
    }
  | {
      id: string;
      type: 'project_update';
      timestamp: string;
      project_name: string;
      language_name: string;
      title: string;
      body: string;
      media_keys: string[];
    };

type Props = {
  items?: ActivityItem[];
  isLoading?: boolean;
  compact?: boolean; // For use in map inspector panel
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const excerpt = (text: string, maxLength: number = 140) =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}…`;

const typeLabels: Record<ActivityItem['type'], string> = {
  bible_audio: 'Bible audio upload',
  project_update: 'Project update',
};

export const RecentActivityFeed: React.FC<Props> = ({
  items = [],
  isLoading,
  compact = false,
}) => {
  const hasActivity = items.length > 0;

  const content = (
    <>
      {!compact && (
        <header className='space-y-1'>
          <p className='text-sm font-semibold text-neutral-500'>
            Recent Activity
          </p>
          <h2 className='text-2xl font-bold'>What&apos;s new</h2>
          <p className='text-sm text-neutral-500'>
            Latest Bible audio uploads and public project updates.
          </p>
        </header>
      )}

      {isLoading ? (
        <SkeletonList />
      ) : !hasActivity ? (
        <EmptyState message='No recent activity yet.' />
      ) : (
        <ul className='space-y-4'>
          {items.map(item => (
            <li
              key={`${item.type}-${item.id}`}
              className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4'
            >
              <div className='flex items-center justify-between text-sm text-neutral-500'>
                <span className='inline-flex items-center gap-2'>
                  <span className='text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300'>
                    {typeLabels[item.type]}
                  </span>
                  <span className='text-neutral-400'>•</span>
                  <span>
                    {item.type === 'bible_audio'
                      ? item.language_name
                      : `${item.project_name} · ${item.language_name}`}
                  </span>
                </span>
                <time dateTime={item.timestamp}>
                  {dateFormatter.format(new Date(item.timestamp))}
                </time>
              </div>

              {item.type === 'bible_audio' ? (
                <div className='mt-2 space-y-1'>
                  <p className='text-base font-semibold text-neutral-900 dark:text-neutral-50'>
                    {item.book_name}
                    {item.chapter_number
                      ? ` · Chapter ${item.chapter_number}`
                      : ''}
                  </p>
                  <p className='text-sm text-neutral-500'>
                    Audio published for {item.language_name}
                  </p>
                </div>
              ) : (
                <div className='mt-2 space-y-2'>
                  <p className='text-base font-semibold text-neutral-900 dark:text-neutral-50'>
                    {item.title}
                  </p>
                  <p className='text-sm text-neutral-600 dark:text-neutral-300'>
                    {excerpt(item.body)}
                  </p>
                  {item.media_keys.length > 0 && (
                    <p className='text-xs text-neutral-500'>
                      {item.media_keys.length} media attachment
                      {item.media_keys.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
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

const SkeletonList: React.FC = () => (
  <div className='space-y-3'>
    {Array.from({ length: 3 }).map((_, idx) => (
      <div
        key={`activity-skeleton-${idx}`}
        className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4 animate-pulse space-y-3'
      >
        <div className='h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800' />
        <div className='h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800' />
        <div className='h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800' />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className='rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-center text-sm text-neutral-500'>
    {message}
  </div>
);
