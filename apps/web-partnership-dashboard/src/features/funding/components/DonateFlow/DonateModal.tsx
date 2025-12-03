import React from 'react';
import {
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';
import { X, ArrowLeft } from 'lucide-react';
import { useDonateFlow } from '../../hooks/useDonateFlow';
import { DonateFlow } from './DonateFlow';
import { DonateInfoSection } from './DonateInfoSection';
import { DonateFAQ } from './DonateFAQ';
import type { DonationIntent, SelectedEntity } from '../../state/types';

interface DonateModalProps {
  initialIntent?: DonationIntent;
  initialSelectedEntity?: SelectedEntity;
  initialStep?: number;
}

export const DonateModal: React.FC<DonateModalProps> = ({
  initialIntent,
  initialSelectedEntity,
  initialStep,
}) => {
  const flow = useDonateFlow();

  // Initialize flow state when modal opens with initial props
  React.useEffect(() => {
    if (initialIntent) {
      flow.initializeWithState(
        initialIntent,
        initialSelectedEntity,
        initialStep ?? 0
      );
    } else {
      // Reset to initial state if no initial props provided
      flow.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIntent, initialSelectedEntity, initialStep]); // Re-run when props change

  const gridContent = (
    <>
      <DialogTitle className='sr-only'>Secure donation</DialogTitle>
      <DialogDescription className='sr-only'>
        Complete your donation using a secure form.
      </DialogDescription>

      {/* Header Section */}
      <div className='flex-shrink-0 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4'>
        {/* Back button */}
        <div>
          {flow.state.step > 0 ? (
            <Button
              variant='ghost'
              size='sm'
              onClick={flow.back}
              className='gap-2'
            >
              <ArrowLeft className='h-4 w-4' />
              Back
            </Button>
          ) : (
            <div className='w-16' /> // Placeholder for alignment
          )}
        </div>

        {/* Title */}
        <h2 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          Support Every Language
        </h2>

        {/* Close button */}
        <DialogClose asChild>
          <Button variant='ghost' size='sm' className='gap-2'>
            <X className='h-4 w-4' />
            <span className='hidden sm:inline'>Close</span>
          </Button>
        </DialogClose>
      </div>

      {/* Main Content - Always 2-column layout: info on left, content on right */}
      <div className='flex-1 min-h-0 overflow-hidden'>
        <div className='grid grid-cols-1 md:grid-cols-2 h-full'>
          {/* Left: Info Panel (information only) */}
          <div className='hidden md:flex flex-col bg-neutral-50 dark:bg-neutral-900/40 border-r border-neutral-200 dark:border-neutral-800 min-h-0'>
            <div className='flex-1 p-6 md:p-8 overflow-y-auto min-h-0'>
              <DonateInfoSection flowState={flow.state} flow={flow} />
            </div>
          </div>

          {/* Right: Step Content (all interactive content) */}
          <div className='flex flex-col min-h-0'>
            <div className='flex-1 p-6 md:p-8 overflow-y-auto min-h-0'>
              <DonateFlow flow={flow} showBackButton={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section with FAQ */}
      <div className='flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 px-6 py-4'>
        <DonateFAQ className='justify-center' />
      </div>
    </>
  );

  return (
    <DialogContent
      size='4xl'
      className='p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]'
      showClose={false} // We're using custom close button in header
      onInteractOutside={e => e.preventDefault()} // Prevent closing on outside click
    >
      {gridContent}
    </DialogContent>
  );
};

export default DonateModal;
