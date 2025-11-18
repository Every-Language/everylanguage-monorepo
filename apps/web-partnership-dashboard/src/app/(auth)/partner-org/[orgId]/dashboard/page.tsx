'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PartnerOrgOverviewPage } from '@/features/partnerorgs/pages/PartnerOrgOverviewPage';

export const dynamic = 'force-dynamic';

export default function PartnerOrgDashboard() {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();

  useEffect(() => {
    // Redirect to new overview route
    router.replace(`/partner-org/${params.orgId}`);
  }, [router, params.orgId]);

  // Show overview page while redirecting
  return <PartnerOrgOverviewPage />;
}
