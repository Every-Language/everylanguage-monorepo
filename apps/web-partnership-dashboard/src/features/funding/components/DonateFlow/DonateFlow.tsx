import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import type { useDonateFlow } from '../../hooks/useDonateFlow';
import { StepIntent } from './StepIntent';
import { StepEntitySelection } from './StepEntitySelection';
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
      {showBackButton && state.step > 0 && state.step < 5 && (
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

        {/* Step 1: Entity selection (skip for unrestricted) */}
        {state.step === 1 && state.intent?.type !== 'unrestricted' && (
          <StepEntitySelection flow={flow} />
        )}
        {/* If step 1 but unrestricted, skip to step 2 */}
        {state.step === 1 && state.intent?.type === 'unrestricted' && (
          <StepDonor flow={flow} />
        )}

        {/* Step 2: Donor details */}
        {state.step === 2 && <StepDonor flow={flow} />}

        {/* Step 3: Payment method */}
        {state.step === 3 && <StepPaymentMethod flow={flow} />}

        {/* Step 4: Amount & Payment */}
        {state.step === 4 && <StepAmountAndPayment flow={flow} />}

        {/* Step 5: Thank you */}
        {state.step === 5 && <StepThankYou flow={flow} onClose={onClose} />}

        {/* Step 6: Optional account creation */}
        {state.step === 6 && <StepAccount flow={flow} />}
      </div>
    </div>
  );
};

export default DonateFlow;
