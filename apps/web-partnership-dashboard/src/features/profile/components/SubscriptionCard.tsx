import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import type { Subscription } from '../api/subscriptionsApi';
import { SubscriptionPaymentHistory } from './SubscriptionPaymentHistory';

interface SubscriptionCardProps {
  subscription: Subscription;
  donations: Array<{
    id: string;
    amount_cents: number;
    status: string;
    created_at: string;
    completed_at: string | null;
  }>;
  onCancel: (subscriptionId: string) => Promise<void>;
  onManagePaymentMethod: (customerId: string) => Promise<void>;
  isCanceling?: boolean;
  isManagingPayment?: boolean;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  donations,
  onCancel,
  onManagePaymentMethod,
  isCanceling = false,
  isManagingPayment = false,
}) => {
  const [showPaymentHistory, setShowPaymentHistory] = React.useState(false);

  const getIntentLabel = (): string => {
    if (subscription.intent_language) {
      return subscription.intent_language.name;
    }
    if (subscription.intent_region) {
      return subscription.intent_region.name;
    }
    if (subscription.intent_operation) {
      return subscription.intent_operation.name;
    }
    return 'Unrestricted';
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
        className={`text-xs px-2 py-1 rounded font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getNextBillingDate = (): string | null => {
    if (!subscription.current_period_end) return null;
    return formatDate(subscription.current_period_end);
  };

  const isActive =
    subscription.status === 'active' || subscription.status === 'trialing';

  return (
    <Card className='border border-neutral-200 dark:border-neutral-800'>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <CardTitle className='text-lg mb-2'>
              {formatCurrency(subscription.amount_cents)}/
              {subscription.interval_type}
            </CardTitle>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Supporting: {getIntentLabel()}
            </div>
          </div>
          <div>{getStatusBadge(subscription.status)}</div>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Subscription Details */}
        <div className='space-y-2 text-sm'>
          <div className='flex justify-between'>
            <span className='text-neutral-500 dark:text-neutral-400'>
              Started:
            </span>
            <span className='text-neutral-900 dark:text-neutral-100'>
              {formatDate(subscription.created_at)}
            </span>
          </div>
          {subscription.current_period_end && isActive && (
            <div className='flex justify-between'>
              <span className='text-neutral-500 dark:text-neutral-400'>
                Next billing:
              </span>
              <span className='text-neutral-900 dark:text-neutral-100'>
                {getNextBillingDate()}
              </span>
            </div>
          )}
          {subscription.canceled_at && (
            <div className='flex justify-between'>
              <span className='text-neutral-500 dark:text-neutral-400'>
                Canceled:
              </span>
              <span className='text-neutral-900 dark:text-neutral-100'>
                {formatDate(subscription.canceled_at)}
              </span>
            </div>
          )}
          {donations.length > 0 && (
            <div className='flex justify-between'>
              <span className='text-neutral-500 dark:text-neutral-400'>
                Total payments:
              </span>
              <span className='text-neutral-900 dark:text-neutral-100'>
                {donations.length}{' '}
                {donations.length === 1 ? 'payment' : 'payments'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {isActive && (
          <div className='flex flex-wrap gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowPaymentHistory(!showPaymentHistory)}>
              {showPaymentHistory ? 'Hide' : 'Show'} Payment History
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                onManagePaymentMethod(subscription.stripe_customer_id)
              }
              loading={isManagingPayment}>
              Manage Payment Method
            </Button>
            <Button
              variant='danger-outline'
              size='sm'
              onClick={() => onCancel(subscription.id)}
              loading={isCanceling}>
              Cancel Subscription
            </Button>
          </div>
        )}

        {/* Payment History */}
        {showPaymentHistory && (
          <div className='pt-4 border-t border-neutral-200 dark:border-neutral-800'>
            <SubscriptionPaymentHistory
              donations={donations}
              subscriptionId={subscription.id}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
