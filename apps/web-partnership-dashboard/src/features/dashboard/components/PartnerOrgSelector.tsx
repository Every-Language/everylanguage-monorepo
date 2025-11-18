'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { useUserPartnerOrgs } from '../hooks/useUserPartnerOrgs';

interface PartnerOrgSelectorProps {
  currentOrgId?: string;
  className?: string;
}

export const PartnerOrgSelector: React.FC<PartnerOrgSelectorProps> = ({
  currentOrgId,
  className = '',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { partnerOrgs, isLoading } = useUserPartnerOrgs(user?.id ?? null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'global') {
      router.push('/dashboard/global-statistics');
    } else if (value && value !== '') {
      router.push(`/partner-org/${encodeURIComponent(value)}`);
    }
  };

  // Determine current value
  const currentValue = React.useMemo(() => {
    if (pathname?.startsWith('/dashboard/global-statistics')) {
      return 'global';
    }
    if (currentOrgId) {
      return currentOrgId;
    }
    // Try to extract from pathname
    const match = pathname?.match(/\/partner-org\/([^/]+)/);
    return match ? match[1] : '';
  }, [pathname, currentOrgId]);

  return (
    <div className={className}>
      <label
        htmlFor='partner-org-selector'
        className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'
      >
        Partner Organization
      </label>
      <select
        id='partner-org-selector'
        value={currentValue}
        onChange={handleChange}
        disabled={isLoading}
        className='block w-full rounded-md border-neutral-300 dark:border-neutral-700 shadow-sm focus:border-accent-500 focus:ring-accent-500 dark:bg-neutral-800 dark:text-neutral-100 sm:text-sm'
      >
        <option value=''>Select an organization...</option>
        <option value='global'>Global translation statistics</option>
        {partnerOrgs.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
            {org.isPersonal ? ' (Personal)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
