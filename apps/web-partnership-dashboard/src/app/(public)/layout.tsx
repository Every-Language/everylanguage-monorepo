'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@/shared/components/AppHeader';
import { MobileAppHeader } from '@/shared/components/MobileAppHeader';

export const dynamic = 'force-dynamic';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMapRoute = pathname?.startsWith('/map') ?? false;
  const isDonateRoute = pathname?.startsWith('/donate') ?? false;

  return (
    <>
      {/* Mobile header (visible below md breakpoint, hidden on donate route) */}
      {!isDonateRoute && (
        <div className='md:hidden'>
          <Suspense fallback={<div className='h-14' />}>
            <MobileAppHeader />
          </Suspense>
        </div>
      )}

      {/* Desktop header (visible at md breakpoint and above, hidden on donate route) */}
      {!isDonateRoute && (
        <div className='hidden md:block'>
          <Suspense fallback={<div className='h-14' />}>
            <AppHeader />
          </Suspense>
        </div>
      )}

      <main
        className={`relative ${isDonateRoute ? 'min-h-screen' : 'h-[calc(100dvh-56px)]'} ${
          isMapRoute ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {children}
      </main>
    </>
  );
}
