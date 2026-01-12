'use client';

import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/Alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { useDonateFlow } from '../../hooks/useDonateFlow';
import { useDonationStatus } from '../../hooks/useDonationStatus';

interface StepThankYouProps {
  flow: ReturnType<typeof useDonateFlow>;
  onClose?: () => void;
}

export const StepThankYou: React.FC<StepThankYouProps> = ({
  flow,
  onClose,
}) => {
  const router = useRouter();
  const { state } = flow;

  const intent = state.intent;
  const amount = state.amount;
  const paymentMethod = state.paymentMethod;

  // Monitor donation status in real-time
  const { status: donationStatus, isLoading: isStatusLoading } =
    useDonationStatus(state.donationId);

  // Calculate display values
  const isMonthly = amount?.isRecurring ?? false;
  const displayAmount = (amount?.amountCents ?? 0) / 100;
  const currency = 'USD'; // Default currency
  const cadenceSuffix = isMonthly ? '/month' : '';

  // Payment status based on payment method
  // Card payments: Confirmed immediately by Stripe (webhook will finalize)
  // Bank transfers: Pending until webhook confirms funds received
  const isBankTransfer = paymentMethod === 'bank_transfer';

  // Determine display status
  // For card payments: show "Confirmed" optimistically, but update if status changes
  // For bank transfers: always show "Pending" (no change)
  const getDisplayStatus = (): {
    text: string;
    className: string;
  } => {
    if (isBankTransfer) {
      return {
        text: 'Pending',
        className: 'text-yellow-600 dark:text-yellow-400',
      };
    }

    // For card payments, check actual status if available
    if (donationStatus === 'failed') {
      return {
        text: 'Failed',
        className: 'text-error-600 dark:text-error-400',
      };
    }

    if (donationStatus === 'completed') {
      return {
        text: 'Confirmed',
        className: 'text-success-600 dark:text-success-400',
      };
    }

    // Default: show "Confirmed" optimistically for card payments
    return {
      text: 'Confirmed',
      className: 'text-success-600 dark:text-success-400',
    };
  };

  const displayStatus = getDisplayStatus();
  const hasFailed = donationStatus === 'failed';

  const donationType =
    intent?.type === 'operation'
      ? 'Operational Support'
      : intent?.type === 'language'
        ? 'Language Adoption'
        : 'Donation';

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleViewMap = () => {
    if (onClose) onClose();
    router.push('/map');
  };

  const handleGoToDashboard = () => {
    if (onClose) onClose();
    router.push('/dashboard');
  };

  return (
    <div className='space-y-6'>
      {/* Success Icon & Message */}
      <div className='flex flex-col items-center text-center space-y-3'>
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            hasFailed
              ? 'bg-error-100 dark:bg-error-900/30'
              : 'bg-success-100 dark:bg-success-900/30'
          }`}>
          {hasFailed ? (
            <AlertCircle className='w-10 h-10 text-error-600 dark:text-error-400' />
          ) : (
            <CheckCircle2 className='w-10 h-10 text-success-600 dark:text-success-400' />
          )}
        </div>
        <div>
          <h3 className='text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1'>
            {hasFailed
              ? 'Payment Failed'
              : isBankTransfer
                ? 'Donation submitted!'
                : 'Thank you for your donation!'}
          </h3>
          <p className='text-sm text-neutral-600 dark:text-neutral-400'>
            {hasFailed
              ? "We couldn't process your payment. Please try again or contact support."
              : isBankTransfer
                ? "Your bank transfer is pending. We'll process your donation once we receive the funds (usually 1-3 business days)."
                : "Your generosity helps bring God's Word to every language."}
          </p>
          {isBankTransfer && !hasFailed && (
            <p className='text-xs text-neutral-500 dark:text-neutral-500 mt-2'>
              You'll receive a confirmation email once the transfer is complete.
            </p>
          )}
        </div>
      </div>

      {/* Error Alert for Failed Donations */}
      {hasFailed && (
        <Alert variant='error' size='md'>
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription>
            <div className='space-y-2'>
              <p>Your donation could not be processed. This may be due to:</p>
              <ul className='list-disc list-inside space-y-1 text-sm'>
                <li>Insufficient funds or card declined</li>
                <li>Card expired or invalid</li>
                <li>Network or processing error</li>
              </ul>
              <p className='mt-2'>
                Please try again with a different payment method or{' '}
                <a
                  href='mailto:support@everylanguage.com'
                  className='underline font-medium'>
                  contact support
                </a>{' '}
                if the problem persists.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Receipt Details */}
      <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 space-y-3 bg-neutral-50 dark:bg-neutral-900/40'>
        <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3'>
          Receipt
        </div>

        <div className='flex justify-between text-sm'>
          <span className='text-neutral-600 dark:text-neutral-400'>Amount</span>
          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
            ${displayAmount.toLocaleString()} {currency}
            {cadenceSuffix}
          </span>
        </div>

        <div className='flex justify-between text-sm'>
          <span className='text-neutral-600 dark:text-neutral-400'>Type</span>
          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
            {donationType}
          </span>
        </div>

        {intent?.type === 'language' && intent.languageEntityId && (
          <div className='flex justify-between text-sm'>
            <span className='text-neutral-600 dark:text-neutral-400'>
              Language
            </span>
            <span className='font-medium text-neutral-900 dark:text-neutral-100'>
              {intent.displayName ?? 'Selected language'}
            </span>
          </div>
        )}

        <div className='flex justify-between text-sm'>
          <span className='text-neutral-600 dark:text-neutral-400'>Date</span>
          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
            {currentDate}
          </span>
        </div>

        {state.donationId && (
          <div className='flex justify-between text-sm'>
            <span className='text-neutral-600 dark:text-neutral-400'>
              Donation ID
            </span>
            <span className='font-mono text-xs text-neutral-900 dark:text-neutral-100'>
              {state.donationId}
            </span>
          </div>
        )}

        <div className='flex justify-between text-sm'>
          <span className='text-neutral-600 dark:text-neutral-400'>Status</span>
          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
            <span className={displayStatus.className}>
              {displayStatus.text}
              {isStatusLoading && !hasFailed && (
                <span className='ml-2 text-xs opacity-70'>(verifying...)</span>
              )}
            </span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex flex-col gap-3'>
        <div className='grid grid-cols-2 gap-3'>
          <Button variant='outline' onClick={handleViewMap} className='w-full'>
            View Map
          </Button>
          <Button
            variant='primary'
            onClick={handleGoToDashboard}
            className='w-full'>
            Go to Dashboard
          </Button>
        </div>

        {onClose && (
          <Button variant='ghost' onClick={onClose} className='w-full'>
            Close
          </Button>
        )}
      </div>

      {/* Optional: Create account CTA if not logged in */}
      {!state.customerId && (
        <div className='text-center pt-2'>
          <p className='text-xs text-neutral-600 dark:text-neutral-400'>
            A receipt has been sent to {state.donor?.email}
          </p>
        </div>
      )}
    </div>
  );
};

export default StepThankYou;
