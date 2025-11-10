'use client';

import { ProtectedRoute } from '@/features/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
