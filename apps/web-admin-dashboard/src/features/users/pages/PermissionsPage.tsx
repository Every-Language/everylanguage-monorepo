import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../api/rolesApi';
import { RoleModal } from '../components/RoleModal';
import type { RoleWithPermissions } from '../types';
import { Search, Plus, Trash2 } from 'lucide-react';

export function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(
    null
  );
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.fetchRoles(),
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => rolesApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRole(null);
    },
  });

  const filteredRoles =
    roles?.filter(role => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        role.name.toLowerCase().includes(query) ||
        role.role_key?.toLowerCase().includes(query) ||
        role.resource_type?.toLowerCase().includes(query)
      );
    }) || [];

  const handleRoleClick = async (role: RoleWithPermissions) => {
    try {
      const fullRole = await rolesApi.fetchRoleById(role.id);
      if (fullRole) {
        setSelectedRole(fullRole);
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      setSelectedRole(role);
    }
  };

  const handleDeleteRole = (role: RoleWithPermissions, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete the role "${role.name}"? This action cannot be undone and will remove all permissions associated with this role.`
      )
    ) {
      deleteMutation.mutate(role.id);
    }
  };

  const handleCloseModal = () => {
    setSelectedRole(null);
    setIsCreatingRole(false);
  };

  const handleRoleUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    if (selectedRole) {
      rolesApi.fetchRoleById(selectedRole.id).then(updated => {
        if (updated) {
          setSelectedRole(updated);
        }
      });
    }
  };

  const getResourceTypeColor = (resourceType: string | null) => {
    switch (resourceType) {
      case 'global':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'project':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'base':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'partner':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300';
    }
  };

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Permissions
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage roles and their permissions
          </p>
        </div>
        <button
          onClick={() => setIsCreatingRole(true)}
          className='flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors'>
          <Plus className='h-5 w-5' />
          Create Role
        </button>
      </div>

      {/* Search */}
      <div className='mb-6'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400' />
          <input
            type='text'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Search roles by name, key, or resource type...'
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading roles...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Role Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Resource Type
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Permissions
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {filteredRoles.length > 0 ? (
                  filteredRoles.map(role => (
                    <tr
                      key={role.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleRoleClick(role)}>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {role.name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {role.resource_type ? (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getResourceTypeColor(role.resource_type)}`}>
                            {role.resource_type}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
                        {role.permissions && role.permissions.length > 0 ? (
                          <div className='flex flex-col gap-1'>
                            {role.permissions.map(perm => {
                              return (
                                <div
                                  key={perm.id}
                                  className='flex items-center gap-2'>
                                  <span className='text-xs font-medium text-neutral-900 dark:text-neutral-100'>
                                    {perm.permission_key}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 text-xs font-medium rounded ${getResourceTypeColor(perm.resource_type)}`}>
                                    {perm.resource_type}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className='text-neutral-400 dark:text-neutral-500'>
                            No permissions
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={e => handleDeleteRole(role, e)}
                          disabled={deleteMutation.isPending}
                          className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50'
                          title='Delete Role'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                      {searchQuery
                        ? 'No roles found matching your search'
                        : 'No roles found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Modal */}
      {(selectedRole || isCreatingRole) && (
        <RoleModal
          role={selectedRole}
          isCreating={isCreatingRole}
          onClose={handleCloseModal}
          onUpdate={handleRoleUpdated}
        />
      )}
    </div>
  );
}
