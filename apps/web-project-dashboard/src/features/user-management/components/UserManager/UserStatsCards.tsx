import React from 'react';
import {
  Card,
  CardContent,
  LoadingSpinner,
} from '../../../../shared/design-system';
import {
  UserIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface UserStatsCardsProps {
  statistics: {
    totalUsers: number;
    activeUsers: number;
    pendingInvites: number;
    availableRoles: number;
  };
  isLoading: boolean;
}

export const UserStatsCards: React.FC<UserStatsCardsProps> = ({
  statistics,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className='p-4 flex items-center justify-center min-h-[100px]'>
              <LoadingSpinner size='sm' />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: statistics.totalUsers,
      icon: UserIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Active Users',
      value: statistics.activeUsers,
      icon: ShieldCheckIcon,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Pending Invites',
      value: statistics.pendingInvites,
      icon: EnvelopeIcon,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Available Roles',
      value: statistics.availableRoles,
      icon: UserGroupIcon,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
      {stats.map(stat => (
        <Card key={stat.label}>
          <CardContent className='p-4 flex flex-col items-center justify-center text-center min-h-[100px]'>
            <div className={`p-2 rounded-full ${stat.bgColor} mb-2`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className='text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-0.5'>
              {stat.label}
            </p>
            <p className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
              {stat.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
