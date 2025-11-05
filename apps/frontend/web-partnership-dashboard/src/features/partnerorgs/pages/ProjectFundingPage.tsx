import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { AnimatedProgress } from '../components/AnimatedProgress';
import { useProjectFunding } from '../hooks/useProjectFunding';

const formatCurrency = (cents: number, currencyCode: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

export const ProjectFundingPage: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();
  const { data, isLoading } = useProjectFunding(projectId || 'all', orgId);

  if (isLoading) {
    return <div className='text-neutral-500'>Loading funding data...</div>;
  }

  if (!data || (data.budgets.length === 0 && !data.financials)) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No budget data available for this project
        </CardContent>
      </Card>
    );
  }

  // For single project view, show detailed budget breakdown
  if (projectId && projectId !== 'all' && 'budgetItems' in data) {
    const currentBudget = data.budgets[0];
    const financials = data.financials;

    return (
      <div className='space-y-6'>
        {/* Financial Overview */}
        {financials && (
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <Card className='border border-neutral-200 dark:border-neutral-800'>
              <CardHeader>
                <CardTitle className='text-sm text-neutral-500'>
                  Total Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold tracking-tight'>
                  {formatCurrency(
                    (financials as any).total_budget_cents || 0,
                    (financials as any).currency_code || 'USD'
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className='border border-neutral-200 dark:border-neutral-800'>
              <CardHeader>
                <CardTitle className='text-sm text-neutral-500'>
                  Actual Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold tracking-tight'>
                  {formatCurrency(
                    (financials as any).total_actual_cost_cents || 0,
                    (financials as any).currency_code || 'USD'
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className='border border-neutral-200 dark:border-neutral-800'>
              <CardHeader>
                <CardTitle className='text-sm text-neutral-500'>
                  Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold tracking-tight'>
                  {formatCurrency(
                    ((financials as any).total_budget_cents || 0) -
                      ((financials as any).total_actual_cost_cents || 0),
                    (financials as any).currency_code || 'USD'
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Budget Progress */}
        {currentBudget && (
          <Card className='border border-neutral-200 dark:border-neutral-800'>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium'>
                      Overall Progress
                    </span>
                    <span className='text-sm text-neutral-500'>
                      {formatCurrency(
                        (financials as any)?.total_actual_cost_cents || 0,
                        (currentBudget as any).currency_code
                      )}{' '}
                      /{' '}
                      {formatCurrency(
                        (currentBudget as any).total_cents,
                        (currentBudget as any).currency_code
                      )}
                    </span>
                  </div>
                  <AnimatedProgress
                    value={(financials as any)?.total_actual_cost_cents || 0}
                    max={currentBudget.total_cents}
                    color='accent'
                  />
                </div>

                {currentBudget.description && (
                  <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                    {currentBudget.description}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Items */}
        {data.budgetItems && data.budgetItems.length > 0 && (
          <Card className='border border-neutral-200 dark:border-neutral-800'>
            <CardHeader>
              <CardTitle>Budget Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto'>
                <table className='min-w-full text-sm'>
                  <thead>
                    <tr className='text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800'>
                      <th className='py-2'>Item</th>
                      <th className='py-2'>Category</th>
                      <th className='py-2 text-right'>Amount</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                    {data.budgetItems.map(item => (
                      <tr key={item.id}>
                        <td className='py-3'>
                          <div className='font-medium'>{item.description}</div>
                          {item.notes && (
                            <div className='text-xs text-neutral-500 mt-1'>
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className='py-3'>
                          <span className='inline-flex items-center px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs'>
                            {item.category}
                          </span>
                        </td>
                        <td className='py-3 text-right font-medium'>
                          {formatCurrency(
                            item.amount_cents,
                            currentBudget?.currency_code || 'USD'
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
  return (
    <div className='space-y-6'>
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <CardTitle>Funding Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-sm text-neutral-600 dark:text-neutral-400 mb-4'>
            Total budgets across {data.budgets.length} project(s)
          </div>

          <div className='space-y-4'>
            {data.budgets.map(budget => {
              const financial = Array.isArray(data.financials)
                ? data.financials.find(f => f.project_id === budget.project_id)
                : null;

              return (
                <div
                  key={budget.id}
                  className='border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0'
                >
                  <div className='flex items-center justify-between mb-2'>
                    <div>
                      <div className='font-semibold'>
                        {budget.name || 'Unnamed Budget'}
                      </div>
                      <div className='text-xs text-neutral-500'>
                        {formatCurrency(
                          financial?.total_actual_cost_cents || 0,
                          budget.currency_code
                        )}{' '}
                        /{' '}
                        {formatCurrency(
                          budget.total_cents,
                          budget.currency_code
                        )}
                      </div>
                    </div>
                  </div>
                  <AnimatedProgress
                    value={financial?.total_actual_cost_cents || 0}
                    max={budget.total_cents}
                    color='accent'
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectFundingPage;
