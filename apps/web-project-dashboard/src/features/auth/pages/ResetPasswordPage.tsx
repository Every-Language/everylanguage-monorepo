import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../../shared/services/supabase';
import { authService } from '../services/auth';
import { Button, Input } from '../../../shared/design-system';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    mode: 'onBlur',
  });

  const password = watch('password');

  // Verify token from URL hash on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Check if we have a session (token was already processed)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // Token is valid, user can reset password
          setIsVerifyingToken(false);
          return;
        }

        // Check URL hash for access_token
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session with the tokens from URL
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          setIsVerifyingToken(false);
        } else {
          setTokenError(
            'Invalid or expired reset link. Please request a new password reset.'
          );
          setIsVerifyingToken(false);
        }
      } catch (error: unknown) {
        console.error('Token verification error:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Invalid or expired reset link. Please request a new password reset.';
        setTokenError(errorMessage);
        setIsVerifyingToken(false);
      }
    };

    verifyToken();
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      setGeneralError(null);

      // Update password
      await authService.updatePassword(data.password);

      setSuccessMessage(
        'Your password has been reset successfully. You can now sign in with your new password.'
      );

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: unknown) {
      console.error('Password reset error:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.';

      setGeneralError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifyingToken) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full'>
          <div className='bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto'></div>
              <p className='mt-4 text-sm text-neutral-600'>
                Verifying reset link...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full'>
          <div className='bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10'>
            <div className='text-center mb-8'>
              <h2 className='text-3xl font-bold text-neutral-900'>
                Invalid Reset Link
              </h2>
              <p className='mt-2 text-sm text-neutral-600'>{tokenError}</p>
            </div>

            <div className='space-y-4'>
              <Button
                onClick={() => navigate('/forgot-password')}
                className='w-full'
                size='lg'>
                Request New Reset Link
              </Button>
              <div className='text-center'>
                <Link
                  to='/login'
                  className='text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors'>
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full'>
        <div className='bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h2 className='text-3xl font-bold text-neutral-900'>
              Set New Password
            </h2>
            <p className='mt-2 text-sm text-neutral-600'>
              Enter your new password below
            </p>
          </div>

          {generalError && (
            <div className='mb-4 rounded-xl bg-error-50 border border-error-200 p-4'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <svg
                    className='h-5 w-5 text-error-600'
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
                  <h3 className='text-sm font-medium text-error-800'>Error</h3>
                  <div className='mt-1 text-sm text-error-700'>
                    <p>{generalError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className='mb-4 rounded-xl bg-success-50 border border-success-200 p-4'>
              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <svg
                    className='h-5 w-5 text-success-600'
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
                  <h3 className='text-sm font-medium text-success-800'>
                    Password Reset!
                  </h3>
                  <div className='mt-1 text-sm text-success-700'>
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
                  id='password'
                  type='password'
                  label='New Password'
                  placeholder='Enter your new password'
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
                        d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                      />
                    </svg>
                  }
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  error={errors.password?.message}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  id='confirmPassword'
                  type='password'
                  label='Confirm New Password'
                  placeholder='Confirm your new password'
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
                        d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                      />
                    </svg>
                  }
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value =>
                      value === password || 'Passwords do not match',
                  })}
                  error={errors.confirmPassword?.message}
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
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          )}

          <div className='mt-6 text-center'>
            <Link
              to='/login'
              className='text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors'>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
