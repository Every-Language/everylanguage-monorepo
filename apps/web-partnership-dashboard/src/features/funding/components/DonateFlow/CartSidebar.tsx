import React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import type { SelectedEntity } from '../../state/types';

interface CartSidebarProps {
  selectedEntities: SelectedEntity[];
  cartTotalCents: number;
  isEditable: boolean;
  onTotalChange?: (totalCents: number) => void;
  onRemove?: (
    entityId: string,
    entityType: 'language' | 'region' | 'operation'
  ) => void;
  entityTypeLabel: string; // 'language', 'region', or 'operation'
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  selectedEntities,
  cartTotalCents,
  isEditable,
  onTotalChange,
  onRemove,
  entityTypeLabel,
}) => {
  const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const subtotal = selectedEntities.reduce((sum, e) => sum + e.budgetCents, 0);

  const handleTotalChange = (value: string) => {
    if (!onTotalChange) return;
    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (cleaned === '' || cleaned === '.') {
      onTotalChange(0);
      return;
    }
    const dollars = parseFloat(cleaned);
    if (!isNaN(dollars) && dollars >= 0) {
      onTotalChange(Math.round(dollars * 100));
    }
  };

  return (
    <div className='space-y-4'>
      <div className='text-base font-semibold text-neutral-900 dark:text-neutral-100'>
        Your selection
      </div>

      {selectedEntities.length === 0 ? (
        <div className='text-sm text-neutral-500 py-8 text-center'>
          No {entityTypeLabel}s selected yet.
        </div>
      ) : (
        <>
          {/* Selected Entities List */}
          <div className='space-y-2 max-h-[300px] overflow-y-auto'>
            {selectedEntities.map(entity => (
              <div
                key={`${entity.type}-${entity.id}`}
                className='flex items-start justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700'
              >
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    {entity.name}
                  </div>
                  <div className='text-xs text-neutral-500 mt-0.5'>
                    ${formatCurrency(entity.budgetCents)}
                  </div>
                </div>
                {onRemove && (
                  <button
                    onClick={() => onRemove(entity.id, entity.type)}
                    className='ml-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors'
                    aria-label={`Remove ${entity.name}`}
                  >
                    <X className='h-4 w-4 text-neutral-500' />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className='border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-3'>
            {/* Subtotal */}
            <div className='flex items-center justify-between text-sm'>
              <span className='text-neutral-600 dark:text-neutral-400'>
                Subtotal
              </span>
              <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                ${formatCurrency(subtotal)}
              </span>
            </div>

            {/* Editable Total */}
            {isEditable && onTotalChange ? (
              <div className='space-y-2'>
                <label className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                  Total
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500'>
                    $
                  </span>
                  <Input
                    type='text'
                    value={formatCurrency(cartTotalCents)}
                    onChange={e => handleTotalChange(e.target.value)}
                    className='pl-7'
                    placeholder='0.00'
                  />
                </div>
              </div>
            ) : (
              <div className='flex items-center justify-between text-lg font-semibold pt-3 border-t border-neutral-200 dark:border-neutral-700'>
                <span className='text-neutral-900 dark:text-neutral-100'>
                  Total
                </span>
                <span className='text-neutral-900 dark:text-neutral-100'>
                  ${formatCurrency(cartTotalCents)}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CartSidebar;
