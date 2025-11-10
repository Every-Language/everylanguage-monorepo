'use client';

export default function MapError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className='flex items-center justify-center h-screen'>
      <div className='p-8 text-center'>
        <h2 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
          Failed to load map
        </h2>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          {error.message}
        </p>
        <button
          onClick={reset}
          className='mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700'
        >
          Retry
        </button>
      </div>
    </div>
  );
}
