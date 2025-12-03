import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { EntityRoleSelector } from './EntityRoleSelector';
import type { UserRoleAssignment } from '../types';
import { Trash2, Plus, X } from 'lucide-react';

interface UserRolesTableProps {
  userId: string;
  roles: UserRoleAssignment[];
  onUpdate?: () => void;
}

export const UserRolesTable: React.FC<UserRolesTableProps> = ({
  userId,
  roles,
  onUpdate,
}) => {
  const [showAddRole, setShowAddRole] = useState(false);
  const [selectedContextType, setSelectedContextType] = useState<
    'team' | 'base' | 'project' | 'partner' | null
  >(null);
  const queryClient = useQueryClient();

  const removeRoleMutation = useMutation({
    mutationFn: (roleId: string) => usersApi.removeUserRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onUpdate?.();
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({
      roleId,
      contextType,
      contextId,
    }: {
      roleId: string;
      contextType: string | null;
      contextId: string | null;
    }) => usersApi.assignUserRole(userId, roleId, contextType, contextId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddRole(false);
      setSelectedContextType(null);
      onUpdate?.();
    },
  });

  const handleRemove = (roleId: string) => {
    if (confirm('Are you sure you want to remove this role assignment?')) {
      removeRoleMutation.mutate(roleId);
    }
  };

  const handleAssign = (entityId: string, roleId: string) => {
    assignRoleMutation.mutate({
      roleId,
      contextType: selectedContextType,
      contextId: entityId,
    });
  };

  // Group roles by context type
  const groupedRoles = roles.reduce(
    (acc, role) => {
      const contextType = role.context_type || 'global';
      if (!acc[contextType]) {
        acc[contextType] = [];
      }
      acc[contextType].push(role);
      return acc;
    },
    {} as Record<string, UserRoleAssignment[]>
  );

  const contextTypeLabels: Record<string, string> = {
    team: 'Teams',
    base: 'Bases',
    project: 'Projects',
    partner: 'Partner Orgs',
    global: 'Global',
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          Role Assignments
        </h3>
        {!showAddRole && (
          <button
            type='button'
            onClick={() => setShowAddRole(true)}
            className='px-3 py-1.5 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors flex items-center gap-2'
          >
            <Plus className='h-4 w-4' />
            Add Role
          </button>
        )}
      </div>

      {showAddRole && (
        <div className='p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50'>
          <div className='flex items-center justify-between mb-4'>
            <h4 className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
              Add Role Assignment
            </h4>
            <button
              type='button'
              onClick={() => {
                setShowAddRole(false);
                setSelectedContextType(null);
              }}
              className='p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          <div className='mb-4'>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
              Context Type
            </label>
            <select
              value={selectedContextType || ''}
              onChange={e =>
                setSelectedContextType(
                  e.target.value as
                    | 'team'
                    | 'base'
                    | 'project'
                    | 'partner'
                    | null
                )
              }
              className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100'
            >
              <option value=''>Select context type...</option>
              <option value='team'>Team</option>
              <option value='base'>Base</option>
              <option value='project'>Project</option>
              <option value='partner'>Partner Org</option>
            </select>
          </div>

          {selectedContextType && (
            <EntityRoleSelector
              contextType={selectedContextType}
              onAssign={handleAssign}
              onCancel={() => {
                setShowAddRole(false);
                setSelectedContextType(null);
              }}
            />
          )}
        </div>
      )}

      {Object.keys(groupedRoles).length === 0 && !showAddRole ? (
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          No role assignments yet.
        </p>
      ) : (
        <div className='space-y-4'>
          {Object.entries(groupedRoles).map(([contextType, contextRoles]) => (
            <div key={contextType}>
              <h4 className='text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                {contextTypeLabels[contextType] || contextType}
              </h4>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                  <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                    <tr>
                      <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                        Entity
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                        Role
                      </th>
                      <th className='px-4 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                    {contextRoles.map(role => (
                      <tr key={role.id}>
                        <td className='px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100'>
                          {role.entity_name || 'Global'}
                        </td>
                        <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                          {role.role.name}
                        </td>
                        <td className='px-4 py-2 text-right'>
                          <button
                            type='button'
                            onClick={() => handleRemove(role.id)}
                            className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
