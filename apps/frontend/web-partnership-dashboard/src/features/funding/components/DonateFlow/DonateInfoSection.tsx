import React from 'react';
import { DonateFlowInfo } from './DonateFlowInfo';
import { LanguagesTable } from './LanguagesTable';
import { StepDetails } from './StepDetails';
import { StepPaymentMethod } from './StepPaymentMethod';
import type { DonateFlowState } from '../../state/types';
import type { useDonateFlow } from '../../hooks/useDonateFlow';

const StepPayment = React.lazy(() => import('./StepPayment'));

interface DonateInfoSectionProps {
  flowState: DonateFlowState;
  flow: ReturnType<typeof useDonateFlow>;
  className?: string;
}

export const DonateInfoSection: React.FC<DonateInfoSectionProps> = ({
  flowState,
  flow,
  className = '',
}) => {
  // For adopt flow, show different content on the left based on step
  if (flowState.intent === 'adopt') {
    if (flowState.step === 1) {
      // Step 1: Languages table
      return (
        <div className={className}>
          <LanguagesTable flow={flow} />
        </div>
      );
    }
    if (flowState.step === 2) {
      // Step 2: Details form
      return (
        <div className={className}>
          <div className='text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
            Your details
          </div>
          <div className='max-w-2xl lg:max-w-none'>
            <StepDetails flow={flow} hideButton />
          </div>
        </div>
      );
    }
    if (flowState.step === 3) {
      // Step 3: Payment method selection
      return (
        <div className={className}>
          <div className='text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
            Payment method
          </div>
          <div className='max-w-2xl lg:max-w-none'>
            <StepPaymentMethod flow={flow} hideButton />
          </div>
        </div>
      );
    }
    if (flowState.step === 4) {
      // Step 4: Payment form
      return (
        <div className={className}>
          <div className='text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
            Payment details
          </div>
          <React.Suspense
            fallback={<div className='text-sm'>Loading payment…</div>}
          >
            <StepPayment flow={flow} hideButton />
          </React.Suspense>
        </div>
      );
    }
  }

  // Otherwise show default info
  return <DonateFlowInfo className={className} />;
};

export default DonateInfoSection;
