'use client';

import { ProfileLayout } from '@/features/profile/layout/ProfileLayout';

export default function ProfileLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfileLayout>{children}</ProfileLayout>;
}
