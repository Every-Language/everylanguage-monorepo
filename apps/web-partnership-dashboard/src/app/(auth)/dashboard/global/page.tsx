'use client';

import { GlobalStatsWidget } from '@/features/global-stats/components/GlobalStatsWidget';
import { PartnerOrgSelector } from '@/features/dashboard/components/PartnerOrgSelector';

export const dynamic = 'force-dynamic';

export default function GlobalDashboardPage() {
  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8'>
      <div className='mx-auto max-w-6xl space-y-6'>
        <PartnerOrgSelector className='max-w-md' />
        <GlobalStatsWidget />
      </div>
    </div>
  );
}
