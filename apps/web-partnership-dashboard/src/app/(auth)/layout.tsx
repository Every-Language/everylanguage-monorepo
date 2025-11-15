'use client';

import { Suspense } from 'react';
import { ProtectedRoute } from '@/features/auth';
import { AppHeader } from '@/shared/components/AppHeader';
import { MobileAppHeader } from '@/shared/components/MobileAppHeader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
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

      <main className='relative h-[calc(100dvh-56px)] overflow-y-auto'>
        {children}
      </main>
    </ProtectedRoute>
  );
}
