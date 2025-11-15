import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Lock, Heart } from 'lucide-react';
import { PaymentSkeleton } from './PaymentSkeleton';
import { createDonationCheckout } from '../../api/fundingApi';
import type { DonateFlow } from '../../hooks/useDonateFlow';

const StepPayment = React.lazy(() => import('./StepPayment'));

// Give once amounts (in cents)
const SUGGESTED_ONCE = [150000, 70000, 40000, 15000, 7500, 3500];
// Monthly amounts (~30% of give once, rounded)
const SUGGESTED_MONTHLY = [45000, 21000, 12000, 4500, 2300, 1100];

export const StepAmountAndPayment: React.FC<{ flow: DonateFlow }> = ({
  flow,
}) => {
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [amount, setAmount] = React.useState<number>(7500);
  const [showPayment, setShowPayment] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [creatingCheckout, setCreatingCheckout] = React.useState(false);

  // Use cart total if available (for language/region/operation intents)
  // Otherwise use amount selection (for unrestricted intents)
  const hasCart =
    flow.state.cartTotalCents !== undefined && flow.state.cartTotalCents > 0;
  const finalAmount = hasCart ? flow.state.cartTotalCents || 0 : amount;

  const suggestions = isRecurring ? SUGGESTED_MONTHLY : SUGGESTED_ONCE;

  // Update amount when switching recurring to use suggested amount from new list
  const prevIsRecurringRef = React.useRef(isRecurring);

  React.useEffect(() => {
    if (prevIsRecurringRef.current !== isRecurring && !hasCart) {
      const newSuggestions = isRecurring ? SUGGESTED_MONTHLY : SUGGESTED_ONCE;

      // If current amount is not in new suggestions, reset to default
      if (!newSuggestions.includes(amount)) {
        setAmount(newSuggestions[4]); // Default to 5th option (e.g., $75 once or $23 monthly)
      }

      prevIsRecurringRef.current = isRecurring;
    }
  }, [isRecurring, amount, hasCart]);

  const min = 50;

  // Clear checkout if amount changes (to prevent using stale checkout)
  React.useEffect(() => {
    const currentAmount = hasCart ? flow.state.cartTotalCents || 0 : amount;
    // If amount in flow state doesn't match current amount, clear checkout
    if (
      flow.state.amount &&
      flow.state.amount.amountCents !== currentAmount &&
      flow.state.clientSecret
    ) {
      flow.setClientSecret(null);
      if (flow.state.donationId) {
        flow.setDonationId(undefined);
      }
      if (flow.state.paymentIntentId) {
        flow.setPaymentIntentId(undefined);
      }
    }
  }, [finalAmount, flow, hasCart, amount]);

  const handleContinue = async () => {
    if (!finalAmount || finalAmount < min) {
      setError(`Minimum donation is $${(min / 100).toFixed(2)}`);
      return;
    }

    // Set amount in flow
    flow.setAmount({
      isRecurring,
      amountCents: finalAmount,
    });

    // Check if we already have a checkout for this amount
    if (
      flow.state.clientSecret &&
      flow.state.amount?.amountCents === finalAmount &&
      flow.state.amount?.isRecurring === isRecurring
    ) {
      // Checkout already exists for this amount - proceed to payment
      setShowPayment(true);
      return;
    }

    // Create checkout when user clicks Continue (not when amount is selected)
    // This ensures we always use the final amount
    setError(null);
    setCreatingCheckout(true);

    try {
      const { donor, donorType, intent, paymentMethod } = flow.state;

      if (!donor || !donorType || !intent || !paymentMethod) {
        throw new Error('Missing required donation details');
      }

      // Debug: Log current state
      console.log('🔵 StepAmountAndPayment - Current state:', {
        intent,
        selectedEntities: flow.state.selectedEntities,
        cartTotalCents: flow.state.cartTotalCents,
      });

      // Build intent with entity IDs
      const intentPayload: {
        type: 'language' | 'region' | 'operation' | 'unrestricted';
        languageEntityId?: string;
        languageEntityIds?: string[];
        regionId?: string;
        regionIds?: string[];
        operationId?: string;
        operationIds?: string[];
      } = {
        type: intent.type,
      };

      // Add entity IDs based on intent type
      // Prioritize arrays (for multiple entities) over single IDs
      if (intent.type === 'language') {
        if (intent.languageEntityIds && intent.languageEntityIds.length > 0) {
          intentPayload.languageEntityIds = intent.languageEntityIds;
          console.log(
            '🔵 Using languageEntityIds from intent:',
            intent.languageEntityIds
          );
        } else if (intent.languageEntityId) {
          intentPayload.languageEntityId = intent.languageEntityId;
          console.log(
            '🔵 Using languageEntityId from intent:',
            intent.languageEntityId
          );
        } else {
          // Fallback: try to get IDs from selectedEntities
          const languageEntities = (flow.state.selectedEntities || []).filter(
            e => e.type === 'language'
          );
          console.log(
            '🔵 Fallback: languageEntities from selectedEntities:',
            languageEntities
          );
          if (languageEntities.length > 0) {
            intentPayload.languageEntityIds = languageEntities.map(e => e.id);
            console.log(
              '🔵 Using languageEntityIds from selectedEntities:',
              intentPayload.languageEntityIds
            );
          } else {
            console.error('❌ Missing language entity IDs:', {
              intent,
              selectedEntities: flow.state.selectedEntities,
            });
            throw new Error('No language entities selected');
          }
        }
      } else if (intent.type === 'region') {
        if (intent.regionIds && intent.regionIds.length > 0) {
          intentPayload.regionIds = intent.regionIds;
          console.log('🔵 Using regionIds from intent:', intent.regionIds);
        } else if (intent.regionId) {
          intentPayload.regionId = intent.regionId;
          console.log('🔵 Using regionId from intent:', intent.regionId);
        } else {
          // Fallback: try to get IDs from selectedEntities
          const regionEntities = (flow.state.selectedEntities || []).filter(
            e => e.type === 'region'
          );
          console.log(
            '🔵 Fallback: regionEntities from selectedEntities:',
            regionEntities
          );
          if (regionEntities.length > 0) {
            intentPayload.regionIds = regionEntities.map(e => e.id);
            console.log(
              '🔵 Using regionIds from selectedEntities:',
              intentPayload.regionIds
            );
          } else {
            console.error('❌ Missing region IDs:', {
              intent,
              selectedEntities: flow.state.selectedEntities,
            });
            throw new Error('No regions selected');
          }
        }
      } else if (intent.type === 'operation') {
        if (intent.operationIds && intent.operationIds.length > 0) {
          intentPayload.operationIds = intent.operationIds;
          console.log(
            '🔵 Using operationIds from intent:',
            intent.operationIds
          );
        } else if (intent.operationId) {
          intentPayload.operationId = intent.operationId;
          console.log('🔵 Using operationId from intent:', intent.operationId);
        } else {
          // Fallback: try to get IDs from selectedEntities
          const operationEntities = (flow.state.selectedEntities || []).filter(
            e => e.type === 'operation'
          );
          console.log(
            '🔵 Fallback: operationEntities from selectedEntities:',
            operationEntities
          );
          if (operationEntities.length > 0) {
            intentPayload.operationIds = operationEntities.map(e => e.id);
            console.log(
              '🔵 Using operationIds from selectedEntities:',
              intentPayload.operationIds
            );
          } else {
            console.error('❌ Missing operation IDs:', {
              intent,
              selectedEntities: flow.state.selectedEntities,
            });
            throw new Error('No operations selected');
          }
        }
      }

      // Debug log the intent payload
      console.log(
        '🔵 Final intent payload for checkout:',
        JSON.stringify(intentPayload, null, 2)
      );

      // Validate that we have the required IDs before proceeding
      if (intent.type === 'language') {
        if (
          !intentPayload.languageEntityIds &&
          !intentPayload.languageEntityId
        ) {
          console.error(
            '❌ Validation failed: No language entity IDs in payload',
            {
              intentPayload,
              intent,
              selectedEntities: flow.state.selectedEntities,
            }
          );
          throw new Error(
            'No language entities selected. Please go back and select a language.'
          );
        }
        console.log('✅ Language IDs validated:', {
          languageEntityIds: intentPayload.languageEntityIds,
          languageEntityId: intentPayload.languageEntityId,
        });
      }
      if (intent.type === 'region') {
        if (!intentPayload.regionIds && !intentPayload.regionId) {
          console.error('❌ Validation failed: No region IDs in payload', {
            intentPayload,
            intent,
            selectedEntities: flow.state.selectedEntities,
          });
          throw new Error(
            'No regions selected. Please go back and select a region.'
          );
        }
        console.log('✅ Region IDs validated:', {
          regionIds: intentPayload.regionIds,
          regionId: intentPayload.regionId,
        });
      }
      if (intent.type === 'operation') {
        if (!intentPayload.operationIds && !intentPayload.operationId) {
          console.error('❌ Validation failed: No operation IDs in payload', {
            intentPayload,
            intent,
            selectedEntities: flow.state.selectedEntities,
          });
          throw new Error(
            'No operations selected. Please go back and select an operation.'
          );
        }
        console.log('✅ Operation IDs validated:', {
          operationIds: intentPayload.operationIds,
          operationId: intentPayload.operationId,
        });
      }

      // Calculate donation mode
      const selectedEntities = flow.state.selectedEntities || [];
      const subtotal = selectedEntities.reduce(
        (sum, e) => sum + e.budgetCents,
        0
      );
      const cartEdited = flow.state.cartEdited || false;
      const donationMode: 'adoption' | 'contribution' =
        cartEdited && finalAmount < subtotal && selectedEntities.length === 1
          ? 'contribution'
          : 'adoption';

      // Final check before sending - ensure intent has required IDs
      const finalIntentPayload = { ...intentPayload };
      console.log(
        '🔵 About to send checkout request with intent:',
        JSON.stringify(finalIntentPayload, null, 2)
      );

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
        intent: finalIntentPayload,
        paymentMethod,
        amountCents: finalAmount,
        isRecurring,
        donationMode,
        selectedEntities,
      });

      // Store checkout results in flow state
      flow.setClientSecret(response.clientSecret);
      flow.setDonationId(response.donationId);
      flow.setCustomerId(response.customerId);
      flow.setPaymentIntentId(response.paymentIntentId);
      if (response.partnerOrgId) {
        flow.setPartnerOrgId(response.partnerOrgId);
      }

      // Show payment form after checkout is created
      setShowPayment(true);
    } catch (err) {
      console.error('Failed to create checkout:', err);
      setError((err as Error).message);
    } finally {
      setCreatingCheckout(false);
    }
  };

  if (showPayment) {
    return (
      <React.Suspense fallback={<PaymentSkeleton />}>
        <StepPayment flow={flow} />
      </React.Suspense>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 text-neutral-700 dark:text-neutral-300'>
        <Lock className='h-4 w-4' />
        <span className='font-medium'>Secure donation</span>
      </div>

      {/* One-time vs Monthly toggle */}
      <div className='flex gap-2'>
        <Button
          variant={!isRecurring ? 'outline' : 'ghost'}
          onClick={() => setIsRecurring(false)}
          className='flex-1'
        >
          Give once
        </Button>
        <Button
          variant={isRecurring ? 'primary' : 'ghost'}
          onClick={() => setIsRecurring(true)}
          className='flex-1'
        >
          <Heart className='h-4 w-4 mr-1' /> Monthly
        </Button>
      </div>

      {/* Amount display/selection */}
      {hasCart ? (
        // Show read-only cart total
        <div className='p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700'>
          <div className='text-sm text-neutral-600 dark:text-neutral-400 mb-1'>
            Donation amount
          </div>
          <div className='text-2xl font-semibold text-neutral-900 dark:text-neutral-100'>
            $
            {(finalAmount / 100).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      ) : (
        // Show amount selection for unrestricted donations
        <>
          {/* Suggested amounts */}
          <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
            {suggestions.map(v => (
              <Button
                key={v}
                variant={amount === v ? 'primary' : 'outline'}
                onClick={() => setAmount(v)}
                size='sm'
              >
                ${(v / 100).toLocaleString()}
              </Button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className='flex items-center gap-2'>
            <span className='text-neutral-700 dark:text-neutral-300'>$</span>
            <Input
              type='number'
              value={(amount / 100).toString()}
              onChange={e =>
                setAmount(
                  Math.round((parseFloat(e.target.value || '0') || 0) * 100)
                )
              }
              className='w-32'
              min={min / 100}
              step='0.01'
            />
            <span className='text-sm text-neutral-600 dark:text-neutral-400'>
              USD
            </span>
          </div>
        </>
      )}

      {error && (
        <div className='text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-3 rounded-lg'>
          {error}
        </div>
      )}

      <div className='pt-2'>
        <Button
          className='w-full'
          onClick={handleContinue}
          loading={creatingCheckout}
          disabled={creatingCheckout || !!error}
        >
          {creatingCheckout ? 'Preparing payment...' : 'Continue to payment'}
        </Button>
      </div>
    </div>
  );
};

export default StepAmountAndPayment;
