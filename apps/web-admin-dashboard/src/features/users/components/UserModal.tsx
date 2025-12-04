import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import type {
  UserWithRoles,
  UpdateUserData,
  UserRoleAssignment,
  ResourceType,
} from '../types';
import { X, Edit, Save, Trash2, Copy, Check, Plus } from 'lucide-react';
import { EntityRoleSelector } from './EntityRoleSelector';

interface UserModalProps {
  user: UserWithRoles;
  onClose: () => void;
  onUpdate?: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  user: initialUser,
  onClose,
  onUpdate,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateUserData>({
    first_name: initialUser.first_name || null,
    last_name: initialUser.last_name || null,
    email: initialUser.email || null,
    phone_number: initialUser.phone_number || null,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsEntering(false);
  }, []);

  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['user', initialUser.id],
    queryFn: () => usersApi.fetchUserById(initialUser.id),
    initialData: initialUser,
  });

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserData) =>
      usersApi.updateUser(initialUser.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', initialUser.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditing(false);
      onUpdate?.();
    },
  });

  // Fetch auth status
  const {
    data: authStatus,
    error: authStatusError,
    isLoading: authStatusLoading,
  } = useQuery({
    queryKey: ['user-auth-status', initialUser.id],
    queryFn: () => usersApi.checkUserAuthStatus(initialUser.id),
    enabled: !!initialUser.id && !!initialUser.email,
    retry: 1,
  });

  const generateInviteLinkMutation = useMutation({
    mutationFn: () => usersApi.generateInviteLink(initialUser.id),
    onSuccess: data => {
      setInviteLink(data.inviteLink);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (password: string) =>
      usersApi.adminResetUserPassword(initialUser.id, password),
    onSuccess: () => {
      setNewPassword('');
      setPasswordError(null);
      // Show success message (you might want to add a toast system here)
      alert('Password reset successfully');
    },
    onError: (err: Error) => {
      setPasswordError(err.message || 'Failed to reset password');
    },
  });

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
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

  const user = userData || initialUser;

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
              {user.first_name || user.last_name
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : user.email || 'User'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              User Details
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
          {/* Authentication */}
          {initialUser.email && (
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Authentication
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-4'>
                {authStatusLoading ? (
                  <div>
                    <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Loading authentication status...
                    </p>
                  </div>
                ) : authStatusError ? (
                  <div>
                    <p className='text-sm text-error-600 dark:text-error-400'>
                      Failed to load authentication status:{' '}
                      {authStatusError instanceof Error
                        ? authStatusError.message
                        : 'Unknown error'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Password Reset Section - Available for all users */}
                    <div className='space-y-4 border-b border-neutral-200 dark:border-neutral-700 pb-4'>
                      <p className='text-sm text-neutral-600 dark:text-neutral-400'>
                        {authStatus && authStatus.hasPassword === true
                          ? 'This user has a password set. You can reset their password below.'
                          : 'This user does not have a password set. You can set a password for them below.'}
                      </p>
                      <div className='space-y-2'>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                          {authStatus && authStatus.hasPassword === true
                            ? 'New Password'
                            : 'Set Password'}
                        </label>
                        <input
                          type='password'
                          value={newPassword}
                          onChange={e => {
                            setNewPassword(e.target.value);
                            setPasswordError(null);
                          }}
                          placeholder='Enter new password'
                          className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                        />
                        {passwordError && (
                          <p className='text-sm text-error-600 dark:text-error-400'>
                            {passwordError}
                          </p>
                        )}
                        <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                          Password must be at least 8 characters
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (!newPassword || newPassword.length < 8) {
                            setPasswordError(
                              'Password must be at least 8 characters'
                            );
                            return;
                          }
                          resetPasswordMutation.mutate(newPassword);
                        }}
                        disabled={
                          resetPasswordMutation.isPending ||
                          !newPassword ||
                          newPassword.length < 8
                        }
                        className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1'>
                        <Save className='h-4 w-4' />
                        {resetPasswordMutation.isPending
                          ? 'Saving...'
                          : 'Save Password'}
                      </button>
                    </div>

                    {/* Invite Link Section - Only for users without password */}
                    {authStatus && authStatus.hasPassword === false && (
                      <div className='space-y-4'>
                        <p className='text-sm text-neutral-600 dark:text-neutral-400'>
                          Alternatively, generate an invite link for them to set
                          up their account.
                        </p>
                        {inviteLink ? (
                          <div className='space-y-2'>
                            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                              Invite Link
                            </label>
                            <div className='flex gap-2'>
                              <input
                                type='text'
                                readOnly
                                value={inviteLink}
                                className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm'
                              />
                              <button
                                onClick={handleCopyLink}
                                className='px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1'
                                title='Copy link'>
                                {linkCopied ? (
                                  <>
                                    <Check className='h-4 w-4 text-green-600' />
                                    <span className='text-sm text-green-600'>
                                      Copied!
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className='h-4 w-4' />
                                    <span className='text-sm'>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                setInviteLink(null);
                                generateInviteLinkMutation.mutate();
                              }}
                              className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'>
                              Generate new link
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => generateInviteLinkMutation.mutate()}
                            disabled={generateInviteLinkMutation.isPending}
                            className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm'>
                            {generateInviteLinkMutation.isPending
                              ? 'Generating...'
                              : 'Generate Invite Link'}
                          </button>
                        )}
                        {generateInviteLinkMutation.isError && (
                          <p className='text-sm text-error-600 dark:text-error-400 mt-2'>
                            {generateInviteLinkMutation.error instanceof Error
                              ? generateInviteLinkMutation.error.message
                              : 'Failed to generate invite link'}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {/* User Information */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                User Information
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type='text'
                    value={formData.first_name || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        first_name: e.target.value || null,
                      })
                    }
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {user.first_name || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type='text'
                    value={formData.last_name || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        last_name: e.target.value || null,
                      })
                    }
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {user.last_name || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Email
                </label>
                {isEditing ? (
                  <input
                    type='email'
                    value={formData.email || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        email: e.target.value || null,
                      })
                    }
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {user.email || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type='tel'
                    value={formData.phone_number || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        phone_number: e.target.value || null,
                      })
                    }
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {user.phone_number || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Created
                </label>
                <p className='text-neutral-900 dark:text-neutral-100'>
                  {formatDate(user.created_at)}
                </p>
              </div>
              {isEditing && (
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        first_name: user.first_name || null,
                        last_name: user.last_name || null,
                        email: user.email || null,
                        phone_number: user.phone_number || null,
                      });
                    }}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                    Cancel
                  </button>
                  <button
                    onClick={() => updateMutation.mutate(formData)}
                    disabled={updateMutation.isPending}
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                    <Save className='h-4 w-4' />
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Base Role Assignments */}
          <section>
            <UserRoleAssignmentsSection
              userId={user.id}
              roles={user.roles || []}
              entityType='base'
              sectionTitle='Bases'
              onUpdate={() => {
                refetchUser();
                onUpdate?.();
              }}
            />
          </section>

          {/* Partner Org Role Assignments */}
          <section>
            <UserRoleAssignmentsSection
              userId={user.id}
              roles={user.roles || []}
              entityType='partner'
              sectionTitle='Partner Organizations'
              onUpdate={() => {
                refetchUser();
                onUpdate?.();
              }}
            />
          </section>

          {/* Project Role Assignments */}
          <section>
            <UserRoleAssignmentsSection
              userId={user.id}
              roles={user.roles || []}
              entityType='project'
              sectionTitle='Projects'
              onUpdate={() => {
                refetchUser();
                onUpdate?.();
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

interface UserRoleAssignmentsSectionProps {
  userId: string;
  roles: UserRoleAssignment[];
  entityType: 'base' | 'partner' | 'project';
  sectionTitle: string;
  onUpdate?: () => void;
}

const UserRoleAssignmentsSection: React.FC<UserRoleAssignmentsSectionProps> = ({
  userId,
  roles,
  entityType,
  sectionTitle,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddEntity, setShowAddEntity] = useState(false);
  const queryClient = useQueryClient();

  // Filter roles by entity type
  const filteredRoles = roles.filter(role => {
    if (entityType === 'base') return role.base_id !== null;
    if (entityType === 'partner') return role.partner_org_id !== null;
    if (entityType === 'project') return role.project_id !== null;
    return false;
  });

  const { data: availableRoles = [] } = useQuery({
    queryKey: ['roles', entityType === 'partner' ? 'partner' : entityType],
    queryFn: () =>
      usersApi.fetchRolesByResourceType(
        (entityType === 'partner' ? 'partner' : entityType) as ResourceType
      ),
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      entityId,
      roleId,
    }: {
      entityId: string;
      roleId: string;
    }) => {
      const context: {
        projectId?: string | null;
        baseId?: string | null;
        partnerOrgId?: string | null;
        isGlobal?: boolean;
      } = {};

      if (entityType === 'base') {
        context.baseId = entityId;
      } else if (entityType === 'project') {
        context.projectId = entityId;
      } else if (entityType === 'partner') {
        context.partnerOrgId = entityId;
      }

      await usersApi.assignUserRole(userId, roleId, context);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddEntity(false);
      onUpdate?.();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      roleId,
    }: {
      assignmentId: string;
      roleId: string;
    }) => {
      const assignment = filteredRoles.find(r => r.id === assignmentId);
      if (!assignment) return;

      const context: {
        projectId?: string | null;
        baseId?: string | null;
        partnerOrgId?: string | null;
        isGlobal?: boolean;
      } = {};

      if (assignment.base_id) {
        context.baseId = assignment.base_id;
      } else if (assignment.project_id) {
        context.projectId = assignment.project_id;
      } else if (assignment.partner_org_id) {
        context.partnerOrgId = assignment.partner_org_id;
      }

      await usersApi.assignUserRole(userId, roleId, context);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onUpdate?.();
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (assignmentId: string) => usersApi.removeUserRole(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onUpdate?.();
    },
  });

  const handleUpdateRole = (assignmentId: string, roleId: string) => {
    if (
      roleId &&
      roleId !== filteredRoles.find(r => r.id === assignmentId)?.role_id
    ) {
      updateRoleMutation.mutate({ assignmentId, roleId });
    }
  };

  const handleRemove = (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this role assignment?')) {
      removeRoleMutation.mutate(assignmentId);
    }
  };

  const handleAddEntity = (entityId: string, roleId: string) => {
    assignMutation.mutate({ entityId, roleId });
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          {sectionTitle}
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
      </div>

      <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg space-y-4'>
        {isEditing && !showAddEntity && (
          <button
            type='button'
            onClick={() => setShowAddEntity(true)}
            className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1'>
            <Plus className='h-4 w-4' />
            Add{' '}
            {entityType === 'partner'
              ? 'Partner Organization'
              : entityType.charAt(0).toUpperCase() + entityType.slice(1)}
          </button>
        )}

        {showAddEntity && isEditing && (
          <EntityRoleSelector
            contextType={entityType}
            onAssign={handleAddEntity}
            onCancel={() => setShowAddEntity(false)}
          />
        )}

        {filteredRoles.length === 0 ? (
          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
            No {entityType === 'partner' ? 'partner organization' : entityType}{' '}
            assignments yet.
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
                {filteredRoles.map(role => (
                  <tr key={role.id}>
                    <td className='px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100'>
                      {role.entity_name || 'Unknown'}
                    </td>
                    <td className='px-4 py-2 text-sm'>
                      {isEditing ? (
                        <Select
                          value={role.role_id}
                          onValueChange={roleId => {
                            handleUpdateRole(role.id, roleId);
                          }}>
                          {availableRoles.map(availableRole => (
                            <SelectItem
                              key={availableRole.id}
                              value={availableRole.id}>
                              {availableRole.name}
                            </SelectItem>
                          ))}
                        </Select>
                      ) : (
                        <span className='text-neutral-500 dark:text-neutral-400'>
                          {role.role.name}
                        </span>
                      )}
                    </td>
                    {isEditing && (
                      <td className='px-4 py-2 text-right'>
                        <button
                          type='button'
                          onClick={() => handleRemove(role.id)}
                          className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                          title='Remove assignment'>
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
                setShowAddEntity(false);
              }}
              className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
