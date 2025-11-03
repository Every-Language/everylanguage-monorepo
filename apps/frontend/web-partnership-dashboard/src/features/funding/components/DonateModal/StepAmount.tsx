import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select, SelectItem } from '@/shared/components/ui/Select';
import { Lock, Heart } from 'lucide-react';

// Give once amounts
const SUGGESTED_USD_ONCE = [150000, 70000, 40000, 15000, 7500, 3500];
const SUGGESTED_AUD_ONCE = [150000, 70000, 40000, 15000, 7500, 3500];

// Monthly amounts (~30% of give once, rounded)
const SUGGESTED_USD_MONTHLY = [45000, 21000, 12000, 4500, 2300, 1100];
const SUGGESTED_AUD_MONTHLY = [45000, 21000, 12000, 4500, 2300, 1100];

export const StepAmount: React.FC<{ flow: any }> = ({ flow }) => {
  const [cadence, setCadence] = React.useState<'once' | 'monthly'>('once'); // Default to 'once'
  const [currency, setCurrency] = React.useState<'USD' | 'AUD'>('AUD');
  const [amount, setAmount] = React.useState<number>(7500);
  const [cover, setCover] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Get suggestions based on cadence and currency
  const suggestions =
    cadence === 'once'
      ? currency === 'USD'
        ? SUGGESTED_USD_ONCE
        : SUGGESTED_AUD_ONCE
      : currency === 'USD'
        ? SUGGESTED_USD_MONTHLY
        : SUGGESTED_AUD_MONTHLY;
  // Update amount when switching cadence to use suggested amount from new list
  // We use a ref to track previous cadence to avoid infinite loops
  const prevCadenceRef = React.useRef(cadence);
  const prevCurrencyRef = React.useRef(currency);

  React.useEffect(() => {
    // Only adjust amount if cadence or currency actually changed
    if (
      prevCadenceRef.current !== cadence ||
      prevCurrencyRef.current !== currency
    ) {
      const newSuggestions =
        cadence === 'once'
          ? currency === 'USD'
            ? SUGGESTED_USD_ONCE
            : SUGGESTED_AUD_ONCE
          : currency === 'USD'
            ? SUGGESTED_USD_MONTHLY
            : SUGGESTED_AUD_MONTHLY;

      // If current amount is not in new suggestions, reset to default
      if (!newSuggestions.includes(amount)) {
        setAmount(newSuggestions[4]); // Default to 5th option (e.g., $75 once or $23 monthly)
      }

      prevCadenceRef.current = cadence;
      prevCurrencyRef.current = currency;
    }
  }, [cadence, currency, amount]);

  React.useEffect(() => {
    flow.setAmount({
      cadence,
      amount_cents: amount,
      currency,
      coverFees: cover,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadence, amount, cover, currency]);
  const min = 50;
  const onDonate = () => {
    if (!amount || amount < min) {
      setError(`Minimum charge is ${(min / 100).toFixed(2)} ${currency}.`);
      return;
    }
    setError(null);
    flow.next();
  };
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 text-neutral-700 dark:text-neutral-300'>
        <Lock className='h-4 w-4' />
        <span className='font-medium'>Secure donation</span>
      </div>
      <div className='flex gap-2'>
        <Button
          variant={cadence === 'once' ? 'outline' : 'ghost'}
          onClick={() => setCadence('once')}
        >
          Give once
        </Button>
        <Button
          variant={cadence === 'monthly' ? 'primary' : 'ghost'}
          onClick={() => setCadence('monthly')}
        >
          <Heart className='h-4 w-4 mr-1' /> Monthly
        </Button>
      </div>
      <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
        {suggestions.map(v => (
          <Button
            key={v}
            variant={amount === v ? 'primary' : 'outline'}
            onClick={() => setAmount(v)}
          >
            ${(v / 100).toLocaleString()}
          </Button>
        ))}
      </div>
      <div className='flex items-center gap-2'>
        <span>$</span>
        <Input
          value={(amount / 100).toString()}
          onChange={e =>
            setAmount(
              Math.round((parseFloat(e.target.value || '0') || 0) * 100)
            )
          }
          className='w-28'
        />
        <Select
          value={currency}
          onValueChange={v => setCurrency(v as 'USD' | 'AUD')}
        >
          <SelectItem value='AUD'>AUD</SelectItem>
          <SelectItem value='USD'>USD</SelectItem>
        </Select>
      </div>
      {error && <div className='text-sm text-error-600'>{error}</div>}
      <div>
        <button className='text-sm underline text-neutral-600 dark:text-neutral-400'>
          Add comment
        </button>
      </div>
      <div className='pt-2'>
        <Button className='w-full' onClick={onDonate}>
          Donate
        </Button>
      </div>
    </div>
  );
};

export default StepAmount;
