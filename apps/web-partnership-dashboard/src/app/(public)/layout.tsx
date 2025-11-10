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

  return (
    <>
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
          isMapRoute ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {children}
      </main>
    </>
  );
}
