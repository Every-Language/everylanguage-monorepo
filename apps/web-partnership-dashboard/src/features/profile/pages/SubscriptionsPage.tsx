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
import { SubscriptionCard } from '../components/SubscriptionCard';
import { CancelSubscriptionModal } from '../components/CancelSubscriptionModal';
import { useToast } from '@/shared/theme/hooks/useToast';
import { supabase } from '@/shared/services/supabase';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    React.useState<Subscription | null>(null);

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

  const handleCancelClick = async (subscriptionId: string) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      setSelectedSubscription(subscription);
      setCancelModalOpen(true);
    }
  };

  const handleCancelConfirm = async () => {
    if (!selectedSubscription) return;
    await cancelMutation.mutateAsync(selectedSubscription.id);
  };

  const handleManagePaymentMethod = async (customerId: string) => {
    await customerPortalMutation.mutateAsync(customerId);
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
        <div className='mx-auto max-w-4xl p-4 sm:p-6 lg:p-8'>
          <TableRowSkeleton count={3} columns={1} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
        <div className='mx-auto max-w-4xl p-4 sm:p-6 lg:p-8'>
          <Card className='border border-red-200 dark:border-red-800'>
            <CardContent className='py-12 text-center'>
              <p className='text-red-600 dark:text-red-400'>
                Failed to load subscriptions. Please try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-4xl p-4 sm:p-6 lg:p-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
            My Subscriptions
          </h1>
          <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
            Manage your recurring donations and payment methods
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
          <div className='space-y-4'>
            {subscriptions.map((subscription, index) => {
              const subscriptionQuery = subscriptionQueries[index];
              const subscriptionWithDonations = subscriptionQuery?.data;

              return (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  donations={subscriptionWithDonations?.donations || []}
                  onCancel={handleCancelClick}
                  onManagePaymentMethod={handleManagePaymentMethod}
                  isCanceling={
                    cancelMutation.isPending &&
                    selectedSubscription?.id === subscription.id
                  }
                  isManagingPayment={
                    customerPortalMutation.isPending &&
                    customerPortalMutation.variables ===
                      subscription.stripe_customer_id
                  }
                />
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
    </div>
  );
};

export default SubscriptionsPage;
