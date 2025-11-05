import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { StepActionsContext } from './StepActionsContext';
import { createDonationCheckout } from '../../api/fundingApi';
import { applyFeeCover } from '../../utils/calc';
import { useAuth } from '@/features/auth';

interface StepConversionProps {
  flow: any;
  oneTimeAmount: number;
  currency: string;
}

const CONVERSION_OPTION_1_PERCENT = 0.3; // 30% of one-time
const CONVERSION_OPTION_2_PERCENT = 0.5; // 50% of one-time

export const StepConversion: React.FC<StepConversionProps> = ({
  flow,
  oneTimeAmount,
  currency,
}) => {
  const { setCheckoutPromise } = React.useContext(StepActionsContext);
  const { user } = useAuth();

  // Calculate monthly conversion amounts (rounded to nearest dollar)
  const option1Monthly =
    Math.round((oneTimeAmount * CONVERSION_OPTION_1_PERCENT) / 100) * 100;
  const option2Monthly =
    Math.round((oneTimeAmount * CONVERSION_OPTION_2_PERCENT) / 100) * 100;

  const handleConversion = (monthlyAmount: number | null) => {
    if (monthlyAmount) {
      // User chose monthly - update amount to monthly cadence
      flow.setAmount({
        ...flow.state.amount,
        cadence: 'monthly',
        amount_cents: monthlyAmount,
      });
    }
    // Otherwise keep one-time amount as is

    // Pre-fetch checkout with the final amount and cadence
    const finalCadence = monthlyAmount ? 'monthly' : 'once';
    const finalAmountCents = monthlyAmount || oneTimeAmount;
    const coverFees = flow.state.amount?.coverFees ?? true;
    const totalCents = coverFees
      ? applyFeeCover(finalAmountCents)
      : finalAmountCents;

    const donor = flow.state.donor;
    const meta = (user?.user_metadata ?? {}) as {
      first_name?: string;
      last_name?: string;
    };
    const donorFirst =
      donor?.firstName ??
      meta.first_name ??
      user?.email?.split('@')[0] ??
      'Donor';
    const donorLast = donor?.lastName ?? meta.last_name ?? 'Supporter';
    const donorEmail = donor?.email ?? user?.email ?? '';
    const donorPhone = donor?.phone;

    // Start checkout creation in background
    const checkoutPromise = createDonationCheckout({
      donor: {
        firstName: donorFirst,
        lastName: donorLast,
        email: donorEmail,
        phone: donorPhone,
      },
      amountCents: totalCents,
      cadence: finalCadence,
      mode: 'card', // Operational costs always use card payment
      currency: currency as 'USD' | 'AUD',
    });

    // Store promise so StepPayment can use it
    setCheckoutPromise(checkoutPromise);

    flow.next();
  };

  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-600 dark:text-neutral-400'>
        Will you convert your ${(oneTimeAmount / 100).toLocaleString()}{' '}
        {currency} contribution into a monthly donation?
      </div>
      <div className='text-sm text-neutral-700 dark:text-neutral-300'>
        Your ongoing support can help us focus better on our work.
      </div>

      <div className='space-y-3 pt-2'>
        <Button
          variant='primary'
          className='w-full h-16 text-base'
          onClick={() => handleConversion(option1Monthly)}
        >
          <div className='flex flex-col items-center'>
            <span className='font-semibold'>
              ${(option1Monthly / 100).toLocaleString()} / month
            </span>
            <span className='text-xs opacity-80'>
              Support our mission monthly
            </span>
          </div>
        </Button>

        <Button
          variant='primary'
          className='w-full h-16 text-base'
          onClick={() => handleConversion(option2Monthly)}
        >
          <div className='flex flex-col items-center'>
            <span className='font-semibold'>
              ${(option2Monthly / 100).toLocaleString()} / month
            </span>
            <span className='text-xs opacity-80'>
              Make an even bigger impact
            </span>
          </div>
        </Button>

        <Button
          variant='ghost'
          className='w-full'
          onClick={() => handleConversion(null)}
        >
          No, keep my ${(oneTimeAmount / 100).toLocaleString()} one-time gift
        </Button>
      </div>
    </div>
  );
};

export default StepConversion;
