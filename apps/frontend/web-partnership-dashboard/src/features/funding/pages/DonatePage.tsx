import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useDonateFlow } from '../hooks/useDonateFlow';
import { DonateFlow } from '../components/DonateFlow/DonateFlow';
import { DonateInfoSection } from '../components/DonateFlow/DonateInfoSection';
import { DonateFAQ } from '../components/DonateFlow/DonateFAQ';
import { LanguageSelectionProvider } from '../components/DonateFlow/LanguageSelectionProvider';
import { StepActionsProvider } from '../components/DonateFlow/StepActionsContext';
import type { DonateIntent } from '../state/types';

export const DonatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const flow = useDonateFlow();

  // Handle deep linking with query params
  React.useEffect(() => {
    const intentParam = searchParams.get('intent');
    if (intentParam && (intentParam === 'ops' || intentParam === 'adopt')) {
      // Only set intent if we're still at the initial step
      if (flow.state.step === 0) {
        flow.setIntent(intentParam as DonateIntent);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const handleBack = () => {
    // If on step 0 (intent selection), go back to previous page
    if (flow.state.step === 0) {
      setShowConfirmDialog(true);
    } else {
      // Otherwise step back in the flow
      flow.back();
    }
  };

  const confirmLeave = () => {
    setShowConfirmDialog(false);
    navigate(-1);
  };

  // Check if we're in the adopt flow (steps 1-4 need the language selection provider)
  const isAdoptFlow =
    flow.state.intent === 'adopt' &&
    flow.state.step >= 1 &&
    flow.state.step <= 4;

  const pageContent = (
    <>
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
          <div className='bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 max-w-md mx-4 border border-neutral-200 dark:border-neutral-800'>
            <h2 className='text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100'>
              Leave donation page?
            </h2>
            <p className='text-sm text-neutral-600 dark:text-neutral-400 mb-6'>
              Your donation progress will be lost. Are you sure you want to
              leave?
            </p>
            <div className='flex gap-3 justify-end'>
              <Button
                variant='ghost'
                onClick={() => setShowConfirmDialog(false)}
              >
                Stay
              </Button>
              <Button variant='primary' onClick={confirmLeave}>
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className='bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3'>
        <div className='max-w-7xl mx-auto flex items-center gap-4'>
          <Button variant='ghost' size='sm' onClick={handleBack}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex-1'>
            <h1 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
              Support Every Language
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 max-w-7xl w-full mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12'>
          {/* Left: Info Panel - dynamic based on step */}
          <div className='lg:pr-8'>
            <DonateInfoSection flowState={flow.state} flow={flow} />
          </div>

          {/* Right: Flow Steps - max-width when stacked */}
          <div className='lg:pl-8 max-w-2xl lg:max-w-none mx-auto w-full'>
            <DonateFlow flow={flow} showBackButton={false} />
          </div>
        </div>
      </div>

      {/* FAQ at bottom */}
      <div className='border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-6'>
        <div className='max-w-7xl mx-auto'>
          <DonateFAQ className='justify-center' />
        </div>
      </div>
    </>
  );

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col'>
      {isAdoptFlow ? (
        <StepActionsProvider>
          <LanguageSelectionProvider>{pageContent}</LanguageSelectionProvider>
        </StepActionsProvider>
      ) : (
        pageContent
      )}
    </div>
  );
};

export default DonatePage;
