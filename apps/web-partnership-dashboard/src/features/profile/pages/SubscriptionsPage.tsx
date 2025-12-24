'use client';

import React from 'react';
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { TableRowSkeleton } from '@/shared/components/ui/Skeletons';
import { useAuth } from '@/features/auth';
import {
  fetchSubscriptions,
  fetchSubscriptionWithDonations,
  cancelSubscription,
  getCustomerPortalUrl,
  type Subscription,
} from '../api/subscriptionsApi';
import { CancelSubscriptionModal } from '../components/CancelSubscriptionModal';
import { useToast } from '@/shared/theme/hooks/useToast';
import { supabase } from '@/shared/services/supabase';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    React.useState<Subscription | null>(null);
  const [expandedSubscriptions, setExpandedSubscriptions] = React.useState<
    Set<string>
  >(new Set());

  // Get user's partner org IDs
  const { data: partnerOrgIds = [] } = useQuery({
    queryKey: ['user-partner-orgs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('partner_org_id')
        .eq('user_id', user.id)
        .not('partner_org_id', 'is', null);

      if (error) {
        console.error('Error fetching partner orgs:', error);
        return [];
      }

      return (data || []).map((row: any) => row.partner_org_id).filter(Boolean);
    },
    enabled: !!user?.id,
  });

  // Fetch subscriptions
  const {
    data: subscriptions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['subscriptions', user?.id, partnerOrgIds],
    queryFn: async () => {
      if (!user?.id) return [];
      return await fetchSubscriptions(user.id, partnerOrgIds);
    },
    enabled: !!user?.id,
  });

  // Fetch donations for each subscription
  const subscriptionQueries = useQueries({
    queries: subscriptions.map(sub => ({
      queryKey: ['subscription-donations', sub.id],
      queryFn: () => fetchSubscriptionWithDonations(sub.id),
      enabled: !!sub.id,
    })),
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      await cancelSubscription(subscriptionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-donations'] });
      setCancelModalOpen(false);
      setSelectedSubscription(null);
      toast({
        title: 'Subscription canceled',
        description: 'Your subscription has been canceled successfully.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to cancel subscription',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  // Get customer portal URL mutation
  const customerPortalMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const returnUrl = `${window.location.origin}/profile/subscriptions`;
      const url = await getCustomerPortalUrl(customerId, returnUrl);
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to open payment settings',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const handleCancelConfirm = async () => {
    if (!selectedSubscription) return;
    await cancelMutation.mutateAsync(selectedSubscription.id);
  };

  const handleManageSubscription = async (customerId: string) => {
    await customerPortalMutation.mutateAsync(customerId);
  };

  const toggleSubscription = (subscriptionId: string) => {
    setExpandedSubscriptions(prev => {
      const next = new Set(prev);
      if (next.has(subscriptionId)) {
        next.delete(subscriptionId);
      } else {
        next.add(subscriptionId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        className:
          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        label: 'Active',
      },
      canceled: {
        className:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
        label: 'Canceled',
      },
      past_due: {
        className:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        label: 'Past Due',
      },
      unpaid: {
        className:
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        label: 'Unpaid',
      },
      incomplete: {
        className:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        label: 'Incomplete',
      },
      trialing: {
        className:
          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        label: 'Trialing',
      },
      paused: {
        className:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
        label: 'Paused',
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.canceled;

    return (
      <span
        className={`text-xs px-2 py-1 rounded capitalize inline-block ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
            My Subscriptions
          </h1>
          <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
            Manage your recurring donations
          </p>
        </div>
        <TableRowSkeleton count={5} columns={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
            My Subscriptions
          </h1>
          <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
            Manage your recurring donations
          </p>
        </div>
        <Card className='border border-red-200 dark:border-red-800'>
          <CardContent className='py-12 text-center'>
            <p className='text-red-600 dark:text-red-400'>
              Failed to load subscriptions. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
          My Subscriptions
        </h1>
        <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
          Manage your recurring donations
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardContent className='py-12 text-center text-neutral-500'>
            <p>You don't have any active subscriptions.</p>
            <Button
              variant='outline'
              className='mt-4'
              onClick={() => router.push('/donate')}>
              Start a Recurring Donation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-0'>
          {/* Table Header */}
          <div className='grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400'>
            <div>Amount</div>
            <div>Interval</div>
            <div>Status</div>
            <div>Next Billing</div>
            <div>Actions</div>
          </div>

          {/* Table Rows */}
          {subscriptions.map((subscription, index) => {
            const subscriptionQuery = subscriptionQueries[index];
            const subscriptionWithDonations = subscriptionQuery?.data;
            const donations = subscriptionWithDonations?.donations || [];
            const isExpanded = expandedSubscriptions.has(subscription.id);
            const isActive =
              subscription.status === 'active' ||
              subscription.status === 'trialing';

            return (
              <React.Fragment key={subscription.id}>
                <div className='grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-4 border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors'>
                  {/* Amount Column */}
                  <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    {formatCurrency(
                      subscription.amount_cents,
                      subscription.currency_code
                    )}
                  </div>

                  {/* Interval Column */}
                  <div className='text-sm text-neutral-900 dark:text-neutral-100 capitalize'>
                    {subscription.interval_type}
                  </div>

                  {/* Status Column */}
                  <div>{getStatusBadge(subscription.status)}</div>

                  {/* Next Billing Column */}
                  <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                    {subscription.current_period_end && isActive
                      ? formatDate(subscription.current_period_end)
                      : subscription.canceled_at
                        ? `Canceled ${formatDate(subscription.canceled_at)}`
                        : 'N/A'}
                  </div>

                  {/* Actions Column */}
                  <div className='flex items-center gap-2'>
                    {donations.length > 0 && (
                      <Button
                        variant='ghost'
                        size='xs'
                        className='h-7 px-2'
                        onClick={() => toggleSubscription(subscription.id)}>
                        {isExpanded ? (
                          <ChevronUp className='h-4 w-4' />
                        ) : (
                          <ChevronDown className='h-4 w-4' />
                        )}
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant='outline'
                        size='xs'
                        className='h-7 px-2 text-xs'
                        onClick={() =>
                          handleManageSubscription(
                            subscription.stripe_customer_id
                          )
                        }
                        loading={
                          customerPortalMutation.isPending &&
                          customerPortalMutation.variables ===
                            subscription.stripe_customer_id
                        }>
                        Manage
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Donations */}
                {isExpanded && donations.length > 0 && (
                  <div className='bg-neutral-50 dark:bg-neutral-900/30 border-b border-neutral-200 dark:border-neutral-800'>
                    <div className='px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                      Payment History ({donations.length}{' '}
                      {donations.length === 1 ? 'payment' : 'payments'})
                    </div>
                    <div className='px-4 py-2 space-y-2'>
                      {donations.map(donation => (
                        <div
                          key={donation.id}
                          className='grid grid-cols-[1fr_1fr_1fr] gap-4 text-sm pl-8'>
                          <div className='text-neutral-700 dark:text-neutral-300'>
                            {formatDate(donation.created_at)}
                          </div>
                          <div className='text-neutral-700 dark:text-neutral-300'>
                            {formatCurrency(
                              donation.amount_cents,
                              subscription.currency_code
                            )}
                          </div>
                          <div>
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <CancelSubscriptionModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        subscription={selectedSubscription}
        onConfirm={handleCancelConfirm}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
};

export default SubscriptionsPage;
