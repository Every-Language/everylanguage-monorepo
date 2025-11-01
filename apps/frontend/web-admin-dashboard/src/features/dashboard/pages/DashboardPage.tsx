export function DashboardPage() {
  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900'>Dashboard</h1>
        <p className='mt-2 text-neutral-600'>
          Overview of system metrics and recent activity
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='text-sm font-medium text-neutral-500 mb-1'>
            Total Languages
          </div>
          <div className='text-3xl font-bold text-neutral-900'>--</div>
          <div className='text-xs text-neutral-500 mt-2'>Loading...</div>
        </div>

        <div className='bg-white rounded-lg shadow p-6'>
          <div className='text-sm font-medium text-neutral-500 mb-1'>
            Total Regions
          </div>
          <div className='text-3xl font-bold text-neutral-900'>--</div>
          <div className='text-xs text-neutral-500 mt-2'>Loading...</div>
        </div>

        <div className='bg-white rounded-lg shadow p-6'>
          <div className='text-sm font-medium text-neutral-500 mb-1'>
            Active Sponsorships
          </div>
          <div className='text-3xl font-bold text-neutral-900'>--</div>
          <div className='text-xs text-neutral-500 mt-2'>Loading...</div>
        </div>

        <div className='bg-white rounded-lg shadow p-6'>
          <div className='text-sm font-medium text-neutral-500 mb-1'>
            Pending Allocations
          </div>
          <div className='text-3xl font-bold text-neutral-900'>--</div>
          <div className='text-xs text-neutral-500 mt-2'>Loading...</div>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-lg font-semibold text-neutral-900 mb-4'>
          Quick Actions
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <a
            href='/languages'
            className='p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors'
          >
            <h3 className='font-medium text-neutral-900'>Manage Languages</h3>
            <p className='text-sm text-neutral-600 mt-1'>
              View and edit language entities
            </p>
          </a>

          <a
            href='/regions'
            className='p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors'
          >
            <h3 className='font-medium text-neutral-900'>Manage Regions</h3>
            <p className='text-sm text-neutral-600 mt-1'>
              View and edit regional data
            </p>
          </a>

          <a
            href='/sponsorships/allocate'
            className='p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors'
          >
            <h3 className='font-medium text-neutral-900'>
              Allocate Sponsorships
            </h3>
            <p className='text-sm text-neutral-600 mt-1'>
              Assign sponsorships to projects
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
