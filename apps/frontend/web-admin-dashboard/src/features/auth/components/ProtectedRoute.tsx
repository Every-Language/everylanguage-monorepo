import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isSystemAdmin } from '../utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-neutral-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
          <p className='mt-4 text-sm text-neutral-600'>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    // Redirect to login with the current location for return after login
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Check if user has system.admin permission
  if (!isSystemAdmin(user)) {
    // Redirect to unauthorized page
    return <Navigate to='/unauthorized' state={{ from: location }} replace />;
  }

  // User is authenticated and has system.admin permission
  return <>{children}</>;
};
