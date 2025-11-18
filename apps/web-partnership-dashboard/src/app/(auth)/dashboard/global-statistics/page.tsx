'use client';

import { GlobalStatsWidget } from '@/features/global-stats/components/GlobalStatsWidget';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function GlobalStatisticsPage() {
  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6'>
        {/* Breadcrumbs and Back Button */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link
              href='/dashboard'
              className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors'
              aria-label='Back'
            >
              ←
            </Link>
            <div>
              <div className='text-xs text-neutral-500'>
                <Link href='/dashboard' className='hover:underline'>
                  Dashboard
                </Link>{' '}
                / Global Translation Statistics
              </div>
              <h1 className='text-2xl font-bold'>
                Global Translation Statistics
              </h1>
            </div>
          </div>
        </div>

        <GlobalStatsWidget />
      </div>
    </div>
  );
}
