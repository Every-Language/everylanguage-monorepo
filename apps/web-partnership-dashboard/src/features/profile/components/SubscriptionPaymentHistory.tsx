import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';

interface Donation {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface SubscriptionPaymentHistoryProps {
  donations: Donation[];
  subscriptionId: string;
}

export const SubscriptionPaymentHistory: React.FC<
  SubscriptionPaymentHistoryProps
> = ({
  donations,
  subscriptionId, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  if (donations.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <CardTitle className='text-lg'>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 text-neutral-500'>
            No payments yet for this subscription
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by date (most recent first)
  const sortedDonations = [...donations].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card className='border border-neutral-200 dark:border-neutral-800'>
      <CardHeader>
        <CardTitle className='text-lg'>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {sortedDonations.map(donation => (
            <div
              key={donation.id}
              className='flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800'>
              <div className='flex-1'>
                <div className='font-medium text-neutral-900 dark:text-neutral-100'>
                  {formatCurrency(donation.amount_cents)}
                </div>
                <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                  {formatDate(donation.created_at)}
                </div>
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
      </CardContent>
    </Card>
  );
};
