import React from 'react';
import { DataTable } from '@/shared/components/ui/DataTable';
import type { Column } from '@/shared/components/ui/DataTable';
import { Button } from '@/shared/components/ui/Button';
import {
  listAvailableLanguages,
  calculateAdoptionCosts,
} from '../../api/fundingApi';

type Row = {
  id: string;
  language_entity_id: string | null;
  language_name?: string | null;
  estimated_budget_cents: number | null;
  status: string | null;
};

export const StepLanguages: React.FC<{ flow: any }> = ({ flow }) => {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [totals, setTotals] = React.useState({
    upfront: 0,
    monthly: 0,
    months: 12,
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    listAvailableLanguages({ status: 'available', limit: 100 })
      .then(setRows)
      .catch(console.error);
  }, []);

  // Fetch live cost calculation whenever selection changes
  React.useEffect(() => {
    const selectedIds = Object.keys(selected).filter(id => selected[id]);
    if (selectedIds.length === 0) {
      setTotals({ upfront: 0, monthly: 0, months: 12 });
      return;
    }

    setLoading(true);
    calculateAdoptionCosts(selectedIds)
      .then(result => {
        setTotals({
          upfront: result.depositTotalCents,
          monthly: result.monthlyTotalCents,
          months: result.recurringMonths,
        });
      })
      .catch(err => {
        console.error('Failed to calculate costs:', err);
        // Fallback to zero if calculation fails
        setTotals({ upfront: 0, monthly: 0, months: 12 });
      })
      .finally(() => setLoading(false));
  }, [selected]);

  const columns: Column<Row & { selected?: boolean }>[] = [
    {
      key: 'selected',
      header: '',
      render: (_v, r) => (
        <input
          type='checkbox'
          checked={!!selected[r.id]}
          onChange={e => setSelected(s => ({ ...s, [r.id]: e.target.checked }))}
        />
      ),
      width: '8',
    },
    {
      key: 'language_name',
      header: 'Language',
      render: (_v, r) => r.language_name ?? r.language_entity_id ?? '—',
      sortable: true,
    },
    {
      key: 'estimated_budget_cents',
      header: 'Est. budget',
      render: v => (v ? `$${(v / 100).toLocaleString()}` : '—'),
      sortable: true,
    },
  ];

  const selectedRows = rows.filter(r => selected[r.id]);

  const continueNext = () => {
    flow.setAdopt({
      languageIds: selectedRows.map(r => r.id),
      upfront_cents: totals.upfront,
      monthly_cents: totals.monthly,
      months: totals.months,
    });
    flow.next();
  };

  return (
    <div className='space-y-4'>
      <DataTable
        data={rows.map(r => ({ ...r, selected: !!selected[r.id] }))}
        columns={columns}
      />
      <div className='flex items-center justify-between border rounded-lg p-3'>
        <div className='text-sm text-neutral-700 dark:text-neutral-300'>
          {loading ? (
            <span className='text-neutral-500'>Calculating...</span>
          ) : (
            <>
              Upfront today:{' '}
              <span className='font-semibold'>
                ${(totals.upfront / 100).toLocaleString()}
              </span>{' '}
              · Monthly:{' '}
              <span className='font-semibold'>
                ${(totals.monthly / 100).toLocaleString()}
              </span>{' '}
              × {totals.months}
            </>
          )}
        </div>
        <Button onClick={continueNext} disabled={selectedRows.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StepLanguages;
