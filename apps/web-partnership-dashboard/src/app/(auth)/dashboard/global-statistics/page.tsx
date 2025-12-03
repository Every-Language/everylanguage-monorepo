'use client';

import { GlobalStatsWidget } from '@/features/global-stats/components/GlobalStatsWidget';

export const dynamic = 'force-dynamic';

export default function GlobalStatisticsPage() {
  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6'>
        <GlobalStatsWidget />
      </div>
    </div>
  );
}
