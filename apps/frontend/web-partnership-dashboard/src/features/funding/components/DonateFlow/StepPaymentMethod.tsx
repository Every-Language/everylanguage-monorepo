import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { StepActionsContext } from './StepActionsContext';
import { createAdoptionCheckout } from '../../api/fundingApi';
import { useAuth } from '@/features/auth';

interface StepPaymentMethodProps {
  flow: any;
  hideButton?: boolean;
}

export const StepPaymentMethod: React.FC<StepPaymentMethodProps> = ({
  flow,
  hideButton = false,
}) => {
  const { setSubmitAction, setCheckoutPromise } =
    React.useContext(StepActionsContext);
  const [method, setMethod] = React.useState<'card' | 'bank_transfer'>('card');
  const { user } = useAuth();

  const handleContinue = React.useCallback(() => {
    flow.setPaymentMethod(method);

    // Pre-fetch checkout for adoption flow
    if (flow.state.intent === 'adopt' && flow.state.adopt && flow.state.donor) {
      const donor = flow.state.donor;
      const meta = (user?.user_metadata ?? {}) as {
        first_name?: string;
        last_name?: string;
      };
      const donorFirst =
        donor.firstName ??
        meta.first_name ??
        user?.email?.split('@')[0] ??
        'Donor';
      const donorLast = donor.lastName ?? meta.last_name ?? 'Supporter';
      const donorEmail = donor.email ?? user?.email ?? '';
      const donorPhone = donor.phone;

      const ids = flow.state.adopt.languageIds ?? [];
      const orgSelection = flow.state.orgSelection ?? {
        orgMode: 'individual' as const,
      };

      if (ids.length > 0) {
        // Start checkout creation in background
        const checkoutPromise = createAdoptionCheckout({
          donor: {
            firstName: donorFirst,
            lastName: donorLast,
            email: donorEmail,
            phone: donorPhone,
          },
          adoptionIds: ids,
          mode: method,
          orgMode: orgSelection.orgMode,
          partnerOrgId: orgSelection.partner_org_id,
          newPartnerOrg: orgSelection.new_partner_org
            ? {
                name: orgSelection.new_partner_org.name,
                description: orgSelection.new_partner_org.description,
                isPublic: orgSelection.new_partner_org.is_public,
              }
            : undefined,
        });

        // Store promise so StepPayment can use it
        setCheckoutPromise(checkoutPromise);
      }
    }

    flow.next();
  }, [flow, method, setCheckoutPromise, user]);

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
