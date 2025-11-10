'use client';

import { Suspense } from 'react';
import { DonatePage as DonatePageComponent } from '@/features/funding/pages/DonatePage';

export function DonateClientPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DonatePageComponent />
    </Suspense>
  );
}
