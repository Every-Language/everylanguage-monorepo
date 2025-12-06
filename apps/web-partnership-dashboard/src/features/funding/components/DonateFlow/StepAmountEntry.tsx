import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Heart } from 'lucide-react';
import type { DonateFlow } from '../../hooks/useDonateFlow';

// Default suggested amounts (in cents) - used when no entity is selected
const SUGGESTED_ONCE = [150000, 70000, 40000, 15000, 7500, 3500];
const SUGGESTED_MONTHLY = [45000, 21000, 12000, 4500, 2300, 1100];

/**
 * Calculate suggested amounts based on entity budget
 * @param budgetCents - The entity's remaining budget in cents
 * @param isRecurring - Whether this is a monthly donation
 * @returns Array of 6 suggested amounts in cents
 */
const calculateSuggestedAmounts = (
  budgetCents: number,
  isRecurring: boolean
): number[] => {
  const min = 50; // Minimum $0.50

  if (isRecurring) {
    // Monthly: Top option = budget / 12 (fund whole entity in a year)
    // Then calculate remaining 5 options proportionally
    const monthlyBudget = budgetCents / 12;
    const multipliers = [1, 0.5, 0.3, 0.15, 0.075, 0.035];
    return multipliers.map(mult => {
      const amount = monthlyBudget * mult;
      // Round to nearest $1 (100 cents)
      return Math.max(min, Math.round(amount / 100) * 100);
    });
  } else {
    // One-time: Max = full entity budget, then calculate proportionally
    const multipliers = [1, 0.5, 0.3, 0.15, 0.075, 0.035];
    return multipliers.map(mult => {
      const amount = budgetCents * mult;
      // Round to nearest $5 (500 cents)
      return Math.max(min, Math.round(amount / 500) * 500);
    });
  }
};

