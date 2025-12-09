'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { authService } from '../services/auth';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

interface ForgotPasswordFormData {
  email: string;
}

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordFormData>({
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setGeneralError(null);
      setSuccessMessage(null);

      await authService.resetPassword(data.email);

      setSuccessMessage(
        'Password reset instructions have been sent to your email address. Please check your inbox and follow the instructions to reset your password.'
      );
    } catch (error: unknown) {
      console.error('Password reset error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';

      // Check if it's a field-specific error
      if (errorMessage.toLowerCase().includes('email')) {
        setError('email', {
          type: 'manual',
          message: errorMessage,
        });
      } else {
        setGeneralError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8 transition-theme'>
      <div className='max-w-md w-full'>
        {/* Forgot Password Form */}
        <div className='bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h2 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
              Reset your password
            </h2>
            <p className='mt-2 text-sm text-neutral-600 dark:text-neutral-400'>
              Enter your email address and we'll send you instructions to reset
              your password
            </p>
          </div>
          {generalError && (
            <div className='mb-4 rounded-xl bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 p-4'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <svg
                    className='h-5 w-5 text-error-600 dark:text-error-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-error-800 dark:text-error-200'>
                    Error
                  </h3>
                  <div className='mt-1 text-sm text-error-700 dark:text-error-300'>
                    <p>{generalError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className='mb-4 rounded-xl bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-700 p-4'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <svg
                    className='h-5 w-5 text-success-600 dark:text-success-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-success-800 dark:text-success-100'>
                    Email Sent!
                  </h3>
                  <div className='mt-1 text-sm text-success-700 dark:text-success-100'>
                    <p>{successMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
              <div>
                <Input
                  id='email'
                  type='email'
                  label='Email address'
                  placeholder='Enter your email address'
                  variant='filled'
                  size='lg'
                  leftIcon={
                    <svg
                      className='h-5 w-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'
                      />
                    </svg>
                  }
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  error={errors.email?.message}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Button
                  type='submit'
                  className='w-full'
                  disabled={isLoading}
                  size='lg'
                  loading={isLoading}>
                  {isLoading ? 'Sending...' : 'Send reset instructions'}
                </Button>
              </div>
            </form>
          )}

          <div className='mt-6 text-center space-y-2'>
            <p className='text-sm text-neutral-600 dark:text-neutral-400'>
              Remember your password?{' '}
              <Link
                href='/login'
                className='font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors'>
                Sign in
              </Link>
            </p>
            <p className='text-sm text-neutral-600 dark:text-neutral-400'>
              Don't have an account?{' '}
              <Link
                href='/register'
                className='font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors'>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
