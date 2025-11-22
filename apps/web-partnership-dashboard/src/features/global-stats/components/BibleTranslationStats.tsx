import React from 'react';
import { CircularProgress } from '../../../shared/components/ui/CircularProgress';

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

      <div className='space-y-6'>
        {/* Full Audio Bible - Big and spans full width */}
        <article className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-6'>
          <div className='flex items-center gap-6'>
            {isLoading ? (
              <>
                <div className='h-24 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse flex-shrink-0' />
                <div className='flex-1 space-y-2'>
                  <div className='h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-40 animate-pulse' />
                  <div className='h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-48 animate-pulse' />
                </div>
              </>
            ) : (
              <>
                <CircularProgress
                  value={data?.full_audio_bible_percentage ?? 0}
                  size={compact ? 80 : 96}
                  strokeWidth={8}
                  color='accent'
                  showPercentage={false}
                >
                  <div className='text-center'>
                    <div
                      className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-accent-600 dark:text-accent-500`}
                    >
                      {(data?.full_audio_bible_percentage ?? 0)
                        .toFixed(1)
                        .replace(/\.0$/, '')}
                      %
                    </div>
                  </div>
                </CircularProgress>
                <div className='flex-1'>
                  <h3
                    className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-accent-600 dark:text-accent-500`}
                  >
                    Full Audio Bible
                  </h3>
                  <p className='mt-2 text-sm text-neutral-500'>
                    {numberFormatter.format(data?.full_audio_bible_count ?? 0)}{' '}
                    of {numberFormatter.format(data?.total_languages ?? 0)}{' '}
                    languages
                  </p>
                </div>
              </>
            )}
          </div>
        </article>

        {/* Text and Audio Portions - Side by side below */}
        <div className='grid gap-4 md:grid-cols-2'>
          {/* Audio Portions */}
          <article className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4'>
            <div className='flex items-center gap-4'>
              {isLoading ? (
                <>
                  <div className='h-16 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse flex-shrink-0' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-24 animate-pulse' />
                    <div className='h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-20 animate-pulse' />
                  </div>
                </>
              ) : (
                <>
                  <CircularProgress
                    value={data?.audio_portions_percentage ?? 0}
                    size={compact ? 64 : 80}
                    strokeWidth={6}
                    color='secondary'
                    showPercentage={false}
                  >
                    <div className='text-center'>
                      <div
                        className={`${compact ? 'text-sm' : 'text-base'} font-bold text-secondary-600 dark:text-secondary-500`}
                      >
                        {(data?.audio_portions_percentage ?? 0)
                          .toFixed(1)
                          .replace(/\.0$/, '')}
                        %
                      </div>
                    </div>
                  </CircularProgress>
                  <div className='flex-1'>
                    <p
                      className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-secondary-600 dark:text-secondary-500`}
                    >
                      Audio Portions
                    </p>
                    <p className='mt-1 text-xs text-neutral-500'>
                      {numberFormatter.format(data?.audio_portions_count ?? 0)}{' '}
                      languages
                    </p>
                  </div>
                </>
              )}
            </div>
          </article>

          {/* Text Portions */}
          <article className='rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4'>
            <div className='flex items-center gap-4'>
              {isLoading ? (
                <>
                  <div className='h-16 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse flex-shrink-0' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-20 animate-pulse' />
                    <div className='h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-20 animate-pulse' />
                  </div>
                </>
              ) : (
                <>
                  <CircularProgress
                    value={data?.text_portions_percentage ?? 0}
                    size={compact ? 64 : 80}
                    strokeWidth={6}
                    color='primary'
                    showPercentage={false}
                  >
                    <div className='text-center'>
                      <div
                        className={`${compact ? 'text-sm' : 'text-base'} font-bold text-primary-600 dark:text-primary-500`}
                      >
                        {(data?.text_portions_percentage ?? 0)
                          .toFixed(1)
                          .replace(/\.0$/, '')}
                        %
                      </div>
                    </div>
                  </CircularProgress>
                  <div className='flex-1'>
                    <p
                      className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-primary-600 dark:text-primary-500`}
                    >
                      Text Portions
                    </p>
                    <p className='mt-1 text-xs text-neutral-500'>
                      {numberFormatter.format(data?.text_portions_count ?? 0)}{' '}
                      languages
                    </p>
                  </div>
                </>
              )}
            </div>
          </article>
        </div>
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
