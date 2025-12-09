'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/features/auth';
import { AppHeader } from '@/shared/components/AppHeader';
import { MobileAppHeader } from '@/shared/components/MobileAppHeader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const requiresAuth = pathname !== '/dashboard';
  const isProfileRoute = pathname?.startsWith('/profile') ?? false;

  return (
    <ProtectedRoute requireAuth={requiresAuth}>
      {/* Mobile header (visible below md breakpoint) */}
      <div className='md:hidden'>
        <Suspense fallback={<div className='h-14' />}>
          <MobileAppHeader />
        </Suspense>
      </div>

      {/* Desktop header (visible at md breakpoint and above) */}
      <div className='hidden md:block'>
        <Suspense fallback={<div className='h-14' />}>
          <AppHeader />
        </Suspense>
      </div>

      <main
        className={`relative h-[calc(100dvh-56px)] ${
          isProfileRoute ? '' : 'overflow-y-auto'
        }`}>
        {children}
      </main>
    </ProtectedRoute>
  );
}
