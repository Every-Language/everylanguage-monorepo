'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/features/auth';
import { usePartnerOrgDonations } from '../api/usePartnerOrgDonations';
import { TableRowSkeleton } from '@/shared/components/ui/Skeletons';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import { normalizeSupabaseRelation } from '@/shared/utils/supabase-helpers';

export const PartnerOrgDonationsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: donations, isLoading } = usePartnerOrgDonations(
    orgId!,
    user?.id ?? null
  );

  if (isLoading) {
    return <TableRowSkeleton count={7} columns={4} />;
  }

  if (!donations || donations.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No donations found for this partner organization
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-0'>
      {/* Table Header */}
      <div className='grid grid-cols-[1fr_1fr_1fr_2fr] gap-4 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400'>
        <div>Date</div>
        <div>Status</div>
        <div>Amount</div>
        <div>Allocations</div>
      </div>

      {/* Table Rows */}
      {donations.map(donation => {
        const totalAllocated = donation.donation_allocations.reduce(
          (sum, alloc) => sum + alloc.amount_cents,
          0
        );

        return (
          <div
            key={donation.id}
            className='grid grid-cols-[1fr_1fr_1fr_2fr] gap-4 px-4 py-4 border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors'>
            {/* Date Column */}
            <div className='text-sm text-neutral-900 dark:text-neutral-100'>
              {formatDate(donation.created_at)}
            </div>

            {/* Status Column */}
            <div className='space-y-1'>
              <span
                className={`text-xs px-2 py-1 rounded capitalize inline-block ${
                  donation.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : donation.status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}>
                {donation.status}
              </span>
              {donation.is_recurring && donation.subscription && (
                <div className='flex items-center gap-1'>
                  <span className='text-xs text-blue-600 dark:text-blue-400'>
                    Recurring
                  </span>
                  {normalizeSupabaseRelation(donation.subscription)?.status ===
                    'active' && (
                    <Button
                      variant='ghost'
                      size='xs'
                      className='h-5 px-1 text-xs'
                      onClick={() => router.push('/profile/subscriptions')}>
                      Manage
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Amount Column */}
            <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
              {formatCurrency(donation.amount_cents, donation.currency_code)}
            </div>

            {/* Allocations Column */}
            <div className='space-y-1'>
              {donation.donation_allocations.length > 0 ? (
                <>
                  {donation.donation_allocations.map(alloc => (
                    <div
                      key={alloc.id}
                      className='text-sm text-neutral-700 dark:text-neutral-300'>
                      <span className='font-medium'>
                        {formatCurrency(
                          alloc.amount_cents,
                          alloc.currency_code
                        )}
                      </span>
                      {alloc.project && (
                        <span className='text-neutral-600 dark:text-neutral-400 ml-2'>
                          → {alloc.project.name}
                          {alloc.project.language_entity &&
                            ` (${alloc.project.language_entity.name})`}
                        </span>
                      )}
                      {alloc.operation && (
                        <span className='text-neutral-600 dark:text-neutral-400 ml-2'>
                          → {alloc.operation.name}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100 pt-1 border-t border-neutral-200 dark:border-neutral-800 mt-1'>
                    Total:{' '}
                    {formatCurrency(totalAllocated, donation.currency_code)}
                  </div>
                </>
              ) : (
                <span className='text-sm text-neutral-500 dark:text-neutral-400'>
                  No allocations
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
