'use client';

import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { useAuth } from '@/features/auth';
import { getCustomerPortalUrl } from '../api/subscriptionsApi';
import { useToast } from '@/shared/theme/hooks/useToast';
import { supabase } from '@/shared/services/supabase';
import { CreditCard } from 'lucide-react';

export const PaymentMethodsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch customer ID from subscriptions
  const { data: customerId } = useQuery({
    queryKey: ['user-customer-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        console.error('Error fetching customer ID:', error);
        return null;
      }

      return data?.stripe_customer_id ?? null;
    },
    enabled: !!user?.id,
  });

  // Get customer portal URL mutation
  const customerPortalMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const returnUrl = `${window.location.origin}/profile/payment-methods`;
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

  const handleManagePaymentMethods = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Please sign in to manage payment methods.',
        variant: 'destructive',
      });
      return;
    }

    if (!customerId) {
      toast({
        title: 'No payment methods found',
        description:
          'You need to create a subscription first to manage payment methods.',
        variant: 'default',
      });
      return;
    }

    await customerPortalMutation.mutateAsync(customerId);
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
          Payment Methods
        </h1>
        <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
          Manage your payment methods and billing information
        </p>
      </div>

      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12'>
          <div className='text-center space-y-4'>
            <div className='flex justify-center'>
              <CreditCard className='h-12 w-12 text-neutral-400' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2'>
                Manage Payment Methods
              </h3>
              <p className='text-sm text-neutral-500 dark:text-neutral-400 mb-6'>
                Update your payment methods, billing address, and view payment
                history through the secure Stripe customer portal.
              </p>
              <Button
                onClick={handleManagePaymentMethods}
                loading={customerPortalMutation.isPending}>
                Open Payment Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethodsPage;
