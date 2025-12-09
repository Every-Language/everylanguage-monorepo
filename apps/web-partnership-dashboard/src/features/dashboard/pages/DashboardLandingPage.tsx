'use client';

import React from 'react';
import { useAuth } from '@/features/auth';
import { useRouter } from 'next/navigation';
import { GlobalStatsWidget } from '@/features/global-stats/components/GlobalStatsWidget';
import { useUserPartnerOrgs } from '../hooks/useUserPartnerOrgs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';

const InlineWelcome: React.FC = () => {
  const { user } = useAuth();
  const first =
    (user?.user_metadata as { first_name?: string })?.first_name ?? '';
  const last = (user?.user_metadata as { last_name?: string })?.last_name ?? '';
  const name = `${first} ${last}`.trim() || (user?.email ?? 'there');
  return (
    <div>
      <div className='text-sm text-neutral-500'>Welcome back</div>
      <div className='text-2xl font-bold'>{name}!</div>
    </div>
  );
};

const PartnerOrgCards: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { partnerOrgs, isLoading } = useUserPartnerOrgs(user?.id ?? null);

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {/* Global Statistics Card */}
        <Card
          key='global-statistics'
          className='border border-neutral-200 dark:border-neutral-800 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 hover:scale-[1.02] transition-all duration-200 cursor-pointer'
          onClick={() => router.push('/dashboard/global-statistics')}>
          <CardHeader>
            <CardTitle className='text-lg'>
              Global Translation Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-neutral-500'>
              View global translation progress and statistics across all
              projects
            </div>
          </CardContent>
        </Card>

        {/* Loading skeleton */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, idx) => (
            <Card
              key={`skeleton-${idx}`}
              className='border border-neutral-200 dark:border-neutral-800'>
              <CardHeader>
                <div className='h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 animate-pulse' />
              </CardHeader>
              <CardContent>
                <div className='h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-full animate-pulse mb-2' />
                <div className='h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3 animate-pulse' />
              </CardContent>
            </Card>
          ))}

        {/* Partner Org Cards */}
        {!isLoading &&
          partnerOrgs.map(org => (
            <Card
              key={org.id}
              className='border border-neutral-200 dark:border-neutral-800 hover:shadow-lg hover:border-accent-300 dark:hover:border-accent-700 hover:scale-[1.02] transition-all duration-200 cursor-pointer'
              onClick={() =>
                router.push(
                  `/dashboard/partner-org/${encodeURIComponent(org.id)}`
                )
              }>
              <CardHeader>
                <CardTitle className='text-lg'>
                  {org.name}
                  {org.isPersonal && (
                    <span className='ml-2 text-xs text-neutral-500 font-normal'>
                      (Personal)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {org.description && (
                  <div className='text-sm text-neutral-500 line-clamp-2'>
                    {org.description}
                  </div>
                )}
                {!org.description && (
                  <div className='text-sm text-neutral-500'>
                    Partner organization
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
};

export const DashboardLandingPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className='min-h-screen flex items-center justify-center'>
        Loading…
      </div>
    );

  if (!user) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto max-w-6xl'>
          <GlobalStatsWidget />
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6'>
        <InlineWelcome />
        <PartnerOrgCards />
      </div>
    </div>
  );
};
