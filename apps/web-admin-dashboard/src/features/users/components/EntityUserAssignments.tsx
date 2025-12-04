import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { UserSelector } from './UserSelector';
import type { UserRoleAssignment, ResourceType } from '../types';
import { Trash2, Plus, Edit } from 'lucide-react';

interface EntityUserAssignmentsProps {
  entityId: string;
  resourceType: ResourceType;
  assignments: UserRoleAssignment[];
  onUpdate?: () => void;
  onAssign: (userId: string, roleId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
  onUserClick?: (userId: string) => void;
}

export const EntityUserAssignments: React.FC<EntityUserAssignmentsProps> = ({
  entityId: _entityId, // eslint-disable-line @typescript-eslint/no-unused-vars
  resourceType,
  assignments,
  onUpdate,
  onAssign,
  onRemove,
  onUserClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', resourceType],
    queryFn: () => usersApi.fetchRolesByResourceType(resourceType),
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      onAssign(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowUserSelector(false);
      setSelectedUserId('');
      setSelectedUserName('');
      setSelectedRoleId('');
      onUpdate?.();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      assignmentId,
      roleId,
    }: {
      assignmentId: string;
      roleId: string;
    }) =>
      onAssign(
        assignments.find(a => a.id === assignmentId)?.user_id || '',
        roleId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onUpdate?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => onRemove(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onUpdate?.();
    },
  });

  const handleUserSelected = async (userId: string, userName?: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName || 'User');
    setShowUserSelector(false);
    // Fetch user details if name not provided
    if (!userName) {
      try {
        const user = await usersApi.fetchUserById(userId);
        if (user) {
          const name =
            user.first_name || user.last_name
              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
              : user.email || 'User';
          setSelectedUserName(name);
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    }
  };

  const handleAssign = () => {
    if (selectedUserId && selectedRoleId) {
      assignMutation.mutate({ userId: selectedUserId, roleId: selectedRoleId });
    }
  };

  const handleUpdateRole = (assignmentId: string, roleId: string) => {
    if (
      roleId &&
      roleId !== assignments.find(a => a.id === assignmentId)?.role_id
    ) {
      updateRoleMutation.mutate({ assignmentId, roleId });
    }
  };

  const handleRemove = (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this user assignment?')) {
      removeMutation.mutate(assignmentId);
    }
  };

  const assignedUserIds = assignments.map(a => a.user_id);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          User Assignments
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
          <button
            type='button'
            onClick={() => setShowUserSelector(true)}
            className='px-3 py-1.5 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors flex items-center gap-2'>
            <Plus className='h-4 w-4' />
            Assign User
          </button>
        )}
      </div>

      {/* User Selector Modal */}
      <UserSelector
        isOpen={showUserSelector}
        onClose={() => {
          setShowUserSelector(false);
        }}
        onSelect={handleUserSelected}
        excludeUserIds={assignedUserIds}
      />

      {/* Role Selection for Selected User */}
      {selectedUserId &&
        !assignments.find(a => a.user_id === selectedUserId) && (
          <div className='p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                  Select Role for {selectedUserName}
                </label>
                <Select
                  value={selectedRoleId}
                  onValueChange={setSelectedRoleId}
                  placeholder='Select a role...'>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={handleAssign}
                  disabled={!selectedRoleId || assignMutation.isPending}
                  className='px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setSelectedUserId('');
                    setSelectedUserName('');
                    setSelectedRoleId('');
                  }}
                  className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {assignments.length === 0 && !selectedUserId ? (
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          No user assignments yet.
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
                  Email
                </th>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  Role
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
                    {onUserClick ? (
                      <button
                        type='button'
                        onClick={() => onUserClick(assignment.user_id)}
                        className='text-primary-600 dark:text-primary-400 hover:underline font-medium text-left'>
                        {assignment.user_name ||
                          assignment.entity_name ||
                          'Unknown'}
                      </button>
                    ) : (
                      <span className='text-neutral-900 dark:text-neutral-100'>
                        {assignment.user_name ||
                          assignment.entity_name ||
                          'Unknown'}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                    {assignment.user_email || '—'}
                  </td>
                  <td className='px-4 py-2 text-sm'>
                    {isEditing ? (
                      <Select
                        value={assignment.role_id}
                        onValueChange={roleId => {
                          handleUpdateRole(assignment.id, roleId);
                        }}>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </Select>
                    ) : (
                      <span className='text-neutral-500 dark:text-neutral-400'>
                        {assignment.role.name}
                      </span>
                    )}
                  </td>
                  {isEditing && (
                    <td className='px-4 py-2 text-right'>
                      <button
                        type='button'
                        onClick={() => {
                          if (!assignment.id) {
                            alert(
                              'Cannot remove: Assignment ID not available. Please refresh and try again.'
                            );
                            return;
                          }
                          if (
                            confirm(
                              'Are you sure you want to remove this user assignment?'
                            )
                          ) {
                            handleRemove(assignment.id);
                          }
                        }}
                        disabled={!assignment.id}
                        className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                        title={
                          assignment.id
                            ? 'Remove user'
                            : 'Cannot remove: ID missing'
                        }>
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
              setSelectedUserId('');
              setSelectedUserName('');
              setSelectedRoleId('');
            }}
            className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
