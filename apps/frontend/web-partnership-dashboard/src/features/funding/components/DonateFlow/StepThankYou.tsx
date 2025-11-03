import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { useDonateFlow } from '../../hooks/useDonateFlow';

interface StepThankYouProps {
  flow: ReturnType<typeof useDonateFlow>;
  onClose?: () => void;
}

export const StepThankYou: React.FC<StepThankYouProps> = ({
  flow,
  onClose,
}) => {
  const navigate = useNavigate();
  const { state } = flow;

  const intent = state.intent;
  const amount = state.amount;
  const adopt = state.adopt;
  const transactionId = state.transactionId;

  // Calculate display values
  const isMonthly = intent === 'adopt' || amount?.cadence === 'monthly';
  const displayAmount =
    intent === 'ops'
      ? (amount?.amount_cents ?? 0) / 100
      : (adopt?.monthly_cents ?? 0) / 100;
  const currency = amount?.currency ?? 'USD';
  const cadenceSuffix = isMonthly ? '/month' : '';

  const donationType =
    intent === 'ops' ? 'Operational Support' : 'Language Adoption';

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleViewMap = () => {
    if (onClose) onClose();
    navigate('/map');
  };

  const handleGoToDashboard = () => {
    if (onClose) onClose();
    navigate('/dashboard');
  };

  return (
    <div className='space-y-6'>
      {/* Success Icon & Message */}
      <div className='flex flex-col items-center text-center space-y-3'>
        <div className='w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center'>
          <CheckCircle2 className='w-10 h-10 text-success-600 dark:text-success-400' />
        </div>
        <div>
          <h3 className='text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1'>
            Thank you for your donation!
          </h3>
          <p className='text-sm text-neutral-600 dark:text-neutral-400'>
            Your generosity helps bring God's Word to every language.
          </p>
        </div>
      </div>

      {/* Receipt Details */}
      <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 space-y-3 bg-neutral-50 dark:bg-neutral-900/40'>
        <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3'>
          Receipt
        </div>

        <div className='flex justify-between text-sm'>
          <span className='text-neutral-600 dark:text-neutral-400'>Amount</span>
          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
            ${displayAmount.toLocaleString()} {currency}
            {cadenceSuffix}
          </span>
        </div>

        <div className='flex justify-between text-sm'>
          <span className='text-neutral-600 dark:text-neutral-400'>Type</span>
          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
            {donationType}
          </span>
        </div>

        {intent === 'adopt' && adopt && adopt.languageIds.length > 0 && (
          <div className='flex justify-between text-sm'>
            <span className='text-neutral-600 dark:text-neutral-400'>
              Languages
            </span>
            <span className='font-medium text-neutral-900 dark:text-neutral-100'>
              {adopt.languageIds.length} selected
            </span>
          </div>
        )}

        <div className='flex justify-between text-sm'>
          <span className='text-neutral-600 dark:text-neutral-400'>Date</span>
          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
            {currentDate}
          </span>
        </div>

        {transactionId && (
          <div className='flex justify-between text-sm'>
            <span className='text-neutral-600 dark:text-neutral-400'>
              Transaction ID
            </span>
            <span className='font-mono text-xs text-neutral-900 dark:text-neutral-100'>
              {transactionId}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex flex-col gap-3'>
        <div className='grid grid-cols-2 gap-3'>
          <Button variant='outline' onClick={handleViewMap} className='w-full'>
            View Map
          </Button>
          <Button
            variant='primary'
            onClick={handleGoToDashboard}
            className='w-full'
          >
            Go to Dashboard
          </Button>
        </div>

        {onClose && (
          <Button variant='ghost' onClick={onClose} className='w-full'>
            Close
          </Button>
        )}
      </div>

      {/* Optional: Create account CTA if not logged in */}
      {!state.customerId && (
        <div className='text-center pt-2'>
          <p className='text-xs text-neutral-600 dark:text-neutral-400'>
            A receipt has been sent to {state.donor?.email}
          </p>
        </div>
      )}
    </div>
  );
};

export default StepThankYou;
