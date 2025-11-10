import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { usePendingLanguages } from '../hooks/usePendingLanguages';
import { CountUp } from '../components/CountUp';

const formatCurrency = (cents: number, currencyCode: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

export const PendingLanguagesPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: pendingLanguages, isLoading } = usePendingLanguages(orgId!);

  if (isLoading) {
    return <div className='text-neutral-500'>Loading pending languages...</div>;
  }

  if (!pendingLanguages || pendingLanguages.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No pending language sponsorships
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='text-sm text-neutral-600 dark:text-neutral-400'>
        These languages are sponsored but not yet allocated to specific
        projects.
      </div>

      <div className='grid grid-cols-1 gap-4'>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {pendingLanguages.map((lang: any) => {
          const totalListeningHours = Math.round(
            (lang.language_stats?.total_listened_seconds || 0) / 3600
          );

          return (
            <Card
              key={lang.sponsorship_id}
              className='border border-neutral-200 dark:border-neutral-800'
            >
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div>
                    <CardTitle>{lang.language_name}</CardTitle>
                    <div className='text-xs text-neutral-500 mt-1'>
                      Status: {lang.sponsorship_status}
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-sm text-neutral-500'>
                      Sponsorship ID
                    </div>
                    <div className='text-xs font-mono text-neutral-400'>
                      {lang.sponsorship_id?.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
                  {/* Funding */}
                  <div>
                    <div className='text-xs text-neutral-500 mb-2'>Funding</div>
                    <div className='space-y-1'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Estimated Budget:
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            lang.estimated_budget_cents || 0,
                            lang.currency_code || 'USD'
                          )}
                        </span>
                      </div>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Pledged (one-time):
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            lang.pledge_one_time_cents || 0,
                            lang.currency_code || 'USD'
                          )}
                        </span>
                      </div>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Pledged (recurring):
                        </span>
                        <span className='font-semibold'>
                          {formatCurrency(
                            lang.pledge_recurring_cents || 0,
                            lang.currency_code || 'USD'
                          )}
                        </span>
                      </div>
                      <div className='flex items-center justify-between text-sm pt-1 border-t border-neutral-200 dark:border-neutral-800'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Total Contributed:
                        </span>
                        <span className='font-bold text-accent-600'>
                          {formatCurrency(
                            lang.total_contributed_cents || 0,
                            lang.currency_code || 'USD'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Language Stats */}
                  <div>
                    <div className='text-xs text-neutral-500 mb-2'>
                      Language Usage
                    </div>
                    <div className='space-y-2'>
                      <div>
                        <div className='text-2xl font-bold tracking-tight'>
                          <CountUp
                            value={lang.language_stats?.downloads || 0}
                          />
                        </div>
                        <div className='text-xs text-neutral-500'>
                          App Downloads
                        </div>
                      </div>
                      <div>
                        <div className='text-2xl font-bold tracking-tight'>
                          <CountUp value={totalListeningHours} />
                        </div>
                        <div className='text-xs text-neutral-500'>
                          Total Listening Hours
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <div className='text-xs text-neutral-500 mb-2'>
                      Timeline
                    </div>
                    <div className='space-y-1 text-sm'>
                      <div className='flex items-center justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Adoption Status:
                        </span>
                        <span className='font-semibold capitalize'>
                          {lang.adoption_status}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Sponsored:
                        </span>
                        <span className='font-semibold'>
                          {lang.sponsorship_created_at
                            ? new Date(
                                lang.sponsorship_created_at
                              ).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PendingLanguagesPage;
