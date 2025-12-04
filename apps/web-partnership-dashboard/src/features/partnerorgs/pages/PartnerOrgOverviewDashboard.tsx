'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { StatsCard } from '../components/StatsCard';
import { UpdateFeed } from '../components/UpdateFeed';
import { usePartnerOrgProjects } from '../api/usePartnerOrgProjects';
import { usePartnerOrgListeningSessions } from '../api/usePartnerOrgListeningSessions';
import { usePartnerOrgTotalDonations } from '../api/usePartnerOrgTotalDonations';
import { usePartnerOrgUpdates } from '../api/usePartnerOrgUpdates';
import { Card, CardHeader, CardContent } from '@/shared/components/ui/Card';

export const PartnerOrgOverviewDashboard: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    orgId!
  );
  const { data: listeningSessions, isLoading: sessionsLoading } =
    usePartnerOrgListeningSessions(orgId!);
  const { data: donations, isLoading: donationsLoading } =
    usePartnerOrgTotalDonations(orgId!);
  const { data: updates, isLoading: updatesLoading } = usePartnerOrgUpdates(
    orgId!
  );

  const isLoading =
    projectsLoading || sessionsLoading || donationsLoading || updatesLoading;

  const projectsCount = projects?.length || 0;
  const sessionsCount = listeningSessions || 0;
  const totalDonations = donations?.formattedTotal || '$0';

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {[1, 2, 3].map(i => (
            <Card
              key={i}
              className='border border-neutral-200 dark:border-neutral-800'>
              <CardHeader>
                <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 animate-pulse' />
              </CardHeader>
              <CardContent>
                <div className='h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Stats cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <StatsCard
          title='Number of Projects'
          value={projectsCount}
          animated={true}
        />
        <StatsCard
          title='Listening Sessions'
          value={sessionsCount}
          animated={true}
        />
        <StatsCard title='Total Donations' value={totalDonations} />
      </div>

      {/* Recent Updates Feed */}
      {updates && updates.length > 0 && (
        <UpdateFeed
          updates={updates}
          limit={3}
          showViewAll={true}
          viewAllHref={`/dashboard/partner-org/${orgId}/updates`}
        />
      )}
    </div>
  );
};

export default PartnerOrgOverviewDashboard;
