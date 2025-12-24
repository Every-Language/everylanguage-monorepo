'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/info');
  }, [router]);

  return null;
}
