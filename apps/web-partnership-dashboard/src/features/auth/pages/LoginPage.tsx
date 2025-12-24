'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '../components/LoginForm';
import { PhoneLoginForm } from '../components/PhoneLoginForm';

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  const handleLoginSuccess = () => {
    const next = searchParams.get('next') || '/dashboard';
    router.push(next);
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleSignUpRedirect = () => {
    router.push('/register');
  };

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4 transition-theme'>
      {/* Main Content */}
      <div className='w-full max-w-md'>
        {/* Login Card */}
        <div className='bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-8'>
          {/* Header */}
          <div className='text-center mb-8'>
            <div className='flex items-center justify-center mb-4'>
              <div className='text-left'>
                <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
                  Log in to Every Language
                </h1>
              </div>
            </div>
          </div>

          {/* Method Selection Tabs */}
          <div className='flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 mb-6'>
            <button
              type='button'
              onClick={() => setLoginMethod('email')}
              className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                loginMethod === 'email'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}>
              Email
            </button>
            <button
              type='button'
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                loginMethod === 'phone'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}>
              Phone
            </button>
          </div>

          {loginMethod === 'phone' ? (
            <PhoneLoginForm onSuccess={handleLoginSuccess} />
          ) : (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onForgotPassword={handleForgotPassword}
              onSignUpRedirect={handleSignUpRedirect}
            />
          )}

          <div className='mt-6 text-center'>
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
