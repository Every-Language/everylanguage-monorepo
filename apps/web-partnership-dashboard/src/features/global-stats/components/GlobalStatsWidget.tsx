import React from 'react';
import {
  useActiveProjectsWithProgress,
  useGlobalStatistics,
  useRecentActivityFeed,
} from '../hooks/useGlobalStats';
import { BibleTranslationStats } from './BibleTranslationStats';
import { EveryLanguageProjectStats } from './EveryLanguageProjectStats';
import { RecentActivityFeed } from './RecentActivityFeed';

type GlobalStatsWidgetProps = {
  compact?: boolean; // For use in map inspector panel
};

export const GlobalStatsWidget: React.FC<GlobalStatsWidgetProps> = ({
  compact = false,
}) => {
  const bibleStatsQuery = useGlobalStatistics();
  const projectStatusQuery = useActiveProjectsWithProgress();
  const activityFeedQuery = useRecentActivityFeed(12);

  const hasError =
    bibleStatsQuery.isError ||
    projectStatusQuery.isError ||
    activityFeedQuery.isError;

  return (
    <div className='space-y-6'>
      {hasError && (
        <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          Something went wrong while loading global statistics. Please try
          again.
        </div>
      )}

      <BibleTranslationStats
        data={bibleStatsQuery.data?.data}
        isLoading={bibleStatsQuery.isLoading}
        compact={compact}
      />

      <EveryLanguageProjectStats
        summary={projectStatusQuery.data?.summary}
        projects={projectStatusQuery.data?.projects}
        isLoading={projectStatusQuery.isLoading}
      />

      <RecentActivityFeed
        items={activityFeedQuery.data?.items}
        isLoading={activityFeedQuery.isLoading}
      />
    </div>
  );
};
