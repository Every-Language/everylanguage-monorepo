import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { Trash2, Edit, Search } from 'lucide-react';

interface PartnerOrgAssignment {
  id: string;
  partner_org_id: string;
  partner_org_name: string;
  is_public: boolean;
}

interface EntityPartnerOrgAssignmentsProps {
  assignments: PartnerOrgAssignment[];
  onUpdate?: () => void;
  onAssign: (partnerOrgId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
  onPartnerOrgClick?: (partnerOrgId: string) => void;
}

export const EntityPartnerOrgAssignments: React.FC<
  EntityPartnerOrgAssignmentsProps
> = ({ assignments, onUpdate, onAssign, onRemove, onPartnerOrgClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [partnerOrgSearch, setPartnerOrgSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedPartnerOrgId, setSelectedPartnerOrgId] = useState('');
  const queryClient = useQueryClient();

  const { data: searchedPartnerOrgs = [] } = useQuery({
    queryKey: ['search-partner-orgs', partnerOrgSearch],
    queryFn: () => usersApi.searchPartnerOrgs(partnerOrgSearch, 10),
    enabled: isEditing && partnerOrgSearch.length >= 2,
  });

  const assignMutation = useMutation({
    mutationFn: (partnerOrgId: string) => onAssign(partnerOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-orgs'] });
      setPartnerOrgSearch('');
      setSelectedPartnerOrgId('');
      onUpdate?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => onRemove(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-orgs'] });
      onUpdate?.();
    },
  });

  const handlePartnerOrgSelect = (partnerOrgId: string) => {
    setSelectedPartnerOrgId(partnerOrgId);
    assignMutation.mutate(partnerOrgId);
  };

  const handleRemove = (assignmentId: string) => {
    if (
      confirm('Are you sure you want to unassign this partner organization?')
    ) {
      removeMutation.mutate(assignmentId);
    }
  };

  const assignedPartnerOrgIds = assignments.map(a => a.partner_org_id);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          Partner Organizations
        </h3>
        {!isEditing && (
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
            <Edit className='h-4 w-4' />
            Edit
          </button>
        )}
        {isEditing && (
          <div className='relative'>
            <div className='flex items-center gap-2'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 z-10' />
              <input
                type='text'
                placeholder='Search partner orgs...'
                value={partnerOrgSearch}
                onChange={e => setPartnerOrgSearch(e.target.value)}
                className='pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm w-64'
              />
            </div>
            {partnerOrgSearch && searchedPartnerOrgs.length > 0 && (
              <div className='absolute z-20 mt-1 max-h-60 w-64 overflow-auto border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 shadow-lg'>
                {searchedPartnerOrgs
                  .filter(org => !assignedPartnerOrgIds.includes(org.id))
                  .map(org => (
                    <button
                      key={org.id}
                      onClick={() => handlePartnerOrgSelect(org.id)}
                      className='w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm'>
                      {org.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          No partner organizations assigned yet.
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
            <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
              <tr>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  Name
                </th>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  Is Public
                </th>
                {isEditing && (
                  <th className='px-4 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td className='px-4 py-2 text-sm'>
                    {onPartnerOrgClick ? (
                      <button
                        type='button'
                        onClick={() =>
                          onPartnerOrgClick(assignment.partner_org_id)
                        }
                        className='text-primary-600 dark:text-primary-400 hover:underline font-medium text-left'>
                        {assignment.partner_org_name}
                      </button>
                    ) : (
                      <span className='text-neutral-900 dark:text-neutral-100'>
                        {assignment.partner_org_name}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                    {assignment.is_public ? 'Yes' : 'No'}
                  </td>
                  {isEditing && (
                    <td className='px-4 py-2 text-right'>
                      <button
                        type='button'
                        onClick={() => handleRemove(assignment.id)}
                        className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                        title='Unassign partner org'>
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditing && (
        <div className='flex gap-2 pt-2'>
          <button
            type='button'
            onClick={() => {
              setIsEditing(false);
              setPartnerOrgSearch('');
              setSelectedPartnerOrgId('');
            }}
            className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
