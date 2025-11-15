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
import { CartSidebar } from './CartSidebar';

export const DonateModal: React.FC = () => {
  const flow = useDonateFlow();

  // Check if we should show cart sidebar (entity selection or steps with cart)
  const hasCart =
    (flow.state.step === 1 && flow.state.intent?.type !== 'unrestricted') ||
    (flow.state.step >= 2 &&
      flow.state.step <= 4 &&
      flow.state.selectedEntities &&
      flow.state.selectedEntities.length > 0);

  const entityTypeLabel =
    flow.state.intent?.type === 'language'
      ? 'language'
      : flow.state.intent?.type === 'region'
        ? 'region'
        : flow.state.intent?.type === 'operation'
          ? 'operation'
          : 'item';

  const gridContent = (
    <>
      <DialogTitle className='sr-only'>Secure donation</DialogTitle>
      <DialogDescription className='sr-only'>
        Complete your donation using a secure form.
      </DialogDescription>

      {/* Header Section */}
      <div className='flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4'>
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

      {/* Main Content */}
      {hasCart ? (
        <div className='grid grid-cols-1 md:grid-cols-2 min-h-[500px]'>
          {/* Left: Info Panel + Step Content */}
          <div className='hidden md:flex flex-col bg-neutral-50 dark:bg-neutral-900/40 border-r border-neutral-200 dark:border-neutral-800'>
            <div className='flex-1 p-6 md:p-8 overflow-y-auto space-y-8'>
              <DonateInfoSection flowState={flow.state} flow={flow} />
              <DonateFlow flow={flow} showBackButton={false} />
            </div>
          </div>

          {/* Right: Cart Sidebar */}
          <div className='flex flex-col'>
            <div className='flex-1 p-6 md:p-8 overflow-y-auto'>
              <div className='sticky top-4 space-y-4'>
                <CartSidebar
                  selectedEntities={flow.state.selectedEntities || []}
                  cartTotalCents={flow.state.cartTotalCents || 0}
                  isEditable={
                    flow.state.step === 1 &&
                    (flow.state.selectedEntities?.length || 0) === 1
                  }
                  onTotalChange={newTotal => {
                    if ((flow.state.selectedEntities?.length || 0) === 1) {
                      flow.setCartTotalCents(newTotal);
                      flow.setCartEdited(true);
                    }
                  }}
                  onRemove={(entityId, entityType) => {
                    flow.removeEntityFromCart(entityId, entityType);
                  }}
                  entityTypeLabel={entityTypeLabel}
                />
                {/* Continue button for entity selection step */}
                {flow.state.step === 1 && (
                  <Button
                    onClick={() => {
                      const selectedEntities =
                        flow.state.selectedEntities || [];
                      if (selectedEntities.length === 0) return;

                      const intent = flow.state.intent;
                      if (!intent) return;

                      const entityType =
                        intent.type === 'language'
                          ? 'language'
                          : intent.type === 'region'
                            ? 'region'
                            : 'operation';

                      const languageIds =
                        entityType === 'language'
                          ? selectedEntities.map(e => e.id)
                          : undefined;
                      const regionIds =
                        entityType === 'region'
                          ? selectedEntities.map(e => e.id)
                          : undefined;
                      const operationIds =
                        entityType === 'operation'
                          ? selectedEntities.map(e => e.id)
                          : undefined;

                      flow.setIntent({
                        ...intent,
                        languageEntityIds: languageIds,
                        regionIds: regionIds,
                        operationIds: operationIds,
                      });

                      flow.next();
                    }}
                    className='w-full'
                    disabled={(flow.state.selectedEntities?.length || 0) === 0}
                  >
                    Continue to details
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 min-h-[500px]'>
          {/* Left info panel - dynamic based on step */}
          <div className='hidden md:flex flex-col bg-neutral-50 dark:bg-neutral-900/40 border-r border-neutral-200 dark:border-neutral-800'>
            <div className='flex-1 p-6 md:p-8 overflow-y-auto'>
              <DonateInfoSection flowState={flow.state} flow={flow} />
            </div>
          </div>

          {/* Right step content */}
          <div className='flex flex-col'>
            <div className='flex-1 p-6 md:p-8 overflow-y-auto'>
              <DonateFlow flow={flow} showBackButton={false} />
            </div>
          </div>
        </div>
      )}

      {/* Footer Section with FAQ */}
      <div className='border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 px-6 py-4'>
        <DonateFAQ className='justify-center' />
      </div>
    </>
  );

  return (
    <DialogContent
      size='4xl'
      className='p-0 overflow-hidden flex flex-col max-h-[90vh]'
      showClose={false} // We're using custom close button in header
      onInteractOutside={e => e.preventDefault()} // Prevent closing on outside click
    >
      {gridContent}
    </DialogContent>
  );
};

export default DonateModal;
