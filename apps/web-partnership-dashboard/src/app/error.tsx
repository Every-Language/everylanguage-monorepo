'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className='flex min-h-screen items-center justify-center'>
          <div className='text-center'>
            <h2 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
              Something went wrong!
            </h2>
            <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
              {error.message}
            </p>
            <button
              onClick={reset}
              className='mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700'
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
