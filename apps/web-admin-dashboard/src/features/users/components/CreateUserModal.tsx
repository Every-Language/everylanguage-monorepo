import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import type { CreateUserData } from '../types';
import { X } from 'lucide-react';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setIsEntering(false);
      setIsClosing(false);
      setFormData({ email: '', first_name: '', last_name: '' });
      setError(null);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create user');
    },
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsEntering(true);
      setFormData({ email: '', first_name: '', last_name: '' });
      setError(null);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Prevent double submission
    if (createMutation.isPending) {
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    createMutation.mutate({
      email: formData.email.trim(),
      first_name: formData.first_name?.trim() || undefined,
      last_name: formData.last_name?.trim() || undefined,
    });
  };

  if (!open) return null;

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
        className={`absolute inset-y-0 right-0 max-w-lg w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
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
              Create User
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Create a new user account
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            {error && (
              <div className='p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg'>
                <p className='text-sm text-error-700 dark:text-error-400'>
                  {error}
                </p>
              </div>
            )}

            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Email <span className='text-error-600'>*</span>
              </label>
              <input
                type='email'
                required
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                placeholder='user@example.com'
                disabled={createMutation.isPending}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                First Name
              </label>
              <input
                type='text'
                value={formData.first_name || ''}
                onChange={e =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                placeholder='John'
                disabled={createMutation.isPending}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Last Name
              </label>
              <input
                type='text'
                value={formData.last_name || ''}
                onChange={e =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                placeholder='Doe'
                disabled={createMutation.isPending}
              />
            </div>

            <div className='flex gap-2 pt-4'>
              <button
                type='button'
                onClick={handleClose}
                disabled={createMutation.isPending}
                className='flex-1 px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300 disabled:opacity-50'>
                Cancel
              </button>
              <button
                type='submit'
                disabled={createMutation.isPending}
                className='flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
