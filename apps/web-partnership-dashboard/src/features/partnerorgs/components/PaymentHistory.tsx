import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';

interface Contribution {
  id: string;
  amount_cents: number;
  currency_code: string;
  occurred_at: string;
  kind: string;
  stripe_payment_intent_id?: string | null;
  stripe_invoice_id?: string | null;
  subscription_id?: string | null;
}

interface Subscription {
  id: string;
  amount_cents: number;
  currency_code: string;
  status: string;
  started_at: string;
  cancelled_at?: string | null;
  subscription_type: string;
}

interface PaymentHistoryProps {
  contributions: Contribution[];
  subscriptions?: Subscription[];
  projectName?: string;
}

const formatCurrency = (cents: number, currencyCode: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getKindLabel = (kind: string) => {
  switch (kind) {
    case 'initial_deposit':
      return 'Initial Deposit';
    case 'manual_top_up':
      return 'Manual Top-Up';
    case 'subscription':
      return 'Subscription Payment';
    case 'subscription_top_up':
      return 'Subscription Top-Up';
    case 'one_time':
      return 'One-Time Donation';
    default:
      return kind;
  }
};

const getStatusBadge = (status: string) => {
  const colors = {
    active:
      'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-300',
    paused:
      'bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300',
    cancelled:
      'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
    expired:
      'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
        colors[status as keyof typeof colors] || colors.cancelled
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  contributions,
  subscriptions = [],
  projectName,
}) => {
  // Sort contributions by date (most recent first)
  const sortedContributions = [...contributions].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  return (
    <div className='space-y-6'>
      {/* Active Subscriptions */}
      {subscriptions.length > 0 && (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle className='text-lg'>Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {subscriptions.map(sub => (
                <div
                  key={sub.id}
                  className='flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg'
                >
                  <div>
                    <div className='font-medium'>
                      {formatCurrency(sub.amount_cents, sub.currency_code)}
                      /month
                    </div>
                    <div className='text-sm text-neutral-500'>
                      Started {formatDate(sub.started_at)}
                    </div>
                  </div>
                  <div className='text-right'>
                    {getStatusBadge(sub.status)}
                    {sub.cancelled_at && (
                      <div className='text-xs text-neutral-500 mt-1'>
                        Cancelled {formatDate(sub.cancelled_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contribution History */}
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <CardTitle className='text-lg'>
            Payment History
            {projectName && (
              <span className='text-sm font-normal text-neutral-500 ml-2'>
                for {projectName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedContributions.length === 0 ? (
            <div className='text-center py-8 text-neutral-500'>
              No payment history available
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800'>
                    <th className='py-2'>Date</th>
                    <th className='py-2'>Type</th>
                    <th className='py-2 text-right'>Amount</th>
                    <th className='py-2 text-right'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {sortedContributions.map(contribution => (
                    <tr key={contribution.id}>
                      <td className='py-3'>
                        {formatDate(contribution.occurred_at)}
                      </td>
                      <td className='py-3'>
                        <div>{getKindLabel(contribution.kind)}</div>
                        {contribution.subscription_id && (
                          <div className='text-xs text-neutral-500 mt-1'>
                            Recurring
                          </div>
                        )}
                      </td>
                      <td className='py-3 text-right font-medium'>
                        {formatCurrency(
                          contribution.amount_cents,
                          contribution.currency_code
                        )}
                      </td>
                      <td className='py-3 text-right'>
                        <span className='inline-flex items-center px-2 py-1 rounded-md bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-300 text-xs font-medium'>
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;
