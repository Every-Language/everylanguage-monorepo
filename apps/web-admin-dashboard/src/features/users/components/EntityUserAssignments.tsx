import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { Input, Select, SelectItem } from '@everylanguage/shared-ui';
import type { UserRoleAssignment, ResourceType } from '../types';
import { Trash2, Plus, X } from 'lucide-react';

interface EntityUserAssignmentsProps {
  entityId: string;
  resourceType: ResourceType;
  assignments: UserRoleAssignment[];
  onUpdate?: () => void;
  onAssign: (userId: string, roleId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
}

export const EntityUserAssignments: React.FC<EntityUserAssignmentsProps> = ({
  resourceType,
  assignments,
  onUpdate,
  onAssign,
  onRemove,
}) => {
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['search-users', debouncedQuery],
    queryFn: () => usersApi.searchUsers(debouncedQuery, 10),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', resourceType],
    queryFn: () => usersApi.fetchRolesByResourceType(resourceType),
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      onAssign(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddUser(false);
      setSearchQuery('');
      setSelectedUserId('');
      setSelectedRoleId('');
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

  const handleSelectUser = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSearchQuery(userName);
    setShowResults(false);
  };

  const handleAssign = () => {
    if (selectedUserId && selectedRoleId) {
      assignMutation.mutate({ userId: selectedUserId, roleId: selectedRoleId });
    }
  };

  const handleRemove = (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this user assignment?')) {
      removeMutation.mutate(assignmentId);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          User Assignments
        </h3>
        {!showAddUser && (
          <button
            type='button'
            onClick={() => setShowAddUser(true)}
            className='px-3 py-1.5 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors flex items-center gap-2'
          >
            <Plus className='h-4 w-4' />
            Assign User
          </button>
        )}
      </div>

      {showAddUser && (
        <div className='p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50'>
          <div className='flex items-center justify-between mb-4'>
            <h4 className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
              Assign User
            </h4>
            <button
              type='button'
              onClick={() => {
                setShowAddUser(false);
                setSearchQuery('');
                setSelectedUserId('');
                setSelectedRoleId('');
              }}
              className='p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                Search User
              </label>
              <div className='relative'>
                <Input
                  placeholder='Search by name or email...'
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                    if (!e.target.value) {
                      setSelectedUserId('');
                    }
                  }}
                  onFocus={() =>
                    searchResults.length > 0 && setShowResults(true)
                  }
                />
                {searching && (
                  <div className='absolute right-3 top-3 text-xs text-neutral-500'>
                    Searching...
                  </div>
                )}

                {showResults &&
                  searchResults.length > 0 &&
                  debouncedQuery.length >= 2 && (
                    <div className='absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                      {searchResults.map(user => (
                        <button
                          key={user.id}
                          type='button'
                          onClick={() => handleSelectUser(user.id, user.name)}
                          className='w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0'
                        >
                          <div className='font-medium text-sm'>{user.name}</div>
                          {user.description && (
                            <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-1'>
                              {user.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {selectedUserId && (
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                  Select Role
                </label>
                <Select
                  value={selectedRoleId}
                  onValueChange={setSelectedRoleId}
                  placeholder='Select a role...'
                >
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}

            <div className='flex gap-2'>
              <button
                type='button'
                onClick={handleAssign}
                disabled={!selectedUserId || !selectedRoleId}
                className='px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Assign
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowAddUser(false);
                  setSearchQuery('');
                  setSelectedUserId('');
                  setSelectedRoleId('');
                }}
                className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {assignments.length === 0 && !showAddUser ? (
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          No user assignments yet.
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
            <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
              <tr>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  User
                </th>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  Email
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
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td className='px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100'>
                    {assignment.user_name ||
                      assignment.entity_name ||
                      'Unknown'}
                  </td>
                  <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                    {assignment.user_email || '—'}
                  </td>
                  <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                    {assignment.role.name}
                  </td>
                  <td className='px-4 py-2 text-right'>
                    <button
                      type='button'
                      onClick={() => handleRemove(assignment.id)}
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
      )}
    </div>
  );
};
