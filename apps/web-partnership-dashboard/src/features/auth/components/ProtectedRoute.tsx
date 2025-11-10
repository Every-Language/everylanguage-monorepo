'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { hasRequiredRole } from '../utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  fallbackPath = '/login',
  requireAuth = true,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if authentication is required and user is not authenticated
    if (!loading && requireAuth && !user) {
      // Redirect to login with the current location for return after login
      const redirectUrl = `${fallbackPath}?redirectTo=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
    }

    // Check role-based access if roles are specified
    if (!loading && requiredRoles.length > 0 && user) {
      const userHasRole = hasRequiredRole(user, requiredRoles);

      if (!userHasRole) {
        // Redirect to unauthorized page
        router.push('/unauthorized');
      }
    }
  }, [
    user,
    loading,
    requireAuth,
    requiredRoles,
    router,
    pathname,
    fallbackPath,
  ]);

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
          <p className='mt-4 text-sm text-neutral-600 dark:text-neutral-400'>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Don't render children while redirecting
  if (requireAuth && !user) {
    return null;
  }

  // Don't render children if user lacks required roles
  if (
    requiredRoles.length > 0 &&
    user &&
    !hasRequiredRole(user, requiredRoles)
  ) {
    return null;
  }

  // User is authenticated and has required roles, render children
  return <>{children}</>;
};
