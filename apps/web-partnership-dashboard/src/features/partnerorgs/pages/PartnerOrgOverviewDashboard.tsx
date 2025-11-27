'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { CountUp } from '../components/CountUp';
import { usePartnerOrgProjects } from '../hooks/usePartnerOrgProjects';
import { usePartnerOrgListeningSessions } from '../hooks/usePartnerOrgListeningSessions';
import { usePartnerOrgTotalDonations } from '../hooks/usePartnerOrgTotalDonations';
import { usePartnerOrgUpdates } from '../hooks/usePartnerOrgUpdates';
import Link from 'next/link';

const formatCurrency = (cents: number, currencyCode: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

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
  const totalDonations = donations?.total_cents || 0;
  const currencyCode = donations?.currency_code || 'USD';

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
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Number of Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={projectsCount} />
            </div>
          </CardContent>
        </Card>

        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Listening Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              <CountUp value={sessionsCount} />
            </div>
          </CardContent>
        </Card>

        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-sm text-neutral-500'>
              Total Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              {formatCurrency(totalDonations, currencyCode)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates Feed */}
      {updates && updates.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Updates</CardTitle>
              <Link
                href={`/dashboard/partner-org/${orgId}/updates`}
                className='text-sm text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300'>
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {updates.slice(0, 3).map(update => {
                const formatDate = (dateString: string) => {
                  const date = new Date(dateString);
                  const now = new Date();
                  const diffMs = now.getTime() - date.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                  if (diffDays === 0) return 'Today';
                  if (diffDays === 1) return 'Yesterday';
                  if (diffDays < 7) return `${diffDays} days ago`;
                  return date.toLocaleDateString();
                };

                if (update.type === 'project_update') {
                  const project = update.project;
                  const languageEntity = project?.language_entity
                    ? Array.isArray(project.language_entity)
                      ? project.language_entity[0]
                      : project.language_entity
                    : null;

                  return (
                    <div
                      key={update.id}
                      className='border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0 last:pb-0'>
                      <div className='flex items-start justify-between mb-1'>
                        <div className='font-semibold'>{update.title}</div>
                        <div className='text-xs text-neutral-500'>
                          {formatDate(update.timestamp)}
                        </div>
                      </div>
                      <div className='text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2'>
                        {update.body}
                      </div>
                      {languageEntity && (
                        <div className='text-xs text-neutral-500 mt-1'>
                          {languageEntity.name}
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={update.id}
                      className='border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0 last:pb-0'>
                      <div className='flex items-start justify-between mb-1'>
                        <div className='font-semibold'>Bible Audio Upload</div>
                        <div className='text-xs text-neutral-500'>
                          {formatDate(update.timestamp)}
                        </div>
                      </div>
                      {update.book_name && (
                        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                          {update.book_name}
                          {update.chapter_number !== null &&
                            update.chapter_number !== undefined && (
                              <> Chapter {update.chapter_number}</>
                            )}
                        </div>
                      )}
                      {update.language_name && (
                        <div className='text-xs text-neutral-500 mt-1'>
                          {update.language_name}
                        </div>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerOrgOverviewDashboard;
