'use client';

import { Suspense } from 'react';
import { LoginPage as LoginPageComponent } from '@/features/auth/pages/LoginPage';

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageComponent />
    </Suspense>
  );
}
