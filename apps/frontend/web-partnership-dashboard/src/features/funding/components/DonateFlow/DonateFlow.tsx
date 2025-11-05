import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import type { useDonateFlow } from '../../hooks/useDonateFlow';
import { StepIntent } from './StepIntent';
import { StepDonor } from './StepDonor';
import { StepPaymentMethod } from './StepPaymentMethod';
import { StepAmountAndPayment } from './StepAmountAndPayment';
import { StepThankYou } from './StepThankYou';
import { StepAccount } from './StepAccount';

export interface DonateFlowProps {
  flow: ReturnType<typeof useDonateFlow>;
  onClose?: () => void;
  showBackButton?: boolean;
}

export const DonateFlow: React.FC<DonateFlowProps> = ({
  flow,
  onClose,
  showBackButton = true,
}) => {
  const { state } = flow;

  return (
    <div className='flex flex-col gap-2'>
      {/* Back button */}
      {showBackButton && state.step > 0 && state.step < 4 && (
        <div className='flex justify-end'>
          <Button variant='ghost' size='sm' onClick={flow.back}>
            Back
          </Button>
        </div>
      )}

      {/* Step content with animation */}
      <div
        key={state.step}
        className='animate-in fade-in slide-in-from-right-4 duration-300'
      >
        {/* Step 0: Intent selection */}
        {state.step === 0 && <StepIntent flow={flow} />}

        {/* Step 1: Donor details */}
        {state.step === 1 && <StepDonor flow={flow} />}

        {/* Step 2: Payment method */}
        {state.step === 2 && <StepPaymentMethod flow={flow} />}

        {/* Step 3: Amount & Payment */}
        {state.step === 3 && <StepAmountAndPayment flow={flow} />}

        {/* Step 4: Thank you */}
        {state.step === 4 && <StepThankYou flow={flow} onClose={onClose} />}

        {/* Step 5: Optional account creation */}
        {state.step === 5 && <StepAccount flow={flow} />}
      </div>
    </div>
  );
};

export default DonateFlow;
