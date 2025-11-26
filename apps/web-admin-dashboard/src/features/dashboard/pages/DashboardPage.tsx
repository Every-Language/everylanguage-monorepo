import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.fetchDashboardStats(),
  });

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Dashboard
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          Overview of system metrics and recent activity
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 p-6'>
          <div className='text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1'>
            Active Projects
          </div>
          <div className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            {isLoading ? '--' : (stats?.activeProjectsCount ?? 0)}
          </div>
          <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-2'>
            {isLoading ? 'Loading...' : 'Projects currently active'}
          </div>
        </div>

        <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 p-6'>
          <div className='text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1'>
            Languages Pending Funding
          </div>
          <div className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            {isLoading ? '--' : (stats?.languagesPendingFundingCount ?? 0)}
          </div>
          <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-2'>
            {isLoading
              ? 'Loading...'
              : 'Languages available but not fully funded'}
          </div>
        </div>

        <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 p-6'>
          <div className='text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1'>
            Donations Pending Allocation
          </div>
          <div className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            {isLoading ? '--' : (stats?.donationsPendingAllocationCount ?? 0)}
          </div>
          <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-2'>
            {isLoading
              ? 'Loading...'
              : 'Completed donations with unallocated funds'}
          </div>
        </div>
      </div>
    </div>
  );
}
