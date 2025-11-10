export default function DashboardLoading() {
  return (
    <div className='flex items-center justify-center min-h-screen'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
        <p className='mt-4 text-sm text-neutral-600 dark:text-neutral-400'>
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}
