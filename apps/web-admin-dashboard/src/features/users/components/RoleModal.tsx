import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../api/rolesApi';
import { Input, Select, SelectItem } from '@everylanguage/shared-ui';
import type {
  RoleWithPermissions,
  CreateRoleData,
  UpdateRoleData,
  ResourceType,
  RolePermission,
} from '../types';
import { X, Edit, Save, Plus, Trash2, Search } from 'lucide-react';
import type { Database } from '@everylanguage/shared-types';

type PermissionKey = Database['public']['Enums']['permission_key'];

interface RoleModalProps {
  role: RoleWithPermissions | null;
  isCreating: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const RESOURCE_TYPES: ResourceType[] = ['global', 'project', 'base', 'partner'];

// Define all available permissions grouped by resource type
const PERMISSIONS_BY_RESOURCE_TYPE: Record<
  ResourceType,
  { key: PermissionKey; label: string }[]
> = {
  global: [{ key: 'system.admin', label: 'System Admin' }],
  project: [
    { key: 'project.read', label: 'Project Read' },
    { key: 'project.write', label: 'Project Write' },
    { key: 'project.delete', label: 'Project Delete' },
    { key: 'project.invite', label: 'Project Invite' },
    { key: 'project.manage_roles', label: 'Project Manage Roles' },
    { key: 'budget.read', label: 'Budget Read' },
    { key: 'budget.write', label: 'Budget Write' },
    { key: 'contribution.read', label: 'Contribution Read' },
    { key: 'contribution.write', label: 'Contribution Write' },
    { key: 'verse_feedback.read', label: 'Verse Feedback Read' },
    { key: 'verse_feedback.write', label: 'Verse Feedback Write' },
    { key: 'verse_feedback.delete', label: 'Verse Feedback Delete' },
  ],
  base: [
    { key: 'base.read', label: 'Base Read' },
    { key: 'base.write', label: 'Base Write' },
    { key: 'base.delete', label: 'Base Delete' },
    { key: 'base.manage_roles', label: 'Base Manage Roles' },
  ],
  partner: [
    { key: 'partner.read', label: 'Partner Read' },
    { key: 'partner.manage_roles', label: 'Partner Manage Roles' },
    { key: 'contribution.read', label: 'Contribution Read' },
    { key: 'contribution.write', label: 'Contribution Write' },
  ],
};

export const RoleModal: React.FC<RoleModalProps> = ({
  role,
  isCreating,
  onClose,
  onUpdate,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [editingInfo, setEditingInfo] = useState(isCreating);
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [permissionSearchQuery, setPermissionSearchQuery] = useState<
    string | null
  >(null);

  const [formData, setFormData] = useState<CreateRoleData | UpdateRoleData>({
    name: role?.name || '',
    role_key: role?.role_key || '',
    resource_type: role?.resource_type || 'project',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    role_key?: string;
    resource_type?: string;
  }>({});

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsEntering(false);
  }, []);

  useEffect(() => {
    if (role && !isCreating) {
      setFormData({
        name: role.name,
        role_key: role.role_key || '',
        resource_type: role.resource_type || 'project',
      });
      setEditingInfo(false);
      setEditingPermissions(false);
    } else {
      setFormData({
        name: '',
        role_key: '',
        resource_type: 'project',
      });
      setEditingInfo(true);
      setEditingPermissions(false);
    }
    setErrors({});
  }, [role, isCreating]);

  // Fetch full role with permissions
  const { data: roleData, refetch: refetchRole } = useQuery({
    queryKey: ['role', role?.id],
    queryFn: () => (role?.id ? rolesApi.fetchRoleById(role.id) : null),
    enabled: !!role?.id && !isCreating,
    initialData: role || undefined,
  });

  const currentRole = roleData || role;

  // Get ALL available permissions from all resource types
  const allAvailablePermissions: Array<{
    key: PermissionKey;
    label: string;
    resourceType: ResourceType;
  }> = [];

  Object.entries(PERMISSIONS_BY_RESOURCE_TYPE).forEach(
    ([resourceType, permissions]) => {
      permissions.forEach(perm => {
        allAvailablePermissions.push({
          key: perm.key,
          label: perm.label,
          resourceType: resourceType as ResourceType,
        });
      });
    }
  );

  // Filter permissions by search query
  const filteredPermissions = allAvailablePermissions.filter(perm =>
    permissionSearchQuery
      ? perm.label
          .toLowerCase()
          .includes(permissionSearchQuery.toLowerCase()) ||
        perm.key.toLowerCase().includes(permissionSearchQuery.toLowerCase())
      : true
  );

  // Get permissions not yet assigned to the role
  const assignedPermissionKeys = new Set(
    currentRole?.permissions?.map(
      p => `${p.resource_type}:${p.permission_key}`
    ) || []
  );
  const unassignedPermissions = filteredPermissions.filter(
    perm => !assignedPermissionKeys.has(`${perm.resourceType}:${perm.key}`)
  );

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (!formData.role_key?.trim()) {
      newErrors.role_key = 'Role key is required';
    } else {
      const roleKeyRegex = /^[a-z0-9_]+$/;
      if (!roleKeyRegex.test(formData.role_key)) {
        newErrors.role_key =
          'Role key must be lowercase letters, numbers, and underscores only';
      }
    }

    if (!formData.resource_type) {
      newErrors.resource_type = 'Resource type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateRoleData) => rolesApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      handleClose();
      onUpdate?.();
    },
    onError: (error: Error) => {
      if (
        error.message.includes('unique') ||
        error.message.includes('duplicate')
      ) {
        setErrors({
          role_key:
            'A role with this key already exists for this resource type',
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateRoleData) => {
      if (role?.id) {
        await rolesApi.updateRole(role.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', role?.id] });
      refetchRole();
      setEditingInfo(false);
      onUpdate?.();
    },
    onError: (error: Error) => {
      if (
        error.message.includes('unique') ||
        error.message.includes('duplicate')
      ) {
        setErrors({
          role_key:
            'A role with this key already exists for this resource type',
        });
      }
    },
  });

  const addPermissionMutation = useMutation({
    mutationFn: async ({
      permissionKey,
      resourceType,
    }: {
      permissionKey: PermissionKey;
      resourceType: ResourceType;
    }) => {
      if (role?.id) {
        await rolesApi.addPermissionToRole(
          role.id,
          permissionKey,
          resourceType
        );
      }
    },
    onSuccess: () => {
      refetchRole();
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onUpdate?.();
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async (permission: RolePermission) => {
      await rolesApi.removePermissionFromRole(
        permission.role_id,
        permission.permission_key as PermissionKey,
        permission.resource_type
      );
    },
    onSuccess: () => {
      refetchRole();
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onUpdate?.();
    },
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    if (isCreating) {
      createMutation.mutate(formData as CreateRoleData);
    } else if (role?.id) {
      updateMutation.mutate(formData as UpdateRoleData);
    }
  };

  const handleAddPermission = (
    permissionKey: PermissionKey,
    resourceType: ResourceType
  ) => {
    if (role?.id) {
      addPermissionMutation.mutate({
        permissionKey,
        resourceType,
      });
    }
  };

  const handleRemovePermission = (permission: RolePermission) => {
    if (
      confirm(
        `Are you sure you want to remove the permission "${permission.permission_key}" from this role?`
      )
    ) {
      removePermissionMutation.mutate(permission);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getResourceTypeColor = (resourceType: ResourceType | null) => {
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
    <div className='fixed inset-0 z-50 overflow-hidden'>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isClosing ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isClosing
            ? 'translate-x-full'
            : isEntering
              ? 'translate-x-full'
              : 'translate-x-0'
        }`}>
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {isCreating ? 'Create Role' : currentRole?.name || 'Role Details'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {isCreating ? 'New role' : 'Role Details'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          {/* 1. Role Information */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Role Information
              </h3>
              {!isCreating && !editingInfo && (
                <button
                  onClick={() => setEditingInfo(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Role Name
                </label>
                {editingInfo ? (
                  <Input
                    value={formData.name || ''}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    error={errors.name}
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {currentRole?.name || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Role Key
                </label>
                {editingInfo ? (
                  <Input
                    value={formData.role_key || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        role_key: e.target.value.toLowerCase(),
                      })
                    }
                    placeholder='e.g., project_admin, base_member'
                    error={errors.role_key}
                    helperText='Lowercase letters, numbers, and underscores only'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100 font-mono'>
                    {currentRole?.role_key || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Resource Type
                </label>
                {editingInfo ? (
                  <Select
                    value={formData.resource_type || ''}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
                        resource_type: value as ResourceType,
                      })
                    }
                    error={errors.resource_type}>
                    {RESOURCE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </Select>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {currentRole?.resource_type ? (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getResourceTypeColor(currentRole.resource_type)}`}>
                        {currentRole.resource_type}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                )}
              </div>

              {currentRole && (
                <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                  <p>
                    <span className='font-medium'>Created:</span>{' '}
                    {formatDate(currentRole.created_at)}
                  </p>
                  {currentRole.updated_at && (
                    <p>
                      <span className='font-medium'>Updated:</span>{' '}
                      {formatDate(currentRole.updated_at)}
                    </p>
                  )}
                </div>
              )}

              {editingInfo && (
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={() => {
                      if (isCreating) {
                        handleClose();
                      } else {
                        setEditingInfo(false);
                        setFormData({
                          name: currentRole?.name || '',
                          role_key: currentRole?.role_key || '',
                          resource_type:
                            currentRole?.resource_type || 'project',
                        });
                        setErrors({});
                      }
                    }}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      !formData.name ||
                      !formData.role_key ||
                      !formData.resource_type
                    }
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                    <Save className='h-4 w-4' />
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : isCreating
                        ? 'Create'
                        : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 2. Permissions */}
          {!isCreating && currentRole && (
            <section>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                  Permissions
                </h3>
                {!editingPermissions && (
                  <button
                    onClick={() => setEditingPermissions(true)}
                    className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                    <Edit className='h-4 w-4' />
                    Edit
                  </button>
                )}
              </div>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                {editingPermissions ? (
                  <>
                    {/* Permissions table */}
                    {currentRole.permissions &&
                    currentRole.permissions.length > 0 ? (
                      <div className='overflow-x-auto mb-4'>
                        <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                          <thead className='bg-neutral-100 dark:bg-neutral-800'>
                            <tr>
                              <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                                Resource Type
                              </th>
                              <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                                Permission
                              </th>
                              <th className='px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                            {currentRole.permissions.map(permission => (
                              <tr key={permission.id}>
                                <td className='px-4 py-2 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getResourceTypeColor(permission.resource_type)}`}>
                                    {permission.resource_type}
                                  </span>
                                </td>
                                <td className='px-4 py-2 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                                  {permission.permission_key}
                                </td>
                                <td className='px-4 py-2 whitespace-nowrap text-right text-sm'>
                                  <button
                                    onClick={() =>
                                      handleRemovePermission(permission)
                                    }
                                    disabled={
                                      removePermissionMutation.isPending
                                    }
                                    className='p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'>
                                    <Trash2 className='h-4 w-4' />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className='text-neutral-500 dark:text-neutral-400 mb-4'>
                        No permissions assigned
                      </p>
                    )}

                    {/* Add permission button and search */}
                    {unassignedPermissions.length > 0 && (
                      <div>
                        <button
                          onClick={() => setPermissionSearchQuery('')}
                          className='mb-2 flex items-center gap-2 px-3 py-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400'>
                          <Plus className='h-4 w-4' />
                          Add Permission
                        </button>
                        {permissionSearchQuery !== null && (
                          <div className='relative mb-2'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                            <input
                              type='text'
                              placeholder='Search permissions to add...'
                              value={permissionSearchQuery}
                              onChange={e =>
                                setPermissionSearchQuery(e.target.value)
                              }
                              className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                            />
                          </div>
                        )}
                        {permissionSearchQuery !== null &&
                          unassignedPermissions.length > 0 && (
                            <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800'>
                              {unassignedPermissions.map(perm => (
                                <button
                                  key={`${perm.resourceType}:${perm.key}`}
                                  onClick={() => {
                                    handleAddPermission(
                                      perm.key,
                                      perm.resourceType
                                    );
                                    setPermissionSearchQuery(null);
                                  }}
                                  className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center justify-between'
                                  disabled={addPermissionMutation.isPending}>
                                  <div className='flex items-center gap-2'>
                                    <span
                                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${getResourceTypeColor(perm.resourceType)}`}>
                                      {perm.resourceType}
                                    </span>
                                    <div>
                                      <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                                        {perm.label}
                                      </span>
                                      <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2 font-mono'>
                                        {perm.key}
                                      </span>
                                    </div>
                                  </div>
                                  <Plus className='h-4 w-4 text-primary-600 dark:text-primary-400' />
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    )}

                    <div className='flex gap-2 pt-4'>
                      <button
                        onClick={() => {
                          setEditingPermissions(false);
                          setPermissionSearchQuery(null);
                        }}
                        className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                        Done
                      </button>
                    </div>
                  </>
                ) : currentRole.permissions &&
                  currentRole.permissions.length > 0 ? (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                      <thead className='bg-neutral-100 dark:bg-neutral-800'>
                        <tr>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                            Resource Type
                          </th>
                          <th className='px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                            Permission
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                        {currentRole.permissions.map(permission => (
                          <tr key={permission.id}>
                            <td className='px-4 py-2 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getResourceTypeColor(permission.resource_type)}`}>
                                {permission.resource_type}
                              </span>
                            </td>
                            <td className='px-4 py-2 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                              {permission.permission_key}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className='text-neutral-500 dark:text-neutral-400'>
                    No permissions assigned
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
