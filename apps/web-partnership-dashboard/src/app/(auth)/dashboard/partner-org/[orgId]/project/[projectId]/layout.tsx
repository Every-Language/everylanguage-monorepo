'use client';

import { ProjectLayout as ProjectLayoutComponent } from '@/features/partnerorgs/layout/ProjectLayout';

export const dynamic = 'force-dynamic';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProjectLayoutComponent>{children}</ProjectLayoutComponent>;
}
