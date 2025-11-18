import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { UserRolesTable } from './UserRolesTable';
import { Input } from '@everylanguage/shared-ui';
import type { UserWithRoles, UpdateUserData } from '../types';
import { X } from 'lucide-react';

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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      first_name: userData?.first_name || null,
      last_name: userData?.last_name || null,
      email: userData?.email || null,
      phone_number: userData?.phone_number || null,
    });
    setIsEditing(false);
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
        }`}
      >
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              User Details
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {user.first_name || user.last_name
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : user.email || 'User'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
          <div className='space-y-6'>
            {/* User Details */}
            <div>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                  User Information
                </h3>
                {!isEditing && (
                  <button
                    type='button'
                    onClick={() => setIsEditing(true)}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <Input
                  label='First Name'
                  value={formData.first_name || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      first_name: e.target.value || null,
                    })
                  }
                  disabled={!isEditing}
                />
                <Input
                  label='Last Name'
                  value={formData.last_name || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      last_name: e.target.value || null,
                    })
                  }
                  disabled={!isEditing}
                />
                <Input
                  label='Email'
                  type='email'
                  value={formData.email || ''}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value || null })
                  }
                  disabled={!isEditing}
                />
                <Input
                  label='Phone'
                  value={formData.phone_number || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      phone_number: e.target.value || null,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>

              <div className='mt-4 text-sm text-neutral-500 dark:text-neutral-400'>
                <p>
                  <span className='font-medium'>Created:</span>{' '}
                  {formatDate(user.created_at)}
                </p>
              </div>

              {isEditing && (
                <div className='mt-4 flex gap-2'>
                  <button
                    type='button'
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className='px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors'
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type='button'
                    onClick={handleCancel}
                    className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* User Roles */}
            <div>
              <UserRolesTable
                userId={user.id}
                roles={user.roles || []}
                onUpdate={() => {
                  refetchUser();
                  onUpdate?.();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
