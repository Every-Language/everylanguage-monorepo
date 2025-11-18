'use client';

import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { CheckCircle2 } from 'lucide-react';
import { authService } from '@/features/auth/services/auth';
import { useToast } from '@/shared/theme/hooks/useToast';
import type { useDonateFlow } from '../../hooks/useDonateFlow';

interface StepThankYouAndAccountProps {
  flow: ReturnType<typeof useDonateFlow>;
  onClose?: () => void;
}

export const StepThankYouAndAccount: React.FC<StepThankYouAndAccountProps> = ({
  flow,
  onClose,
}) => {
  const { state } = flow;
  const { toast } = useToast();

  const intent = state.intent;
  const amount = state.amount;
  const paymentMethod = state.paymentMethod;
  const selectedEntity = state.selectedEntity;

  // Account creation state
  const [password, setPassword] = React.useState('');
  const [accountLoading, setAccountLoading] = React.useState(false);
  const [accountError, setAccountError] = React.useState<string | null>(null);
  const [accountSkipped, setAccountSkipped] = React.useState(false);
  const [accountCreated, setAccountCreated] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);

  // Calculate display values
  const isMonthly = amount?.isRecurring ?? false;
  const displayAmount = (amount?.amountCents ?? 0) / 100;
  const currency = 'USD';
  const cadenceSuffix = isMonthly ? '/month' : '';

  // Payment status based on payment method
  const isBankTransfer = paymentMethod === 'bank_transfer';

  const donationType =
    intent?.type === 'operation'
      ? 'Operational Support'
      : intent?.type === 'language'
        ? 'Language Support'
        : intent?.type === 'region'
          ? 'Region Support'
          : 'Unrestricted Donation';

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const validatePassword = (pwd: string): string | null => {
    if (!pwd || pwd.length < 10)
      return 'Password must be at least 10 characters.';
    if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd))
      return 'Use letters and numbers for stronger security.';
    return null;
  };

  const handleCreateAccount = async () => {
    const email = state.donor?.email;
    if (!email) {
      setAccountError('Email is required to create an account.');
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setAccountError(validationError);
      return;
    }

    setAccountError(null);
    setAccountLoading(true);

    try {
      await authService.signUp(email, password, {
        first_name: state.donor?.firstName,
        last_name: state.donor?.lastName,
      });

      // Account created successfully - show email confirmation message
      setAccountCreated(true);
      toast({
        title: 'Account created',
        description: 'Please check your email to confirm your account.',
        variant: 'success',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already registered/i.test(msg)) {
        // User already has an account - they can log in
        toast({
          title: 'Already registered',
          description: 'You can log in with your existing account.',
          variant: 'info',
        });
        setAccountSkipped(true);
        return;
      }
      if (/weak/i.test(msg)) {
        setAccountError(
          'Password is weak. Choose a longer password with letters and numbers.'
        );
        return;
      }
      setAccountError('Could not create account. Please try again.');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const email = state.donor?.email;
    if (!email) return;

    setResendLoading(true);
    try {
      await authService.resendConfirmationEmail(email);
      toast({
        title: 'Email sent',
        description:
          'Confirmation email has been resent. Please check your inbox.',
        variant: 'success',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({
        title: 'Error',
        description:
          msg || 'Could not resend confirmation email. Please try again.',
        variant: 'error',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSkipAccount = () => {
    setAccountSkipped(true);
  };

  // Show account creation unless user has skipped it
  // Note: customerId from Stripe doesn't mean they have an account in our system
  const showAccountCreation = !accountSkipped && state.donor?.email;

  return (
    <div className='space-y-6'>
      {/* Success Icon & Message */}
      <div className='flex flex-col items-center text-center space-y-3'>
        <div className='w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center'>
          <CheckCircle2 className='w-10 h-10 text-success-600 dark:text-success-400' />
        </div>
        <div>
          <h3 className='text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1'>
            {isBankTransfer
              ? 'Donation submitted!'
              : 'Thank you for your donation!'}
          </h3>
          <p className='text-sm text-neutral-600 dark:text-neutral-400'>
            {isBankTransfer
              ? "Your bank transfer is pending. We'll process your donation once we receive the funds (usually 1-3 business days)."
              : "Your generosity helps bring God's Word to every language."}
          </p>
          {isBankTransfer && (
            <p className='text-xs text-neutral-500 dark:text-neutral-500 mt-2'>
              You'll receive a confirmation email once the transfer is complete.
            </p>
          )}
        </div>
      </div>

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

        {selectedEntity && (
          <div className='flex justify-between text-sm'>
            <span className='text-neutral-600 dark:text-neutral-400'>
              {intent?.type === 'language'
                ? 'Language'
                : intent?.type === 'region'
                  ? 'Region'
                  : intent?.type === 'operation'
                    ? 'Operation'
                    : 'Entity'}
            </span>
            <span className='font-medium text-neutral-900 dark:text-neutral-100'>
              {selectedEntity.name}
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
            {isBankTransfer ? (
              <span className='text-yellow-600 dark:text-yellow-400'>
                Pending
              </span>
            ) : (
              <span className='text-success-600 dark:text-success-400'>
                Confirmed
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Account Creation Section */}
      {showAccountCreation && !accountCreated && (
        <div className='border-t border-neutral-200 dark:border-neutral-800 pt-6 space-y-4'>
          <div>
            <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1'>
              Create your account
            </h3>
            <p className='text-sm text-neutral-600 dark:text-neutral-400'>
              Create an account to track your donations and manage your
              sponsorships.
            </p>
          </div>

          <div className='space-y-3'>
            <Input
              type='password'
              placeholder='Password'
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {accountError && (
              <div className='text-sm text-error-600 dark:text-error-400'>
                {accountError}
              </div>
            )}
            <div className='flex gap-3'>
              <Button
                onClick={handleCreateAccount}
                loading={accountLoading}
                className='flex-1'
              >
                Create account
              </Button>
              <Button
                variant='ghost'
                onClick={handleSkipAccount}
                disabled={accountLoading}
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Confirmation Message */}
      {accountCreated && state.donor?.email && (
        <div className='border-t border-neutral-200 dark:border-neutral-800 pt-6 space-y-4'>
          <div className='text-center space-y-3'>
            <div className='w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto'>
              <svg
                className='w-6 h-6 text-primary-600 dark:text-primary-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                />
              </svg>
            </div>
            <div>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1'>
                Check your email
              </h3>
              <p className='text-sm text-neutral-600 dark:text-neutral-400'>
                We've sent a confirmation email to{' '}
                <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                  {state.donor.email}
                </span>
                . Click the link in the email to confirm your account and access
                your dashboard.
              </p>
            </div>
            <div className='flex flex-col gap-2'>
              <Button
                variant='outline'
                onClick={handleResendConfirmation}
                loading={resendLoading}
                className='w-full'
              >
                Resend confirmation email
              </Button>
              <p className='text-xs text-neutral-500 dark:text-neutral-500'>
                Didn't receive the email? Check your spam folder or click above
                to resend.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <div className='pt-2'>
          <Button variant='ghost' onClick={onClose} className='w-full'>
            Close
          </Button>
        </div>
      )}

      {/* Receipt email confirmation */}
      {state.donor?.email && (
        <div className='text-center pt-2'>
          <p className='text-xs text-neutral-600 dark:text-neutral-400'>
            A receipt has been sent to {state.donor.email}
          </p>
        </div>
      )}
    </div>
  );
};

export default StepThankYouAndAccount;
