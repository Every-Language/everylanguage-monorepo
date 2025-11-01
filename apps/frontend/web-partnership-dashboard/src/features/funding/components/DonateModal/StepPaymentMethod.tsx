import React from 'react';
import { Button } from '@/shared/components/ui/Button';

interface StepPaymentMethodProps {
  flow: any;
}

export const StepPaymentMethod: React.FC<StepPaymentMethodProps> = ({
  flow,
}) => {
  const [method, setMethod] = React.useState<'card' | 'bank_transfer'>('card');

  const handleContinue = () => {
    flow.setPaymentMethod(method);
    flow.next();
  };

  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-4'>
        Choose your payment method
      </div>

      <div className='space-y-3'>
        <label className='flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'>
          <input
            type='radio'
            name='payment-method'
            value='card'
            checked={method === 'card'}
            onChange={() => setMethod('card')}
            className='w-4 h-4'
          />
          <div>
            <div className='font-medium'>Credit or Debit Card</div>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Pay immediately and get instant access
            </div>
          </div>
        </label>

        <label className='flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'>
          <input
            type='radio'
            name='payment-method'
            value='bank_transfer'
            checked={method === 'bank_transfer'}
            onChange={() => setMethod('bank_transfer')}
            className='w-4 h-4'
          />
          <div>
            <div className='font-medium'>Bank Transfer (ACH)</div>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Takes 1-3 business days • Your language adoption will be on hold
              until payment is received
            </div>
          </div>
        </label>
      </div>

      <div className='pt-2 flex justify-end'>
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  );
};

export default StepPaymentMethod;
