'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { usePartnerOrgMembers } from '../api/usePartnerOrgMembers';
import { TableRowSkeleton } from '@/shared/components/ui/Skeletons';

export const PartnerOrgMembersPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: members, isLoading } = usePartnerOrgMembers(orgId!);

  if (isLoading) {
    return <TableRowSkeleton count={5} columns={3} />;
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
    <div className='space-y-0'>
      {/* Table Header */}
      <div className='grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400'>
        <div>Name</div>
        <div>Email</div>
        <div>Role</div>
      </div>

      {/* Table Rows */}
      {members.map(member => (
        <div
          key={member.user_id}
          className='grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-4 border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors'>
          <div className='text-sm text-neutral-900 dark:text-neutral-100'>
            {member.user?.full_name ||
              `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() ||
              'Unknown'}
          </div>
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            {member.user?.email || '-'}
          </div>
          <div>
            <span className='text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'>
              {member.role?.name || 'No role'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
