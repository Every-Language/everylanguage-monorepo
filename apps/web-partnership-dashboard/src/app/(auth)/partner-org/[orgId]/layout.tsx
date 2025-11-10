'use client';

import { PartnerOrgLayout as PartnerOrgLayoutComponent } from '@/features/partnerorgs/layout/PartnerOrgLayout';

export const dynamic = 'force-dynamic';

export default function PartnerOrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PartnerOrgLayoutComponent>{children}</PartnerOrgLayoutComponent>;
}
