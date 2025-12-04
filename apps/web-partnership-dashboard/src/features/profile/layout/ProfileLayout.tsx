'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarNav, SidebarNavItem } from '@/shared/components/ui/Sidebar';
import { User, Lock, CreditCard } from 'lucide-react';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile/info',
    icon: <User className='h-5 w-5' />,
  },
  {
    id: 'reset-password',
    label: 'Reset Password',
    href: '/profile/reset-password',
    icon: <Lock className='h-5 w-5' />,
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    href: '/profile/subscriptions',
    icon: <CreditCard className='h-5 w-5' />,
  },
];

export const ProfileLayout: React.FC<ProfileLayoutProps> = ({ children }) => {
  const pathname = usePathname();

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='flex'>
        {/* Sidebar Navigation */}
        <aside className='w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'>
          <div className='sticky top-0 h-screen overflow-y-auto'>
            <div className='p-6 border-b border-neutral-200 dark:border-neutral-800'>
              <h2 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Account Settings
              </h2>
            </div>
            <nav className='p-4'>
              <SidebarNav>
                {tabs.map(tab => {
                  const isActive =
                    pathname === tab.href ||
                    (tab.id === 'profile' && pathname === '/profile');
                  return (
                    <SidebarNavItem
                      key={tab.id}
                      href={tab.href}
                      active={isActive}
                      icon={tab.icon}>
                      {tab.label}
                    </SidebarNavItem>
                  );
                })}
              </SidebarNav>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className='flex-1'>
          <div className='mx-auto max-w-4xl p-4 sm:p-6 lg:p-8'>{children}</div>
        </main>
      </div>
    </div>
  );
};
