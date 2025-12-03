import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import type { useDonateFlow } from '../../hooks/useDonateFlow';
import { StepIntent } from './StepIntent';
import { StepEntitySelection } from './StepEntitySelection';
import { StepAmountEntry } from './StepAmountEntry';
import { StepDonor } from './StepDonor';
import { StepReviewAndPayment } from './StepReviewAndPayment';
import { StepThankYouAndAccount } from './StepThankYouAndAccount';

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
      {showBackButton && state.step > 0 && state.step < 6 && (
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

        {/* Step 1: Entity selection (skip for unrestricted - auto-advance to Step 2) */}
        {state.step === 1 && state.intent?.type !== 'unrestricted' && (
          <StepEntitySelection flow={flow} />
        )}

        {/* Step 2: Amount entry (for all, unrestricted skips Step 1) */}
        {state.step === 2 && <StepAmountEntry flow={flow} />}

        {/* Step 3: Donor details (for all) */}
        {state.step === 3 && <StepDonor flow={flow} />}

        {/* Step 4: Review & Payment (for all) - Payment method selection removed, defaults to card */}
        {state.step === 4 && <StepReviewAndPayment flow={flow} />}

        {/* Step 5: Thank You & Account Creation (for all) */}
        {state.step === 5 && (
          <StepThankYouAndAccount flow={flow} onClose={onClose} />
        )}
      </div>
    </div>
  );
};

export default DonateFlow;
