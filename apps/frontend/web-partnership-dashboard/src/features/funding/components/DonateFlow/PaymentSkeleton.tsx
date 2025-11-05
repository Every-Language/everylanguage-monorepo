import React from 'react';

export const PaymentSkeleton: React.FC = () => {
  return (
    <div className='space-y-4 animate-pulse'>
      {/* Card Number skeleton with floating label */}
      <div className='relative'>
        <div className='bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1'>
          <div className='h-11 bg-neutral-200 dark:bg-neutral-800 rounded' />
        </div>
        <label className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600 dark:text-neutral-400 pointer-events-none'>
          Card number
        </label>
      </div>

      {/* Expiration and CVC skeletons in grid with floating labels */}
      <div className='grid grid-cols-2 gap-4'>
        <div className='relative'>
          <div className='bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1'>
            <div className='h-11 bg-neutral-200 dark:bg-neutral-800 rounded' />
          </div>
          <label className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600 dark:text-neutral-400 pointer-events-none'>
            Expiration
          </label>
        </div>
        <div className='relative'>
          <div className='bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1'>
            <div className='h-11 bg-neutral-200 dark:bg-neutral-800 rounded' />
          </div>
          <label className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-600 dark:text-neutral-400 pointer-events-none'>
            CVC
          </label>
        </div>
      </div>

      {/* Cover transaction costs toggle skeleton */}
      <div className='flex items-center justify-between py-1'>
        <div className='h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-40' />
        <div className='w-10 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full' />
      </div>

      {/* Loading message */}
      <div className='flex items-center justify-center gap-2 py-2'>
        <div
          className='w-2 h-2 bg-primary-500 rounded-full animate-bounce'
          style={{ animationDelay: '0ms' }}
        />
        <div
          className='w-2 h-2 bg-primary-500 rounded-full animate-bounce'
          style={{ animationDelay: '150ms' }}
        />
        <div
          className='w-2 h-2 bg-primary-500 rounded-full animate-bounce'
          style={{ animationDelay: '300ms' }}
        />
        <span className='text-sm text-neutral-600 dark:text-neutral-400 ml-2'>
          Preparing secure payment...
        </span>
      </div>
    </div>
  );
};

export default PaymentSkeleton;
