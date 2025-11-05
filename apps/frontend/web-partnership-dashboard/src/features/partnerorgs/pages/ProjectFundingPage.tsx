import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { AnimatedProgress } from '../components/AnimatedProgress';
import { PaymentHistory } from '../components/PaymentHistory';
import { useProjectFunding } from '../hooks/useProjectFunding';

const formatCurrency = (cents: number, currencyCode: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const ProjectFundingPage: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();
  const { data, isLoading } = useProjectFunding(projectId || 'all', orgId);

  if (isLoading) {
    return <div className='text-neutral-500'>Loading funding data...</div>;
  }

  if (!data) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No funding data available
        </CardContent>
      </Card>
    );
  }

  // For single project view, show detailed balance and history
  if (projectId && projectId !== 'all' && 'balance' in data) {
    const { balance, contributions, costs, subscriptions } = data;

    if (!balance) {
      return (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardContent className='py-12 text-center text-neutral-500'>
            Project balance not found
          </CardContent>
        </Card>
      );
    }

    const balancePercent =
      balance.total_contributions_cents > 0
        ? Math.min(
            (balance.balance_cents / balance.total_contributions_cents) * 100,
            100
          )
        : 0;

    return (
      <div className='space-y-6'>
        {/* Balance Overview */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <Card className='border border-neutral-200 dark:border-neutral-800'>
            <CardHeader>
              <CardTitle className='text-sm text-neutral-500'>
                Total Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight'>
                {formatCurrency(
                  balance.total_contributions_cents,
                  balance.currency_code
                )}
              </div>
              <div className='text-xs text-neutral-500 mt-1'>
                {balance.contribution_count} payment
                {balance.contribution_count !== 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>

          <Card className='border border-neutral-200 dark:border-neutral-800'>
            <CardHeader>
              <CardTitle className='text-sm text-neutral-500'>
                Total Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight'>
                {formatCurrency(
                  balance.total_costs_cents,
                  balance.currency_code
                )}
              </div>
              <div className='text-xs text-neutral-500 mt-1'>
                {balance.cost_count} expense
                {balance.cost_count !== 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border ${
              balance.balance_cents > 0
                ? 'border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/10'
                : balance.balance_cents < 0
                  ? 'border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/10'
                  : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <CardHeader>
              <CardTitle className='text-sm text-neutral-500'>
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold tracking-tight ${
                  balance.balance_cents < 0
                    ? 'text-error-600 dark:text-error-400'
                    : ''
                }`}
              >
                {formatCurrency(balance.balance_cents, balance.currency_code)}
              </div>
              {balance.balance_cents < 0 && (
                <div className='text-xs text-error-600 dark:text-error-400 mt-1'>
                  ⚠️ Negative balance
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Balance Progress Bar */}
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle>Project Balance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm font-medium'>Balance Remaining</span>
                  <span className='text-sm text-neutral-500'>
                    {balancePercent.toFixed(1)}% of contributions
                  </span>
                </div>
                <AnimatedProgress
                  value={balance.balance_cents}
                  max={balance.total_contributions_cents}
                  color={balance.balance_cents > 0 ? 'success' : 'error'}
                />
              </div>

              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <div className='text-neutral-500'>Last Contribution</div>
                  <div className='font-medium'>
                    {formatDate(balance.last_contribution_at)}
                  </div>
                </div>
                <div>
                  <div className='text-neutral-500'>Last Cost</div>
                  <div className='font-medium'>
                    {formatDate(balance.last_cost_at)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History with Subscriptions */}
        <PaymentHistory
          contributions={contributions}
          subscriptions={subscriptions}
          projectName={balance.project_name}
        />

        {/* Cost History */}
        {costs && costs.length > 0 && (
          <Card className='border border-neutral-200 dark:border-neutral-800'>
            <CardHeader>
              <CardTitle className='text-lg'>Cost History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto'>
                <table className='min-w-full text-sm'>
                  <thead>
                    <tr className='text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800'>
                      <th className='py-2'>Date</th>
                      <th className='py-2'>Category</th>
                      <th className='py-2'>Note</th>
                      <th className='py-2 text-right'>Amount</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                    {costs.map(cost => (
                      <tr key={cost.id}>
                        <td className='py-3'>{formatDate(cost.occurred_at)}</td>
                        <td className='py-3'>
                          <span className='inline-flex items-center px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs'>
                            {cost.category}
                          </span>
                        </td>
                        <td className='py-3'>
                          <div className='max-w-xs truncate'>
                            {cost.note || '-'}
                          </div>
                        </td>
                        <td className='py-3 text-right font-medium'>
                          {formatCurrency(
                            cost.amount_cents,
                            cost.currency_code
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // For "all" projects view, show aggregate summary
  if ('balances' in data) {
    const { balances } = data;

    if (!balances || balances.length === 0) {
      return (
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardContent className='py-12 text-center text-neutral-500'>
            No active projects found
          </CardContent>
        </Card>
      );
    }

    return (
      <div className='space-y-6'>
        <Card className='border border-neutral-200 dark:border-neutral-800'>
          <CardHeader>
            <CardTitle>Project Balances Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-neutral-600 dark:text-neutral-400 mb-4'>
              Balances across {balances.length} project
              {balances.length !== 1 ? 's' : ''}
            </div>

            <div className='space-y-4'>
              {balances.map(balance => {
                const balancePercent =
                  balance.total_contributions_cents > 0
                    ? Math.min(
                        (balance.balance_cents /
                          balance.total_contributions_cents) *
                          100,
                        100
                      )
                    : 0;

                return (
                  <div
                    key={balance.project_id}
                    className='border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0'
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <div>
                        <div className='font-semibold'>
                          {balance.project_name}
                        </div>
                        <div className='text-xs text-neutral-500'>
                          {formatCurrency(
                            balance.balance_cents,
                            balance.currency_code
                          )}{' '}
                          remaining /{' '}
                          {formatCurrency(
                            balance.total_contributions_cents,
                            balance.currency_code
                          )}{' '}
                          contributed
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='text-sm font-medium'>
                          {balancePercent.toFixed(0)}%
                        </div>
                        {balance.balance_cents < 0 && (
                          <div className='text-xs text-error-600 dark:text-error-400'>
                            ⚠️ Overspent
                          </div>
                        )}
                      </div>
                    </div>
                    <AnimatedProgress
                      value={balance.balance_cents}
                      max={balance.total_contributions_cents}
                      color={balance.balance_cents > 0 ? 'success' : 'error'}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ProjectFundingPage;
