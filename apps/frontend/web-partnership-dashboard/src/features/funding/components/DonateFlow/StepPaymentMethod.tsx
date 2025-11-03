import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { StepActionsContext } from './StepActionsContext';

interface StepPaymentMethodProps {
  flow: any;
  hideButton?: boolean;
}

export const StepPaymentMethod: React.FC<StepPaymentMethodProps> = ({
  flow,
  hideButton = false,
}) => {
  const { setSubmitAction } = React.useContext(StepActionsContext);
  const [method, setMethod] = React.useState<'card' | 'bank_transfer'>('card');

  const handleContinue = React.useCallback(() => {
    flow.setPaymentMethod(method);
    flow.next();
  }, [flow, method]);

  // Register submit action when button is hidden (adopt flow)
  React.useEffect(() => {
    if (hideButton) {
      setSubmitAction(() => handleContinue);
      return () => setSubmitAction(null);
    }
  }, [hideButton, handleContinue, setSubmitAction]);

  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-4'>
        Choose your payment method
      </div>

      <div className='space-y-3'>
        <label className='group flex items-start gap-4 p-5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-sm transition-all duration-200'>
          <input
            type='radio'
            name='payment-method'
            value='card'
            checked={method === 'card'}
            onChange={() => setMethod('card')}
            className='mt-0.5 w-4 h-4 text-primary-600 focus:ring-primary-500'
          />
          <div className='flex-1'>
            <div className='font-semibold text-neutral-900 dark:text-neutral-100 mb-1'>
              Credit or Debit Card
            </div>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Pay immediately and get instant access
            </div>
          </div>
        </label>

        <label className='group flex items-start gap-4 p-5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-sm transition-all duration-200'>
          <input
            type='radio'
            name='payment-method'
            value='bank_transfer'
            checked={method === 'bank_transfer'}
            onChange={() => setMethod('bank_transfer')}
            className='mt-0.5 w-4 h-4 text-primary-600 focus:ring-primary-500'
          />
          <div className='flex-1'>
            <div className='font-semibold text-neutral-900 dark:text-neutral-100 mb-1'>
              Bank Transfer (ACH)
            </div>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Takes 1-3 business days • Your language adoption will be on hold
              until payment is received
            </div>
          </div>
        </label>
      </div>

      {!hideButton && (
        <div className='pt-2 flex justify-end'>
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      )}
    </div>
  );
};

export default StepPaymentMethod;
