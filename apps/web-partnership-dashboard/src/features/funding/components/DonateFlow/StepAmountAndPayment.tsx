import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Lock, Heart } from 'lucide-react';
import { PaymentSkeleton } from './PaymentSkeleton';
import type { DonateFlow } from '../../hooks/useDonateFlow';

const StepPayment = React.lazy(() => import('./StepPayment'));

// Give once amounts (in cents)
const SUGGESTED_ONCE = [150000, 70000, 40000, 15000, 7500, 3500];
// Monthly amounts (~30% of give once, rounded)
const SUGGESTED_MONTHLY = [45000, 21000, 12000, 4500, 2300, 1100];

export const StepAmountAndPayment: React.FC<{ flow: DonateFlow }> = ({
  flow,
}) => {
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [amount, setAmount] = React.useState<number>(7500);
  const [showPayment, setShowPayment] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const suggestions = isRecurring ? SUGGESTED_MONTHLY : SUGGESTED_ONCE;

  // Update amount when switching recurring to use suggested amount from new list
  const prevIsRecurringRef = React.useRef(isRecurring);

  React.useEffect(() => {
    if (prevIsRecurringRef.current !== isRecurring) {
      const newSuggestions = isRecurring ? SUGGESTED_MONTHLY : SUGGESTED_ONCE;

      // If current amount is not in new suggestions, reset to default
      if (!newSuggestions.includes(amount)) {
        setAmount(newSuggestions[4]); // Default to 5th option (e.g., $75 once or $23 monthly)
      }

      prevIsRecurringRef.current = isRecurring;
    }
  }, [isRecurring, amount]);

  const min = 50;

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

    // Show payment form
    setShowPayment(true);
  };

  if (showPayment) {
    return (
      <React.Suspense fallback={<PaymentSkeleton />}>
        <StepPayment flow={flow} />
      </React.Suspense>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 text-neutral-700 dark:text-neutral-300'>
        <Lock className='h-4 w-4' />
        <span className='font-medium'>Secure donation</span>
      </div>

      {/* One-time vs Monthly toggle */}
      <div className='flex gap-2'>
        <Button
          variant={!isRecurring ? 'outline' : 'ghost'}
          onClick={() => setIsRecurring(false)}
          className='flex-1'
        >
          Give once
        </Button>
        <Button
          variant={isRecurring ? 'primary' : 'ghost'}
          onClick={() => setIsRecurring(true)}
          className='flex-1'
        >
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
            size='sm'
          >
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

      {error && <div className='text-sm text-error-600'>{error}</div>}

      <div className='pt-2'>
        <Button className='w-full' onClick={handleContinue}>
          Continue to payment
        </Button>
      </div>
    </div>
  );
};

export default StepAmountAndPayment;
