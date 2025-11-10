import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-neutral-900 dark:text-neutral-100'>
          404
        </h1>
        <p className='mt-4 text-xl text-neutral-600 dark:text-neutral-400'>
          Page not found
        </p>
        <Link
          href='/'
          className='mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700'
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
