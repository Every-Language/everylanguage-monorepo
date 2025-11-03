import React from 'react';
import {
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { useDonateFlow } from '../../hooks/useDonateFlow';
import { DonateFlow } from './DonateFlow';
import { DonateInfoSection } from './DonateInfoSection';
import { DonateFAQ } from './DonateFAQ';
import { LanguageSelectionProvider } from './LanguageSelectionProvider';
import { StepActionsProvider } from './StepActionsContext';

export const DonateModal: React.FC = () => {
  const flow = useDonateFlow();

  // Check if we're in the adopt flow (steps 1-4 need the language selection provider)
  const isAdoptFlow =
    flow.state.intent === 'adopt' &&
    flow.state.step >= 1 &&
    flow.state.step <= 4;

  const gridContent = (
    <>
      <DialogTitle className='sr-only'>Secure donation</DialogTitle>
      <DialogDescription className='sr-only'>
        Complete your donation using a secure form.
      </DialogDescription>

      {/* Back button at top left */}
      {flow.state.step > 0 && (
        <div className='absolute top-4 left-4 z-10'>
          <Button variant='ghost' size='sm' onClick={flow.back}>
            Back
          </Button>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 min-h-[500px]'>
        {/* Left info panel - dynamic based on step - full height */}
        <div className='hidden md:flex flex-col bg-neutral-50 dark:bg-neutral-900/40 border-r border-neutral-200 dark:border-neutral-800'>
          <div className='flex-1 p-6 md:p-8'>
            <DonateInfoSection flowState={flow.state} flow={flow} />
          </div>
          {/* FAQ at bottom of left panel */}
          <div className='border-t border-neutral-200 dark:border-neutral-800 px-6 py-4'>
            <DonateFAQ className='justify-center' />
          </div>
        </div>

        {/* Right step content - full height */}
        <div className='flex flex-col'>
          <div className='flex-1 p-6 md:p-8 pt-14 md:pt-8'>
            <DonateFlow flow={flow} showBackButton={false} />
          </div>
          {/* FAQ at bottom on mobile */}
          <div className='md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 px-6 py-4'>
            <DonateFAQ className='justify-center' />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <DialogContent size='4xl' className='p-0 pb-0'>
      {isAdoptFlow ? (
        <StepActionsProvider>
          <LanguageSelectionProvider>{gridContent}</LanguageSelectionProvider>
        </StepActionsProvider>
      ) : (
        gridContent
      )}
    </DialogContent>
  );
};

export default DonateModal;
