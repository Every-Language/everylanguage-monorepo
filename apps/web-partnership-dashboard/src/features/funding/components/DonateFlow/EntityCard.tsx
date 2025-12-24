import React from 'react';
import { Plus } from 'lucide-react';
import type { EntityForDonation } from '../../api/fundingApi';

interface EntityCardProps {
  entity: EntityForDonation;
  onClick: () => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity, onClick }) => {
  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <button
      onClick={onClick}
      className='w-full flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors text-left'
      aria-label={`Select ${entity.name}`}>
      <div className='flex-1 min-w-0'>
        <div className='font-medium text-neutral-900 dark:text-neutral-100 truncate'>
          {entity.name}
        </div>
        <div className='text-sm text-neutral-600 dark:text-neutral-400 mt-0.5'>
          {formatCurrency(entity.budgetCents)} remaining
        </div>
      </div>
      <Plus className='h-4 w-4 text-neutral-400 ml-4 shrink-0' />
    </button>
  );
};

export default EntityCard;
