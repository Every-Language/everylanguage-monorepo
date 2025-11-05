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
import { useAuth } from '@/features/auth';
import {
  createDonationCheckout,
  createAdoptionCheckout,
} from '../../api/fundingApi';
import type { DonateFlowState, AmountSelection } from '../../state/types';
import { applyFeeCover } from '../../utils/calc';
import { StepActionsContext } from './StepActionsContext';
import { PaymentSkeleton } from './PaymentSkeleton';
import { getStripePromise } from '@/shared/services/stripe';

const stripePromise = getStripePromise();

// Prevent duplicate checkout initialization (React StrictMode) and cache clientSecret
const CHECKOUT_CS_CACHE_PREFIX = 'el:checkout:cs:';
const CACHE_VERSION = 'v1'; // Increment to invalidate all cached checkouts
const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// Cache entry structure
interface CacheEntry {
  clientSecret: string | null;
  timestamp: number;
  version: string;
}

// Clean up expired cache entries
const cleanExpiredCache = () => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CHECKOUT_CS_CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(
            sessionStorage.getItem(key) ?? '{}'
          ) as CacheEntry;
          if (
            entry.version !== CACHE_VERSION ||
            now - entry.timestamp > CACHE_MAX_AGE_MS
          ) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore errors in cache cleanup
  }
};

type Flow = {
  state: DonateFlowState;
  next: () => void;
  back: () => void;
  setAmount: (amount: AmountSelection) => void;
  setCustomerId?: (id: string) => void;
  setPartnerOrgId?: (id: string) => void;
};

