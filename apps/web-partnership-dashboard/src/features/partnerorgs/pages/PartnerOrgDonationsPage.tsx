'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { useAuth } from '@/features/auth';
import { usePartnerOrgDonations } from '../hooks/usePartnerOrgDonations';

const formatCurrency = (cents: number, currencyCode: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const PartnerOrgDonationsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();

  const { data: donations, isLoading } = usePartnerOrgDonations(
    orgId!,
    user?.id ?? null
  );

  if (isLoading) {
    return <div className='text-neutral-500'>Loading donations...</div>;
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
    <div className='space-y-4'>
      {donations.map(donation => {
        const totalAllocated = donation.donation_allocations.reduce(
          (sum, alloc) => sum + alloc.amount_cents,
          0
        );

        return (
          <Card
            key={donation.id}
            className='border border-neutral-200 dark:border-neutral-800'
          >
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle>
                  {formatCurrency(
                    donation.amount_cents,
                    donation.currency_code
                  )}
                </CardTitle>
                <div className='flex items-center gap-2'>
                  {donation.isFromCurrentUser && (
                    <span className='text-xs px-2 py-1 rounded bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'>
                      Your Donation
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-1 rounded capitalize ${
                      donation.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : donation.status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {donation.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Intent */}
              <div>
                <div className='text-xs text-neutral-500 mb-1'>Intent</div>
                <div className='text-sm'>
                  {donation.intent_type === 'language' &&
                  donation.intent_language
                    ? `Language: ${donation.intent_language.name}`
                    : donation.intent_type === 'region' &&
                        donation.intent_region
                      ? `Region: ${donation.intent_region.name}`
                      : donation.intent_type === 'operation' &&
                          donation.intent_operation
                        ? `Operation: ${donation.intent_operation.name}`
                        : 'Unrestricted'}
                </div>
              </div>

              {/* Payment Info */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <div className='text-xs text-neutral-500'>Payment Method</div>
                  <div className='capitalize'>{donation.payment_method}</div>
                </div>
                <div>
                  <div className='text-xs text-neutral-500'>Recurring</div>
                  <div>{donation.is_recurring ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* Date */}
              <div className='text-sm'>
                <div className='text-xs text-neutral-500'>Date</div>
                <div>{formatDate(donation.created_at)}</div>
              </div>

              {/* Allocations */}
              {donation.donation_allocations.length > 0 && (
                <div>
                  <div className='text-xs text-neutral-500 mb-2'>
                    Allocations ({donation.donation_allocations.length})
                  </div>
                  <div className='space-y-2'>
                    {donation.donation_allocations.map(alloc => (
                      <div
                        key={alloc.id}
                        className='p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-sm'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='font-medium'>
                            {formatCurrency(
                              alloc.amount_cents,
                              alloc.currency_code
                            )}
                          </span>
                          <span className='text-xs text-neutral-500'>
                            {alloc.effective_from}
                            {alloc.effective_to
                              ? ` - ${alloc.effective_to}`
                              : ' (ongoing)'}
                          </span>
                        </div>
                        {alloc.project && (
                          <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-1'>
                            Project: {alloc.project.name}
                            {alloc.project.language_entity &&
                              ` (${alloc.project.language_entity.name})`}
                          </div>
                        )}
                        {alloc.operation && (
                          <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-1'>
                            Operation: {alloc.operation.name}
                          </div>
                        )}
                        {alloc.notes && (
                          <div className='text-xs text-neutral-500 mt-1 italic'>
                            {alloc.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className='text-xs text-neutral-500 mt-2'>
                    Total Allocated:{' '}
                    {formatCurrency(totalAllocated, donation.currency_code)} /{' '}
                    {formatCurrency(
                      donation.amount_cents,
                      donation.currency_code
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
