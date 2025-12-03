import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerOrgsApi } from '../api/partnerOrgsApi';
import { EntityUserAssignments } from './EntityUserAssignments';
import { Input } from '@everylanguage/shared-ui';
import type {
  PartnerOrgWithUsers,
  CreatePartnerOrgData,
  UpdatePartnerOrgData,
} from '../types';
import { X } from 'lucide-react';

interface PartnerOrgModalProps {
  org: PartnerOrgWithUsers | null;
  isCreating: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const PartnerOrgModal: React.FC<PartnerOrgModalProps> = ({
  org,
  isCreating,
  onClose,
  onUpdate,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [formData, setFormData] = useState<
    CreatePartnerOrgData | UpdatePartnerOrgData
  >({
    name: org?.name || '',
    description: org?.description || null,
    is_public: org?.is_public ?? false,
    is_individual: org?.is_individual ?? false,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsEntering(false);
  }, []);

  const { data: orgData, refetch: refetchOrg } = useQuery({
    queryKey: ['partner-org', org?.id],
    queryFn: () =>
      org?.id ? partnerOrgsApi.fetchPartnerOrgById(org.id) : null,
    enabled: !!org?.id && !isCreating,
    initialData: org || undefined,
  });

  useEffect(() => {
    if (org?.id && !isCreating) {
      refetchOrg();
    }
  }, [org?.id, isCreating, refetchOrg]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePartnerOrgData) =>
      partnerOrgsApi.createPartnerOrg(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-orgs'] });
      handleClose();
      onUpdate?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdatePartnerOrgData) => {
      if (org?.id) {
        await partnerOrgsApi.updatePartnerOrg(org.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-org', org?.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-orgs'] });
      onUpdate?.();
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      if (org?.id) {
        await partnerOrgsApi.assignUserToPartnerOrg(org.id, userId, roleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-org', org?.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-orgs'] });
      refetchOrg();
      onUpdate?.();
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      partnerOrgsApi.removeUserFromPartnerOrg(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-org', org?.id] });
      queryClient.invalidateQueries({ queryKey: ['partner-orgs'] });
      refetchOrg();
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
    if (isCreating) {
      createMutation.mutate(formData as CreatePartnerOrgData);
    } else if (org?.id) {
      updateMutation.mutate(formData as UpdatePartnerOrgData);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const currentOrg = orgData || org;

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isClosing ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      <div
        className={`absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isClosing
            ? 'translate-x-full'
            : isEntering
              ? 'translate-x-full'
              : 'translate-x-0'
        }`}
      >
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {isCreating
                ? 'Create Partner Organization'
                : 'Partner Organization Details'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {currentOrg?.name || 'New organization'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6'>
          <div className='space-y-6'>
            {/* Partner Org Details */}
            <div>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Organization Information
              </h3>

              <div className='space-y-4'>
                <Input
                  label='Name'
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <Input
                  label='Description'
                  value={formData.description || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      description: e.target.value || null,
                    })
                  }
                />
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    id='is_public'
                    checked={formData.is_public || false}
                    onChange={e =>
                      setFormData({ ...formData, is_public: e.target.checked })
                    }
                    className='w-4 h-4'
                  />
                  <label
                    htmlFor='is_public'
                    className='text-sm text-neutral-700 dark:text-neutral-300'
                  >
                    Is Public
                  </label>
                </div>
                {currentOrg && (
                  <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                    <p>
                      <span className='font-medium'>Created:</span>{' '}
                      {formatDate(currentOrg.created_at)}
                    </p>
                  </div>
                )}
              </div>

              <div className='mt-4 flex gap-2'>
                <button
                  type='button'
                  onClick={handleSave}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    !formData.name
                  }
                  className='px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors'
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : isCreating
                      ? 'Create'
                      : 'Save'}
                </button>
                <button
                  type='button'
                  onClick={handleClose}
                  className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* User Assignments */}
            {currentOrg && (
              <div>
                <EntityUserAssignments
                  entityId={currentOrg.id}
                  resourceType='partner'
                  assignments={currentOrg.users || []}
                  onUpdate={onUpdate}
                  onAssign={async (userId, roleId) => {
                    await assignUserMutation.mutateAsync({ userId, roleId });
                  }}
                  onRemove={async assignmentId => {
                    await removeUserMutation.mutateAsync(assignmentId);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