export const StepAmountEntry: React.FC<{ flow: DonateFlow }> = ({ flow }) => {
  const [isRecurring, setIsRecurring] = React.useState(false);
  const selectedEntity = flow.state.selectedEntity;
  const intent = flow.state.intent;

  // Calculate suggested amounts based on entity or use defaults
  const suggestions = React.useMemo(() => {
    if (selectedEntity?.budgetCents) {
      return calculateSuggestedAmounts(selectedEntity.budgetCents, isRecurring);
    }
    return isRecurring ? SUGGESTED_MONTHLY : SUGGESTED_ONCE;
  }, [selectedEntity?.budgetCents, isRecurring]);

  // Calculate default amount based on entity or use default suggestions
  const getDefaultAmount = React.useCallback(() => {
    if (selectedEntity?.budgetCents) {
      return isRecurring
        ? Math.round(selectedEntity.budgetCents / 12)
        : selectedEntity.budgetCents;
    }
    return isRecurring ? SUGGESTED_MONTHLY[4] : SUGGESTED_ONCE[4]; // Default to 5th option
  }, [selectedEntity?.budgetCents, isRecurring]);

  const [amount, setAmount] = React.useState<number>(getDefaultAmount());
  const [error, setError] = React.useState<string | null>(null);

  const min = 50;

  // Update amount when switching recurring or when entity changes
  React.useEffect(() => {
    setAmount(getDefaultAmount());
  }, [getDefaultAmount]);

  const handleContinue = () => {
    if (!amount || amount < min) {
      setError(`Minimum donation is $${(min / 100).toFixed(2)}`);
      return;
    }

    setError(null);

    // Set amount in flow
    flow.setAmount({
      isRecurring,
      amountCents: amount,
    });

    // Navigate to next step
    flow.next();
  };

  if (!intent) {
    return null;
  }

  // For unrestricted donations, show simpler version without entity info
  if (intent.type === 'unrestricted') {
    return (
      <div className='space-y-4'>
        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
          Enter donation amount
        </div>

        {/* One-time vs Monthly toggle */}
        <div className='flex gap-2'>
          <Button
            variant={!isRecurring ? 'outline' : 'ghost'}
            onClick={() => setIsRecurring(false)}
            className='flex-1'>
            Give once
          </Button>
          <Button
            variant={isRecurring ? 'primary' : 'ghost'}
            onClick={() => setIsRecurring(true)}
            className='flex-1'>
            <Heart className='h-4 w-4 mr-1' /> Monthly
          </Button>
        </div>

        {/* Suggested amounts */}
        <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
          {suggestions.map(v => (
            <Button
              key={v}
              variant={amount === v ? 'primary' : 'outline'}
              onClick={() => setAmount(v)}
              size='sm'>
              ${(v / 100).toLocaleString()}
            </Button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className='flex items-center gap-2'>
          <span className='text-neutral-700 dark:text-neutral-300'>$</span>
          <Input
            type='number'
            value={(amount / 100).toString()}
            onChange={e =>
              setAmount(
                Math.round((parseFloat(e.target.value || '0') || 0) * 100)
              )
            }
            className='w-32'
            min={min / 100}
            step='0.01'
          />
          <span className='text-sm text-neutral-600 dark:text-neutral-400'>
            USD
          </span>
        </div>

        {error && (
          <div className='text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-3 rounded-lg'>
            {error}
          </div>
        )}

        <div className='pt-2'>
          <Button
            className='w-full'
            onClick={handleContinue}
            disabled={!!error}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Should have selectedEntity for language/region/operation
  if (!selectedEntity) {
    return (
      <div className='text-sm text-neutral-500 py-8 text-center'>
        No entity selected. Please go back and select one.
      </div>
    );
  }

  const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className='space-y-4'>
      {/* Entity Info */}
      <div className='p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800'>
        <div className='text-sm text-primary-700 dark:text-primary-300 mb-1'>
          You're donating to
        </div>
        <div className='text-lg font-semibold text-primary-900 dark:text-primary-100'>
          {selectedEntity.name}
        </div>
        <div className='text-sm text-primary-600 dark:text-primary-400 mt-1'>
          ${formatCurrency(selectedEntity.budgetCents)} remaining budget
        </div>
      </div>

      {/* One-time vs Monthly toggle */}
      <div className='flex gap-2'>
        <Button
          variant={!isRecurring ? 'outline' : 'ghost'}
          onClick={() => setIsRecurring(false)}
          className='flex-1'>
          Give once
        </Button>
        <Button
          variant={isRecurring ? 'primary' : 'ghost'}
          onClick={() => setIsRecurring(true)}
          className='flex-1'>
          <Heart className='h-4 w-4 mr-1' /> Monthly
        </Button>
      </div>

      {/* Suggested amounts */}
      <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
        {suggestions.map(v => (
          <Button
            key={v}
            variant={amount === v ? 'primary' : 'outline'}
            onClick={() => setAmount(v)}
            size='sm'>
            ${(v / 100).toLocaleString()}
          </Button>
        ))}
      </div>

      {/* Custom amount input */}
      <div className='flex items-center gap-2'>
        <span className='text-neutral-700 dark:text-neutral-300'>$</span>
        <Input
          type='number'
          value={(amount / 100).toString()}
          onChange={e =>
            setAmount(
              Math.round((parseFloat(e.target.value || '0') || 0) * 100)
            )
          }
          className='w-32'
          min={min / 100}
          step='0.01'
        />
        <span className='text-sm text-neutral-600 dark:text-neutral-400'>
          USD
        </span>
      </div>

      {/* Note about exceeding budget */}
      {amount > selectedEntity.budgetCents && (
        <div className='p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
          <p className='text-sm text-blue-800 dark:text-blue-200'>
            You're donating more than the remaining budget. The excess will
            contribute to the overall funding needs.
          </p>
        </div>
      )}

      {error && (
        <div className='text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-3 rounded-lg'>
          {error}
        </div>
      )}

      <div className='pt-2'>
        <Button className='w-full' onClick={handleContinue} disabled={!!error}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StepAmountEntry;
