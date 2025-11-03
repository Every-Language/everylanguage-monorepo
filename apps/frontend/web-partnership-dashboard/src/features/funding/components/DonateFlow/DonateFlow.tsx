import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import type { useDonateFlow } from '../../hooks/useDonateFlow';
import { StepChooseIntent } from './StepChooseIntent';
import { StepAmount } from './StepAmount';
import { StepDetails } from './StepDetails';
import { StepLanguages } from './StepLanguages';
import { StepAccount } from './StepAccount';
import { StepConversion } from './StepConversion';
import { StepThankYou } from './StepThankYou';
import { LanguageCart } from './LanguageCart';
import { LanguageSelectionContext } from './LanguageSelectionProvider';
import { StepActionsContext } from './StepActionsContext';
import { useAuth } from '@/features/auth';

const StepPayment = React.lazy(() => import('./StepPayment'));

// Helper component to show cart with appropriate action for adopt flow steps 2-4
const AdoptFlowCart: React.FC<{
  flow: ReturnType<typeof useDonateFlow>;
  languageContext: any;
}> = ({ flow, languageContext }) => {
  const { selectedIds, removeLanguage, rows, totals, loading } =
    languageContext;
  const { submitAction, coverFees, setCoverFees } =
    React.useContext(StepActionsContext);
  const selectedLanguages = rows.filter((r: any) => selectedIds.includes(r.id));
  const step = flow.state.step;

  // Call the registered submit action from the current step
  const handleAction = () => {
    if (submitAction) {
      submitAction();
    }
  };

  const getButtonText = () => {
    if (step === 2) return 'Continue to payment method';
    if (step === 3) return 'Continue to payment';
    if (step === 4) return 'Pay now';
    return 'Continue';
  };

  return (
    <LanguageCart
      selectedLanguages={selectedLanguages}
      totals={totals}
      loading={loading}
      onRemove={removeLanguage}
      onContinue={handleAction}
      buttonText={getButtonText()}
      allowRemove={false}
      showCoverFees={step === 4}
      coverFees={coverFees}
      onCoverFeesChange={setCoverFees}
    />
  );
};

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
  const { user } = useAuth();
  const languageContext = React.useContext(LanguageSelectionContext);

  // Skip conversion step when user selects monthly
  React.useEffect(() => {
    // Ops flow: if at step 3 (conversion) and cadence is monthly, skip to step 4 (payment)
    if (
      state.intent === 'ops' &&
      state.step === 3 &&
      state.amount?.cadence === 'monthly'
    ) {
      flow.next();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.intent, state.step, state.amount?.cadence]);

  // Skip details/account when already logged in
  React.useEffect(() => {
    if (!user) return;
    // Ops flow: details is now at step 2 (after amount)
    if (state.intent === 'ops' && state.step === 2) {
      flow.next();
    }
    // Adopt flow: details stays at step 2 (after languages)
    if (state.intent === 'adopt' && state.step === 2) {
      flow.next();
    }
    // flow object is stable for this component; intent/step changes drive transitions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.intent, state.step]);

  return (
    <div className='flex flex-col gap-2'>
      {/* Back button only (no title) */}
      {showBackButton && state.step > 0 && (
        <div className='flex justify-end'>
          <Button variant='ghost' size='sm' onClick={flow.back}>
            Back
          </Button>
        </div>
      )}

      {/* Step content with animation - key triggers animation on step change */}
      {/* For adopt flow steps 2-4, don't animate the cart */}
      {state.intent === 'adopt' &&
      state.step >= 2 &&
      state.step <= 4 &&
      languageContext ? (
        <AdoptFlowCart flow={flow} languageContext={languageContext} />
      ) : (
        <div
          key={`${state.intent}-${state.step}`}
          className='animate-in fade-in slide-in-from-right-4 duration-300'
        >
          {state.step === 0 && <StepChooseIntent flow={flow} />}

          {/* Ops Flow: Intent → Amount → Details → Conversion (if once) → Payment → ThankYou → Account */}
          {state.step === 1 && state.intent === 'ops' && (
            <StepAmount flow={flow} />
          )}
          {state.step === 2 && state.intent === 'ops' && (
            <StepDetails flow={flow} />
          )}
          {state.step === 3 && state.intent === 'ops' && (
            <StepConversion
              flow={flow}
              oneTimeAmount={state.amount?.amount_cents ?? 0}
              currency={state.amount?.currency ?? 'USD'}
            />
          )}
          {state.step === 4 && state.intent === 'ops' && (
            <React.Suspense
              fallback={<div className='text-sm'>Loading payment…</div>}
            >
              <StepPayment flow={flow} />
            </React.Suspense>
          )}
          {state.intent === 'ops' && state.step === 5 && (
            <StepThankYou flow={flow} onClose={onClose} />
          )}
          {state.intent === 'ops' && state.step === 6 && (
            <StepAccount flow={flow} />
          )}

          {/* Adopt Flow: Intent → Languages → Details (org selector) → PaymentMethod → Payment → ThankYou → Account */}
          {state.intent === 'adopt' && state.step === 1 && (
            <StepLanguages flow={flow} onClose={onClose} />
          )}
          {state.intent === 'adopt' && state.step === 5 && (
            <StepThankYou flow={flow} onClose={onClose} />
          )}
          {state.intent === 'adopt' && state.step === 6 && (
            <StepAccount flow={flow} />
          )}
        </div>
      )}
    </div>
  );
};

export default DonateFlow;