const Inner: React.FC<{
  flow: Flow;
  clientSecret: string | null;
  hideButton?: boolean;
}> = ({ flow, clientSecret, hideButton = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const intent = flow.state.intent;
  const { setSubmitAction } = React.useContext(StepActionsContext);

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

  // Register submit action when button is hidden (adopt flow)
  React.useEffect(() => {
    if (hideButton) {
      setSubmitAction(() => handleSubmit);
      return () => setSubmitAction(null);
    }
  }, [hideButton, handleSubmit, setSubmitAction]);

  // Set up Stripe Element event listeners for floating labels
  React.useEffect(() => {
    if (!elements) return;

    const cardNumber = elements.getElement(CardNumberElement);
    const cardExpiry = elements.getElement(CardExpiryElement);
    const cardCvc = elements.getElement(CardCvcElement);

    if (cardNumber) {
      cardNumber.on('focus', () => setCardNumberFocused(true));
      cardNumber.on('blur', () => setCardNumberFocused(false));
      cardNumber.on('change', event => setCardNumberEmpty(event.empty));
    }

    if (cardExpiry) {
      cardExpiry.on('focus', () => setExpiryFocused(true));
      cardExpiry.on('blur', () => setExpiryFocused(false));
      cardExpiry.on('change', event => setExpiryEmpty(event.empty));
    }

    if (cardCvc) {
      cardCvc.on('focus', () => setCvcFocused(true));
      cardCvc.on('blur', () => setCvcFocused(false));
      cardCvc.on('change', event => setCvcEmpty(event.empty));
    }
  }, [elements]);

  // Update Stripe Element styles when theme changes
  React.useEffect(() => {
    if (!elements) return;

    const cardNumber = elements.getElement(CardNumberElement);
    const cardExpiry = elements.getElement(CardExpiryElement);
    const cardCvc = elements.getElement(CardCvcElement);

    const newStyle = {
      style: {
        base: {
          fontSize: '16px',
          color: isDarkMode ? '#e5e7eb' : '#1f2937',
          '::placeholder': {
            color: 'transparent',
          },
          ':focus::placeholder': {
            color: '#a1a1aa',
          },
          iconColor: '#a1a1aa',
        },
        invalid: {
          color: '#ef4444',
          iconColor: '#ef4444',
          '::placeholder': {
            color: 'transparent',
          },
          ':focus::placeholder': {
            color: '#a1a1aa',
          },
        },
      },
    };

    cardNumber?.update(newStyle);
    cardExpiry?.update(newStyle);
    cardCvc?.update(newStyle);
  }, [elements, isDarkMode]);

  const amountCents =
    intent === 'ops'
      ? (flow.state.amount?.amount_cents ?? 0)
      : (flow.state.adopt?.monthly_cents ?? 0);
  const cover = flow.state.amount?.coverFees ?? true;
  const totalCents = cover ? applyFeeCover(amountCents) : amountCents;
  const cadenceSuffix =
    intent === 'adopt' || flow.state.amount?.cadence === 'monthly'
      ? '/month'
      : '';
  const currency = flow.state.amount?.currency ?? 'USD';

  // Shared styling for all card elements - adapts to theme
  const cardElementStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: isDarkMode ? '#e5e7eb' : '#1f2937', // Light text in dark mode, dark text in light mode
        '::placeholder': {
          color: 'transparent', // Hide placeholder initially
        },
        ':focus::placeholder': {
          color: '#a1a1aa', // Show placeholder on focus
        },
        iconColor: '#a1a1aa',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
        '::placeholder': {
          color: 'transparent',
        },
        ':focus::placeholder': {
          color: '#a1a1aa',
        },
      },
    },
  };

  // Helper to focus Stripe elements when clicking container
  const focusCardNumber = () => {
    const el = elements?.getElement(CardNumberElement);
    el?.focus();
  };

  const focusCardExpiry = () => {
    const el = elements?.getElement(CardExpiryElement);
    el?.focus();
  };

  const focusCardCvc = () => {
    const el = elements?.getElement(CardCvcElement);
    el?.focus();
  };

  return (
    <div className='space-y-4'>
      {/* Card Number with Floating Label */}
      <div className='relative'>
        <div
          onClick={focusCardNumber}
          className={`px-4 py-4 bg-white dark:bg-neutral-900 border rounded-lg transition-colors cursor-text ${
            cardNumberFocused
              ? 'border-primary-500 dark:border-primary-500'
              : 'border-neutral-300 dark:border-neutral-700'
          }`}
        >
          <CardNumberElement options={cardElementStyle} />
        </div>
        <label
          className={`absolute left-3 text-neutral-600 dark:text-neutral-400 pointer-events-none transition-all duration-200 ease-out ${
            cardNumberFocused || !cardNumberEmpty
              ? 'text-xs -top-2 bg-white dark:bg-neutral-900 px-1'
              : 'text-sm top-1/2 -translate-y-1/2 translate-x-1'
          }`}
        >
          Card number
        </label>
      </div>

      {/* Expiration and CVC in grid with Floating Labels */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='relative'>
          <div
            onClick={focusCardExpiry}
            className={`px-4 py-4 bg-white dark:bg-neutral-900 border rounded-lg transition-colors cursor-text ${
              expiryFocused
                ? 'border-primary-500 dark:border-primary-500'
                : 'border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <CardExpiryElement options={cardElementStyle} />
          </div>
          <label
            className={`absolute left-3 text-neutral-600 dark:text-neutral-400 pointer-events-none transition-all duration-200 ease-out ${
              expiryFocused || !expiryEmpty
                ? 'text-xs -top-2 bg-white dark:bg-neutral-900 px-1'
                : 'text-sm top-1/2 -translate-y-1/2'
            }`}
          >
            Expiration
          </label>
        </div>
        <div className='relative'>
          <div
            onClick={focusCardCvc}
            className={`px-4 py-4 bg-white dark:bg-neutral-900 border rounded-lg transition-colors cursor-text ${
              cvcFocused
                ? 'border-primary-500 dark:border-primary-500'
                : 'border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <CardCvcElement options={cardElementStyle} />
          </div>
          <label
            className={`absolute left-3 text-neutral-600 dark:text-neutral-400 pointer-events-none transition-all duration-200 ease-out ${
              cvcFocused || !cvcEmpty
                ? 'text-xs -top-2 bg-white dark:bg-neutral-900 px-1'
                : 'text-sm top-1/2 -translate-y-1/2'
            }`}
          >
            CVC
          </label>
        </div>
      </div>

      {formError && <div className='text-sm text-error-600'>{formError}</div>}

      {/* Cover transaction costs toggle - styled like LayerToggles */}
      <label className='flex items-center justify-between text-sm select-none py-1'>
        <span>Cover transaction costs</span>
        <span className='relative inline-flex items-center'>
          <input
            type='checkbox'
            checked={cover}
            onChange={e => {
              const current: AmountSelection = flow.state.amount ?? {
                cadence: 'monthly',
                amount_cents: 0,
                currency: 'USD',
                coverFees: true,
              };
              flow.setAmount({ ...current, coverFees: e.target.checked });
            }}
            className='sr-only peer'
            aria-label='Cover transaction costs toggle'
          />
          <span className='block w-10 h-6 rounded-full bg-neutral-300 dark:bg-neutral-700 peer-checked:bg-primary-600 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background' />
          <span className='absolute left-0.5 top-0.5 h-5 w-5 bg-white rounded-full shadow-sm transform transition peer-checked:translate-x-4' />
        </span>
      </label>
      {!hideButton && (
        <div className='flex items-center justify-between'>
          <div className='text-sm text-neutral-700 dark:text-neutral-300'>
            Total{' '}
            <span className='font-medium'>
              ${(totalCents / 100).toLocaleString()} {currency}
              {cadenceSuffix}
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            className='h-12 px-6'
          >
            Donate
          </Button>
        </div>
      )}
    </div>
  );
};

// Bank Transfer Details from Stripe
interface BankTransferDetails {
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountHolderName?: string;
}

// Bank Transfer Instructions Component
const BankTransferInstructions: React.FC<{
  flow: Flow;
  hideButton?: boolean;
}> = ({ flow, hideButton = false }) => {
  const stripe = useStripe();
  const { setSubmitAction, checkoutPromise, clearCheckoutPromise } =
    React.useContext(StepActionsContext);
  const [submitting, setSubmitting] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [initError, setInitError] = React.useState<string | null>(null);
  const [bankDetails, setBankDetails] =
    React.useState<BankTransferDetails | null>(null);
  const [setupIntentClientSecret, setSetupIntentClientSecret] = React.useState<
    string | null
  >(null);

  // Wait for the checkout promise to resolve and retrieve bank details
  React.useEffect(() => {
    if (!checkoutPromise || !stripe) {
      if (!checkoutPromise) setInitializing(false);
      return;
    }

    let isMounted = true;

    checkoutPromise
      .then(async res => {
        if (!isMounted) return;

        // Store IDs in flow state for later use
        if (res.customerId) flow.setCustomerId?.(res.customerId);
        if (res.partnerOrgId) flow.setPartnerOrgId?.(res.partnerOrgId);

        // Store setupIntentClientSecret for card collection
        if (res.setupIntentClientSecret) {
          setSetupIntentClientSecret(res.setupIntentClientSecret);
        }

        // Retrieve PaymentIntent to get bank transfer details
        if (res.clientSecret) {
          try {
            const { paymentIntent } = await stripe.retrievePaymentIntent(
              res.clientSecret
            );

            // Cast to any since display_bank_transfer_instructions is not in Stripe TS types yet
            const nextAction = paymentIntent?.next_action as any;
            if (nextAction?.type === 'display_bank_transfer_instructions') {
              const instructions =
                nextAction.display_bank_transfer_instructions;
              const financialAddresses = instructions?.financial_addresses;

              // Find US bank account details (ABA)
              const abaAddress = financialAddresses?.find(
                (addr: any) => addr.type === 'aba'
              );

              if (abaAddress) {
                setBankDetails({
                  accountNumber: abaAddress.aba?.account_number || 'N/A',
                  routingNumber: abaAddress.aba?.routing_number || 'N/A',
                  bankName: abaAddress.aba?.bank_name || 'Stripe',
                  accountHolderName: instructions?.hosted_instructions_url
                    ? undefined
                    : 'Every Language',
                });
              } else {
                // Fallback if no ABA address found
                throw new Error('Bank transfer details not available');
              }
            } else {
              throw new Error('Bank transfer instructions not found');
            }
          } catch (error) {
            console.error('Failed to retrieve bank details:', error);
            if (isMounted) {
              setInitError(
                'Failed to retrieve bank transfer details. Please try again or contact support.'
              );
            }
          }
        }

        if (isMounted) {
          setInitializing(false);
        }
      })
      .catch(e => {
        const msg = e instanceof Error ? e.message : String(e);
        if (isMounted) {
          setInitError(msg || 'Failed to initialize bank transfer');
          setInitializing(false);
        }
      })
      .finally(() => {
        clearCheckoutPromise();
      });

    return () => {
      isMounted = false;
    };
  }, [checkoutPromise, clearCheckoutPromise, flow, stripe]);

  const handleContinue = React.useCallback(async () => {
    setSubmitting(true);
    // Move to the next step (thank you page)
    flow.next();
    setSubmitting(false);
  }, [flow]);

  // Register submit action when button is hidden (adopt flow)
  React.useEffect(() => {
    if (hideButton && !initializing) {
      setSubmitAction(() => handleContinue);
      return () => setSubmitAction(null);
    }
  }, [hideButton, handleContinue, setSubmitAction, initializing]);

  if (initializing) {
    return <PaymentSkeleton />;
  }

  if (initError) {
    return (
      <div className='space-y-3'>
        <div className='text-sm text-error-600'>{initError}</div>
        <div className='flex justify-end'>
          <Button variant='secondary' onClick={flow.back}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Bank Transfer Instructions */}
      <div className='p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
        <h3 className='text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3'>
          Bank Transfer Instructions
        </h3>
        <p className='text-sm text-blue-800 dark:text-blue-200 mb-4'>
          Your language adoption has been reserved. Please complete the bank
          transfer within 7 days to confirm your adoption.
        </p>
        {bankDetails ? (
          <div className='space-y-3 text-sm'>
            <div>
              <span className='font-medium text-blue-900 dark:text-blue-100'>
                Bank Name:
              </span>
              <p className='text-blue-800 dark:text-blue-200 mt-1 font-mono'>
                {bankDetails.bankName}
              </p>
            </div>
            {bankDetails.accountHolderName && (
              <div>
                <span className='font-medium text-blue-900 dark:text-blue-100'>
                  Account Name:
                </span>
                <p className='text-blue-800 dark:text-blue-200 mt-1'>
                  {bankDetails.accountHolderName}
                </p>
              </div>
            )}
            <div>
              <span className='font-medium text-blue-900 dark:text-blue-100'>
                Routing Number:
              </span>
              <p className='text-blue-800 dark:text-blue-200 mt-1 font-mono'>
                {bankDetails.routingNumber}
              </p>
            </div>
            <div>
              <span className='font-medium text-blue-900 dark:text-blue-100'>
                Account Number:
              </span>
              <p className='text-blue-800 dark:text-blue-200 mt-1 font-mono'>
                {bankDetails.accountNumber}
              </p>
            </div>
          </div>
        ) : (
          <div className='text-sm text-blue-800 dark:text-blue-200'>
            Loading bank transfer details...
          </div>
        )}
      </div>

      {/* Card Collection for Future Payments */}
      {setupIntentClientSecret && (
        <div className='border-t border-neutral-200 dark:border-neutral-700 pt-6'>
          <h4 className='text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2'>
            Save a card for future payments (Optional)
          </h4>
          <p className='text-sm text-neutral-600 dark:text-neutral-400 mb-4'>
            To make future project top-ups easier, you can save a card now. This
            is optional and your card will not be charged.
          </p>
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: setupIntentClientSecret }}
          >
            <SetupIntentForm
              setupIntentClientSecret={setupIntentClientSecret}
            />
          </Elements>
        </div>
      )}

      <div className='p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg'>
        <p className='text-sm text-neutral-700 dark:text-neutral-300'>
          <strong>Note:</strong> Bank transfers typically take 1-3 business days
          to process. You will receive a confirmation email once we receive your
          payment.
        </p>
      </div>

      {!hideButton && (
        <div className='flex justify-end'>
          <Button onClick={handleContinue} loading={submitting}>
            I understand
          </Button>
        </div>
      )}
    </div>
  );
};

