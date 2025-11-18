import React from 'react';
import { Lock } from 'lucide-react';
import { PaymentSkeleton } from './PaymentSkeleton';
import { createDonationCheckout } from '../../api/fundingApi';
import type { DonateFlow } from '../../hooks/useDonateFlow';

const StepPayment = React.lazy(() => import('./StepPayment'));

export const StepReviewAndPayment: React.FC<{ flow: DonateFlow }> = ({
  flow,
}) => {
  const [error, setError] = React.useState<string | null>(null);
  const [creatingCheckout, setCreatingCheckout] = React.useState(false);

  const { state } = flow;
  const { amount, donor, donorType, intent, paymentMethod, selectedEntity } =
    state;

  const finalAmount = amount?.amountCents ?? 0;
  const isRecurring = amount?.isRecurring ?? false;

  // Create checkout automatically when component mounts
  React.useEffect(() => {
    // Validate required fields
    if (!amount || !donor || !donorType || !intent || !paymentMethod) {
      return;
    }
    const createCheckout = async () => {
      // Check if we already have a checkout for this amount
      if (
        flow.state.clientSecret &&
        flow.state.amount?.amountCents === finalAmount &&
        flow.state.amount?.isRecurring === isRecurring
      ) {
        // Checkout already exists - no need to recreate
        return;
      }

      // Clear checkout if amount changed
      if (
        flow.state.clientSecret &&
        flow.state.amount?.amountCents !== finalAmount
      ) {
        flow.setClientSecret(null);
        if (flow.state.donationId) {
          flow.setDonationId(undefined);
        }
        if (flow.state.paymentIntentId) {
          flow.setPaymentIntentId(undefined);
        }
      }

      // Create checkout
      setError(null);
      setCreatingCheckout(true);

      try {
        // Build intent payload with single entity IDs
        const intentPayload: {
          type: 'language' | 'region' | 'operation' | 'unrestricted';
          languageEntityId?: string;
          regionId?: string;
          operationId?: string;
        } = {
          type: intent.type,
        };

        // Add entity ID based on intent type
        if (intent.type === 'language') {
          if (!intent.languageEntityId) {
            throw new Error(
              'No language selected. Please go back and select a language.'
            );
          }
          intentPayload.languageEntityId = intent.languageEntityId;
        } else if (intent.type === 'region') {
          if (!intent.regionId) {
            throw new Error(
              'No region selected. Please go back and select a region.'
            );
          }
          intentPayload.regionId = intent.regionId;
        } else if (intent.type === 'operation') {
          if (!intent.operationId) {
            throw new Error(
              'No operation selected. Please go back and select an operation.'
            );
          }
          intentPayload.operationId = intent.operationId;
        }

        const response = await createDonationCheckout({
          donor: {
            firstName: donor.firstName,
            lastName: donor.lastName,
            email: donor.email,
            phone: donor.phone,
          },
          donorType: donorType.type,
          partnerOrgId: donorType.partnerOrgId,
          newPartnerOrg: donorType.newPartnerOrg,
          intent: intentPayload,
          paymentMethod,
          amountCents: finalAmount,
          isRecurring,
        });

        // Store checkout results in flow state
        flow.setClientSecret(response.clientSecret);
        flow.setDonationId(response.donationId);
        flow.setCustomerId(response.customerId);
        flow.setPaymentIntentId(response.paymentIntentId);
        if (response.partnerOrgId) {
          flow.setPartnerOrgId(response.partnerOrgId);
        }
      } catch (err) {
        console.error('Failed to create checkout:', err);
        setError((err as Error).message);
      } finally {
        setCreatingCheckout(false);
      }
    };

    createCheckout();
  }, [
    flow,
    finalAmount,
    isRecurring,
    amount,
    donor,
    donorType,
    intent,
    paymentMethod,
  ]);

  const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getIntentTypeLabel = (): string => {
    if (!intent) return 'Donation';
    switch (intent.type) {
      case 'language':
        return 'Language';
      case 'region':
        return 'Region';
      case 'operation':
        return 'Operation';
      case 'unrestricted':
        return 'Unrestricted';
      default:
        return 'Donation';
    }
  };

  // Validate required fields
  if (!amount || !donor || !donorType || !intent || !paymentMethod) {
    return (
      <div className='text-sm text-error-600 dark:text-error-400'>
        Missing required donation details. Please go back and complete all
        steps.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 text-neutral-700 dark:text-neutral-300'>
        <Lock className='h-4 w-4' />
        <span className='font-medium'>Review Your Donation</span>
      </div>

      {/* Review Summary */}
      <div className='space-y-3'>
        {/* Entity (if applicable) */}
        {selectedEntity && (
          <div className='p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800'>
            <div className='text-sm text-primary-700 dark:text-primary-300 mb-1'>
              {getIntentTypeLabel()}
            </div>
            <div className='text-lg font-semibold text-primary-900 dark:text-primary-100'>
              {selectedEntity.name}
            </div>
            {selectedEntity.budgetCents > 0 && (
              <div className='text-sm text-primary-600 dark:text-primary-400 mt-1'>
                ${formatCurrency(selectedEntity.budgetCents)} remaining budget
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700'>
          <div className='text-sm text-neutral-600 dark:text-neutral-400 mb-1'>
            Donation Amount
          </div>
          <div className='text-2xl font-semibold text-neutral-900 dark:text-neutral-100'>
            ${formatCurrency(finalAmount)}
            <span className='text-base font-normal text-neutral-600 dark:text-neutral-400 ml-2'>
              {isRecurring ? '/month' : 'one-time'}
            </span>
          </div>
        </div>

        {/* Donor */}
        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700'>
          <div className='text-sm text-neutral-600 dark:text-neutral-400 mb-1'>
            Donor
          </div>
          <div className='text-base font-medium text-neutral-900 dark:text-neutral-100'>
            {donor.firstName} {donor.lastName}
          </div>
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            {donor.email}
          </div>
        </div>
      </div>

      {error && (
        <div className='text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-3 rounded-lg'>
          {error}
        </div>
      )}

      {/* Payment Form */}
      <div className='pt-4 border-t border-neutral-200 dark:border-neutral-800'>
        {creatingCheckout ? (
          <PaymentSkeleton />
        ) : flow.state.clientSecret ? (
          <React.Suspense fallback={<PaymentSkeleton />}>
            <StepPayment flow={flow} />
          </React.Suspense>
        ) : (
          <div className='text-sm text-neutral-600 dark:text-neutral-400 text-center py-4'>
            Preparing payment form...
          </div>
        )}
      </div>
    </div>
  );
};

export default StepReviewAndPayment;
