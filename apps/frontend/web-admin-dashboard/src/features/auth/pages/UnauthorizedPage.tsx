import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full text-center space-y-8'>
        <div>
          <h2 className='mt-6 text-3xl font-extrabold text-neutral-900'>
            Access Denied
          </h2>
          <p className='mt-2 text-base text-neutral-600'>
            You do not have the required system administrator permissions to
            access this dashboard.
          </p>
          <p className='mt-4 text-sm text-neutral-500'>
            Please contact your system administrator if you believe you should
            have access.
          </p>
        </div>
        <div className='mt-6'>
          <button
            onClick={() => navigate('/login')}
            className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
