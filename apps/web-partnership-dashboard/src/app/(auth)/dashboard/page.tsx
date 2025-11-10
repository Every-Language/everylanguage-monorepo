'use client';

import { DashboardLandingPage } from '@/features/dashboard/pages/DashboardLandingPage';

// Force dynamic rendering (no caching for user-specific data)
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <DashboardLandingPage />;
}
