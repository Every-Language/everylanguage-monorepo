import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import type { EntityForDonation } from '../../api/fundingApi';

interface EntityCardProps {
  entity: EntityForDonation;
  isSelected: boolean;
  onAdd: () => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  isSelected,
  onAdd,
}) => {
  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className='flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors'>
      <div className='flex-1 min-w-0'>
        <div className='font-medium text-neutral-900 dark:text-neutral-100 truncate'>
          {entity.name}
        </div>
        <div className='text-sm text-neutral-600 dark:text-neutral-400 mt-0.5'>
          {formatCurrency(entity.budgetCents)}
        </div>
      </div>
      <Button
        variant='outline'
        size='sm'
        onClick={onAdd}
        disabled={isSelected}
        className='ml-4 shrink-0'
        aria-label={`Add ${entity.name} to cart`}
      >
        <Plus className='h-4 w-4' />
      </Button>
    </div>
  );
};

export default EntityCard;
