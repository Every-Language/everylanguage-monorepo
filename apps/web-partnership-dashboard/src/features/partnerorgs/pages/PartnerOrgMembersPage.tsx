'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { usePartnerOrgMembers } from '../hooks/usePartnerOrgMembers';

export const PartnerOrgMembersPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: members, isLoading } = usePartnerOrgMembers(orgId!);

  if (isLoading) {
    return <div className='text-neutral-500'>Loading members...</div>;
  }

  if (!members || members.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No members found for this partner organization
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {members.map(member => {
              const userName =
                member.user?.full_name ||
                `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() ||
                member.user?.email ||
                'Unknown User';

              return (
                <div
                  key={member.user_id}
                  className='flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg'
                >
                  <div>
                    <div className='font-medium'>{userName}</div>
                    {member.user?.email && (
                      <div className='text-sm text-neutral-500'>
                        {member.user.email}
                      </div>
                    )}
                  </div>
                  <div className='text-right'>
                    <div className='text-sm font-medium'>
                      {member.role?.name || 'No Role'}
                    </div>
                    {member.role?.role_key && (
                      <div className='text-xs text-neutral-500'>
                        {member.role.role_key}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
