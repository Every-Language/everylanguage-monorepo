'use client';

import { Suspense } from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
import { MobileAppHeader } from '@/shared/components/MobileAppHeader';

export const dynamic = 'force-dynamic';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

      <main className='relative h-[calc(100dvh-56px)] overflow-y-auto'>
        {children}
      </main>
    </>
  );
}
