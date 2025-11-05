import React from 'react';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/shared/components/ui/Button';
import { createDonationCheckout } from '../../api/fundingApi';
import { getStripePromise } from '@/shared/services/stripe';

const stripePromise = getStripePromise();

const Inner: React.FC<{ flow: any; clientSecret: string | null }> = ({
  flow,
  clientSecret,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const paymentMethod = flow.state.paymentMethod;

  // State for floating labels
  const [cardNumberFocused, setCardNumberFocused] = React.useState(false);
  const [cardNumberEmpty, setCardNumberEmpty] = React.useState(true);
  const [expiryFocused, setExpiryFocused] = React.useState(false);
  const [expiryEmpty, setExpiryEmpty] = React.useState(true);
  const [cvcFocused, setCvcFocused] = React.useState(false);
  const [cvcEmpty, setCvcEmpty] = React.useState(true);
  const [isDarkMode, setIsDarkMode] = React.useState(
    document.documentElement.classList.contains('dark')
  );

  // Listen for theme changes
  React.useEffect(() => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!stripe || !elements) return;
    if (!clientSecret) return;

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setFormError('Payment form not loaded');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const confirmed = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (confirmed.error) {
        throw confirmed.error;
      }

      // Payment successful - advance to thank you step
      flow.next();
    } catch (error) {
      const err = error as any;
      setFormError(err.message ?? 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  }, [stripe, elements, clientSecret, flow]);

  // Bank transfer UI
  if (paymentMethod === 'bank_transfer') {
    return (
      <div className='space-y-4'>
        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
          <h4 className='font-semibold text-blue-900 dark:text-blue-100 mb-2'>
            Bank transfer instructions
          </h4>
          <p className='text-sm text-blue-800 dark:text-blue-200 mb-3'>
            Your donation is pending. We'll process it once we receive your bank
            transfer (usually 1-3 business days).
          </p>
          <div className='text-sm text-blue-700 dark:text-blue-300'>
            <p className='mb-1'>
              <strong>Amount:</strong> $
              {(flow.state.amount?.amountCents / 100).toFixed(2)} USD
            </p>
            <p className='mb-3'>
              Check your email for bank transfer instructions, or contact
              support for details.
            </p>
          </div>
        </div>

        <div className='pt-2 flex justify-end'>
          <Button onClick={() => flow.next()}>
            I've transferred the funds
          </Button>
        </div>
      </div>
    );
  }

  // Card payment UI
  const elementStyle = {
    base: {
      color: isDarkMode ? '#ffffff' : '#18181b',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: isDarkMode ? '#737373' : '#a3a3a3',
      },
    },
    invalid: {
      color: '#dc2626',
    },
  };

  return (
    <div className='space-y-6'>
      <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-4'>
        Enter your payment details
      </div>

      {/* Card Number */}
      <div className='relative'>
        <label
          className={`absolute left-3 transition-all duration-200 pointer-events-none ${
            cardNumberFocused || !cardNumberEmpty
              ? 'top-1 text-xs text-primary-600 dark:text-primary-400'
              : 'top-4 text-base text-neutral-500 dark:text-neutral-400'
          }`}
        >
          Card number
        </label>
        <div className='mt-1 px-3 py-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400'>
          <CardNumberElement
            options={{
              style: elementStyle,
              showIcon: true,
            }}
            onFocus={() => setCardNumberFocused(true)}
            onBlur={() => setCardNumberFocused(false)}
            onChange={e => setCardNumberEmpty(e.empty)}
          />
        </div>
      </div>

      {/* Expiry and CVC */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='relative'>
          <label
            className={`absolute left-3 transition-all duration-200 pointer-events-none ${
              expiryFocused || !expiryEmpty
                ? 'top-1 text-xs text-primary-600 dark:text-primary-400'
                : 'top-4 text-base text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Expiry
          </label>
          <div className='mt-1 px-3 py-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400'>
            <CardExpiryElement
              options={{ style: elementStyle }}
              onFocus={() => setExpiryFocused(true)}
              onBlur={() => setExpiryFocused(false)}
              onChange={e => setExpiryEmpty(e.empty)}
            />
          </div>
        </div>

        <div className='relative'>
          <label
            className={`absolute left-3 transition-all duration-200 pointer-events-none ${
              cvcFocused || !cvcEmpty
                ? 'top-1 text-xs text-primary-600 dark:text-primary-400'
                : 'top-4 text-base text-neutral-500 dark:text-neutral-400'
            }`}
          >
            CVC
          </label>
          <div className='mt-1 px-3 py-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400'>
            <CardCvcElement
              options={{ style: elementStyle }}
              onFocus={() => setCvcFocused(true)}
              onBlur={() => setCvcFocused(false)}
              onChange={e => setCvcEmpty(e.empty)}
            />
          </div>
        </div>
      </div>

      {formError && (
        <div className='text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-3 rounded-lg'>
          {formError}
        </div>
      )}

      <div className='pt-2'>
        <Button className='w-full' onClick={handleSubmit} loading={submitting}>
          {submitting
            ? 'Processing...'
            : `Pay $${(flow.state.amount?.amountCents / 100).toFixed(2)}`}
        </Button>
      </div>

      <div className='text-xs text-neutral-500 dark:text-neutral-400 text-center'>
        Your payment is processed securely by Stripe
      </div>
    </div>
  );
};

export const StepPayment: React.FC<{ flow: any }> = ({ flow }) => {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create checkout on mount
  React.useEffect(() => {
    const createCheckout = async () => {
      try {
        setLoading(true);
        setError(null);

        const { donor, donorType, intent, paymentMethod, amount } = flow.state;

        if (!donor || !donorType || !intent || !paymentMethod || !amount) {
          throw new Error('Missing required donation details');
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
          intent: {
            type: intent.type,
            languageEntityId: intent.languageEntityId,
            regionId: intent.regionId,
            operationId: intent.operationId,
          },
          paymentMethod,
          amountCents: amount.amountCents,
          isRecurring: amount.isRecurring,
        });

        setClientSecret(response.clientSecret);

        // Store IDs in flow
        flow.setDonationId(response.donationId);
        flow.setCustomerId(response.customerId);
        if (response.partnerOrgId) {
          flow.setPartnerOrgId(response.partnerOrgId);
        }
      } catch (err) {
        console.error('Failed to create checkout:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    createCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className='space-y-4'>
        <div className='h-12 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-lg' />
        <div className='grid grid-cols-2 gap-4'>
          <div className='h-12 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-lg' />
          <div className='h-12 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-lg' />
        </div>
        <div className='h-10 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-lg' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-4'>
        <div className='text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 p-4 rounded-lg'>
          <strong>Error:</strong> {error}
        </div>
        <Button onClick={() => flow.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <Inner flow={flow} clientSecret={clientSecret} />
    </Elements>
  );
};

export default StepPayment;
