'use client';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DonateSuccessPage() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='text-center max-w-md'>
        <div className='mb-6'>
          <svg
            className='mx-auto h-16 w-16 text-green-600'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
        </div>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4'>
          Thank You!
        </h1>
        <p className='text-lg text-neutral-600 dark:text-neutral-400 mb-6'>
          Your donation has been received. You will receive a confirmation email
          shortly.
        </p>
        <Link
          href='/map'
          className='inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700'
        >
          Return to Map
        </Link>
      </div>
    </div>
  );
}
