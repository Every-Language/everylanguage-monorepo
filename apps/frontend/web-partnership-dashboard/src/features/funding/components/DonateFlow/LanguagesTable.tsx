import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { LanguageSelectionContext } from './LanguageSelectionProvider';

interface LanguagesTableProps {
  flow?: any; // Optional flow object for accessing context (not used currently)
}

export const LanguagesTable: React.FC<LanguagesTableProps> = () => {
  const languageContext = React.useContext(LanguageSelectionContext);

  // If no context, this component can't function
  if (!languageContext) {
    return (
      <div className='text-sm text-neutral-500'>
        Language selection not available
      </div>
    );
  }

  const { selectedIds, addLanguage: onAdd, rows, loading } = languageContext;

  if (loading) {
    return <div className='text-sm text-neutral-500'>Loading languages...</div>;
  }

  return (
    <div className='space-y-2'>
      <div className='text-sm font-medium mb-3'>Available Languages</div>
      <div className='max-h-[500px] overflow-y-auto space-y-2'>
        {rows.map(row => {
          const isSelected = selectedIds.includes(row.id);
          return (
            <div
              key={row.id}
              className='flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 transition-colors'
            >
              <div className='flex-1 min-w-0'>
                <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                  {row.language_name ?? row.language_entity_id ?? 'Unknown'}
                </div>
                {row.estimated_budget_cents && (
                  <div className='text-xs text-neutral-500'>
                    Est. ${(row.estimated_budget_cents / 100).toLocaleString()}
                  </div>
                )}
              </div>
              <Button
                size='sm'
                variant={isSelected ? 'ghost' : 'outline'}
                onClick={() => onAdd(row.id)}
                disabled={isSelected}
                className='ml-3'
              >
                {isSelected ? (
                  <span className='text-xs'>Added</span>
                ) : (
                  <Plus className='h-4 w-4' />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LanguagesTable;
