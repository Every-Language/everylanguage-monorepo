import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { operationsApi } from '../api/operationsApi';
import type { OperationCategory, EntityStatus } from '../api/operationsApi';
import { X } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';

const OPERATION_CATEGORIES: OperationCategory[] = [
  'travel',
  'administration',
  'legal',
  'server',
  'marketing',
  'development',
];

const STATUS_OPTIONS: EntityStatus[] = [
  'draft',
  'available',
  'funded',
  'archived',
];

interface AddOperationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddOperationModal({
  onClose,
  onSuccess,
}: AddOperationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<OperationCategory>('administration');
  const [status, setStatus] = useState<EntityStatus>('draft');
  const [isPublic, setIsPublic] = useState(true);

  const createMutation = useMutation({
    mutationFn: () =>
      operationsApi.createOperation({
        name,
        description: description || null,
        category,
        status,
        is_public: isPublic,
      }),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    createMutation.mutate();
  };

  const formatCategory = (cat: OperationCategory): string => {
    return cat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex min-h-screen items-center justify-center p-4'>
        {/* Backdrop */}
        <div
          className='fixed inset-0 bg-black/50 transition-opacity'
          onClick={onClose}
        />

        {/* Modal */}
        <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full'>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800'>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              Add Operation
            </h2>
            <button
              onClick={onClose}
              className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
            >
              <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='p-6 space-y-4'>
            {/* Name */}
            <div>
              <label
                htmlFor='name'
                className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'
              >
                Name <span className='text-red-500'>*</span>
              </label>
              <input
                id='name'
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                placeholder='e.g., Server Infrastructure'
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor='description'
                className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'
              >
                Description
              </label>
              <textarea
                id='description'
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                placeholder='Optional description of this operation'
              />
            </div>

            {/* Category */}
            <Select
              label='Category'
              value={category}
              onValueChange={value => setCategory(value as OperationCategory)}
              required
            >
              {OPERATION_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {formatCategory(cat)}
                </SelectItem>
              ))}
            </Select>

            {/* Status */}
            <Select
              label='Status'
              value={status}
              onValueChange={value => setStatus(value as EntityStatus)}
              required
            >
              {STATUS_OPTIONS.map(stat => (
                <SelectItem key={stat} value={stat}>
                  {stat.charAt(0).toUpperCase() + stat.slice(1)}
                </SelectItem>
              ))}
            </Select>

            {/* Is Public */}
            <div className='flex items-center'>
              <input
                id='isPublic'
                type='checkbox'
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className='h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded'
              />
              <label
                htmlFor='isPublic'
                className='ml-2 block text-sm text-neutral-700 dark:text-neutral-300'
              >
                Public (visible to donors)
              </label>
            </div>

            {/* Actions */}
            <div className='flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800'>
              <button
                type='button'
                onClick={onClose}
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={createMutation.isPending || !name.trim()}
                className='px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                {createMutation.isPending ? 'Creating...' : 'Create Operation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
