import React from 'react';

type BibleStats = {
  total_languages: number;
  full_audio_bible_count: number;
  full_audio_bible_percentage: number;
  audio_portions_count: number;
  audio_portions_percentage: number;
  text_portions_count: number;
  text_portions_percentage: number;
};

type BibleTranslationStatsProps = {
  data?: BibleStats;
  isLoading?: boolean;
  compact?: boolean; // For use in map inspector panel
};

const numberFormatter = new Intl.NumberFormat();

const cards = [
  {
    key: 'full',
    label: 'Full Audio Bible',
    color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/20',
    valueKey: 'full_audio_bible_percentage' as const,
    countKey: 'full_audio_bible_count' as const,
  },
  {
    key: 'audio',
    label: 'Audio Portions',
    color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/20',
    valueKey: 'audio_portions_percentage' as const,
    countKey: 'audio_portions_count' as const,
  },
  {
    key: 'text',
    label: 'Text Portions',
    color: 'text-accent-600 bg-accent-50 dark:bg-accent-900/20',
    valueKey: 'text_portions_percentage' as const,
    countKey: 'text_portions_count' as const,
  },
];

export const BibleTranslationStats: React.FC<BibleTranslationStatsProps> = ({
  data,
  isLoading,
  compact = false,
}) => {
  const content = (
    <>
      {!compact && (
        <header className='space-y-1'>
          <p className='text-sm font-semibold text-neutral-500'>
            Global Coverage
          </p>
          <h2 className='text-2xl font-bold'>Bible Translation Progress</h2>
          <p className='text-sm text-neutral-500'>
            Share of {numberFormatter.format(data?.total_languages ?? 0)}{' '}
            tracked languages with access to scripture today.
          </p>
        </header>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        {cards.map(card => (
          <article
            key={card.key}
            className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4'
          >
            <p className='text-sm font-medium text-neutral-500'>{card.label}</p>
            {isLoading ? (
              <div
                className={`mt-3 ${compact ? 'h-8 w-20' : 'h-10 w-24'} rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse`}
              />
            ) : (
              <div
                className={`mt-2 ${compact ? 'text-2xl' : 'text-4xl'} font-bold ${card.color}`}
              >
                {(data?.[card.valueKey] ?? 0).toFixed(2).replace(/\.00$/, '')}%
              </div>
            )}
            <p className='mt-2 text-sm text-neutral-500'>
              {isLoading ? (
                <span className='inline-block h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse' />
              ) : (
                `${numberFormatter.format(
                  data?.[card.countKey] ?? 0
                )} languages`
              )}
            </p>
          </article>
        ))}
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