// SetupIntent Form for collecting card details
const SetupIntentForm: React.FC<{ setupIntentClientSecret: string }> = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
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

  const handleSaveCard = async () => {
    if (!stripe || !elements || saved) return;

    setSaving(true);
    setError(null);

    try {
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href, // Not used for off-session setup
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Failed to save card');
      } else {
        setSaved(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const cardElementStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: isDarkMode ? '#e5e7eb' : '#1f2937',
        '::placeholder': {
          color: '#a1a1aa',
        },
        iconColor: '#a1a1aa',
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
  };

  if (saved) {
    return (
      <div className='p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg'>
        <p className='text-sm text-success-800 dark:text-success-200'>
          ✓ Card saved successfully for future payments
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='p-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg'>
        <CardNumberElement options={cardElementStyle} />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <div className='p-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg'>
          <CardExpiryElement options={cardElementStyle} />
        </div>
        <div className='p-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg'>
          <CardCvcElement options={cardElementStyle} />
        </div>
      </div>
      {error && <div className='text-sm text-error-600'>{error}</div>}
      <div className='flex justify-end'>
        <Button
          onClick={handleSaveCard}
          loading={saving}
          variant='secondary'
          size='sm'
        >
          Save Card
        </Button>
      </div>
    </div>
  );
};

export const StepPayment: React.FC<{ flow: Flow; hideButton?: boolean }> = ({
  flow,
  hideButton = false,
}) => {
  const intent = flow.state.intent;
  const paymentMethod = flow.state.paymentMethod ?? 'card';
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [initializing, setInitializing] = React.useState<boolean>(true);
  const [initError, setInitError] = React.useState<string | null>(null);
  const currency = (flow.state.amount?.currency ?? 'USD').toLowerCase();
  // Removed strict-mode guard that could leave initializing=true when hot reloading
  const { user } = useAuth();
  const {
    coverFees: contextCoverFees,
    checkoutPromise,
    clearCheckoutPromise,
  } = React.useContext(StepActionsContext);

  // If bank transfer, show bank transfer instructions wrapped in Elements provider
  if (paymentMethod === 'bank_transfer') {
    if (!stripePromise) {
      return (
        <div className='text-sm text-error-600'>
          Missing VITE_STRIPE_PUBLISHABLE_KEY. Set it in your env and restart
          dev server.
        </div>
      );
    }
    return (
      <Elements stripe={stripePromise}>
        <BankTransferInstructions flow={flow} hideButton={hideButton} />
      </Elements>
    );
  }

  const minCentsForCurrency = (ccy: string) => {
    switch (ccy) {
      case 'usd':
      case 'aud':
      case 'nzd':
      case 'sgd':
      case 'eur':
      case 'gbp':
        return 50;
      case 'jpy':
        return 50; // JPY has 0-decimal, but Stripe applies currency rules server-side
      default:
        return 50;
    }
  };

  React.useEffect(() => {
    let isMounted = true;

    // Clean up expired cache entries on mount
    cleanExpiredCache();

    const donorEmail = flow.state.donor?.email ?? user?.email ?? '';
    const idsKey = (flow.state.adopt?.languageIds ?? []).join(',');
    const baseCents = flow.state.amount?.amount_cents ?? 0;
    // Use context coverFees for adopt flow, flow.state.amount.coverFees for ops flow
    const coverFees =
      intent === 'adopt'
        ? contextCoverFees
        : (flow.state.amount?.coverFees ?? true);
    const totalCents = coverFees ? applyFeeCover(baseCents) : baseCents;
    // Include coverFees in cache key to ensure new checkout when fee coverage changes
    const cacheKey = `${CHECKOUT_CS_CACHE_PREFIX}${CACHE_VERSION}:${intent}:${donorEmail}:${idsKey}:${totalCents}:${coverFees}:${currency}`;

    // If cached client secret exists and is not expired, reuse it
    const cachedStr = sessionStorage.getItem(cacheKey);
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr) as CacheEntry;
        const now = Date.now();
        if (
          cached.version === CACHE_VERSION &&
          now - cached.timestamp <= CACHE_MAX_AGE_MS
        ) {
          setClientSecret(cached.clientSecret);
          setInitializing(false);
          return () => {
            isMounted = false;
          };
        }
      } catch {
        // Invalid cache entry, ignore and proceed
      }
    }

    // Check if we have a pre-fetched checkout promise from previous step
    if (checkoutPromise) {
      setInitializing(true);
      checkoutPromise
        .then(res => {
          if (isMounted) {
            const cs =
              res.depositClientSecret ??
              res.subscriptionClientSecret ??
              res.clientSecret;
            setClientSecret(cs);
            // Store customerId and partnerOrgId in flow state for later use
            if (res.customerId) flow.setCustomerId?.(res.customerId);
            if (res.partnerOrgId) flow.setPartnerOrgId?.(res.partnerOrgId);
            try {
              const cacheEntry: CacheEntry = {
                clientSecret: cs,
                timestamp: Date.now(),
                version: CACHE_VERSION,
              };
              sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
            } catch {
              /* ignore */
            }
            setInitializing(false);
          }
        })
        .catch(e => {
          const msg = e instanceof Error ? e.message : String(e);
          if (isMounted) {
            setInitError(msg || 'Failed to initialize payment');
            setInitializing(false);
          }
        })
        .finally(() => {
          // Clear the promise after consuming it
          clearCheckoutPromise();
        });
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      setInitializing(true);
      try {
        const meta = (user?.user_metadata ?? {}) as {
          first_name?: string;
          last_name?: string;
        };
        const donorFirst =
          flow.state.donor?.firstName ??
          meta.first_name ??
          user?.email?.split('@')[0] ??
          'Donor';
        const donorLast =
          flow.state.donor?.lastName ?? meta.last_name ?? 'Supporter';
        const donorEmail = flow.state.donor?.email ?? user?.email ?? '';
        const donorPhone = flow.state.donor?.phone;

        let cs: string | null = null;
        let customerId: string | null = null;
        let partnerOrgId: string | null = null;

        if (intent === 'ops') {
          // Operational Costs Flow - use create-donation-checkout
          const baseCents = flow.state.amount?.amount_cents ?? 0;
          const coverFees = flow.state.amount?.coverFees ?? true;
          const totalCents = coverFees ? applyFeeCover(baseCents) : baseCents;
          const min = minCentsForCurrency(currency);
          if (!totalCents || totalCents < min) {
            throw new Error(
              `Minimum charge is ${(min / 100).toFixed(2)} ${currency.toUpperCase()}.`
            );
          }

          const cadence = flow.state.amount?.cadence ?? 'once';
          const res = await createDonationCheckout({
            donor: {
              firstName: donorFirst,
              lastName: donorLast,
              email: donorEmail,
              phone: donorPhone,
            },
            amountCents: totalCents,
            cadence: cadence === 'monthly' ? 'monthly' : 'once',
            mode: 'card', // Operational costs always use card payment
            currency: flow.state.amount?.currency ?? 'USD',
          });

          cs = res.clientSecret;
          customerId = res.customerId;
          partnerOrgId = res.partnerOrgId;
        } else {
          // Language Adoption Flow - use create-adoption-checkout
          const ids = flow.state.adopt?.languageIds ?? [];
          if (!ids.length) {
            throw new Error('Select at least one language to continue.');
          }

          const orgSelection = flow.state.orgSelection ?? {
            orgMode: 'individual' as const,
          };
          const mode = (flow.state.paymentMethod ?? 'card') as
            | 'card'
            | 'bank_transfer';

          const res = await createAdoptionCheckout({
            donor: {
              firstName: donorFirst,
              lastName: donorLast,
              email: donorEmail,
              phone: donorPhone,
            },
            adoptionIds: ids,
            mode,
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

          cs =
            res.depositClientSecret ??
            res.subscriptionClientSecret ??
            res.clientSecret;
          customerId = res.customerId;
          partnerOrgId = res.partnerOrgId;
        }

        if (isMounted) {
          setClientSecret(cs);
          // Store customerId and partnerOrgId in flow state for later use
          if (customerId) flow.setCustomerId?.(customerId);
          if (partnerOrgId) flow.setPartnerOrgId?.(partnerOrgId);
          try {
            const cacheEntry: CacheEntry = {
              clientSecret: cs,
              timestamp: Date.now(),
              version: CACHE_VERSION,
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isMounted) setInitError(msg || 'Failed to initialize payment');
      } finally {
        if (isMounted) setInitializing(false);
      }
    })();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextCoverFees, checkoutPromise]); // Re-run when coverFees changes (for adopt flow) or when checkoutPromise is set

  if (!stripePromise)
    return (
      <div className='text-sm text-error-600'>
        Missing VITE_STRIPE_PUBLISHABLE_KEY. Set it in your env and restart dev
        server.
      </div>
    );
  if (initializing) return <PaymentSkeleton />;
  if (initError || !clientSecret)
    return (
      <div className='space-y-3'>
        <div className='text-sm text-error-600'>
          {initError || 'Unable to load payment form.'}
        </div>
        <div className='flex justify-end'>
          <Button variant='secondary' onClick={flow.back}>
            Back
          </Button>
        </div>
      </div>
    );

  return (
    <Elements stripe={stripePromise}>
      <Inner flow={flow} clientSecret={clientSecret} hideButton={hideButton} />
    </Elements>
  );
};

export default StepPayment;
