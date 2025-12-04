import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerOrgsApi } from '../api/partnerOrgsApi';
import { EntityUserAssignments } from './EntityUserAssignments';
import { EntityProjectAssignments } from './EntityProjectAssignments';
import type {
  PartnerOrgWithUsers,
  CreatePartnerOrgData,
  UpdatePartnerOrgData,
} from '../types';
import { X, Edit, Save } from 'lucide-react';

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
  const [editingInfo, setEditingInfo] = useState(false);
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

  // Sync form data when org changes
  useEffect(() => {
    if (org && !isCreating) {
      setFormData({
        name: org.name,
        description: org.description || null,
        is_public: org.is_public ?? false,
        is_individual: org.is_individual ?? false,
      });
    } else if (isCreating) {
      setFormData({
        name: '',
        description: null,
        is_public: false,
        is_individual: false,
      });
    }
  }, [org, isCreating]);

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
      setEditingInfo(false);
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

  // Fetch partner org projects
  const { data: partnerOrgProjects, refetch: refetchPartnerOrgProjects } =
    useQuery({
      queryKey: ['partner-org-projects', org?.id],
      queryFn: () =>
        org?.id ? partnerOrgsApi.fetchPartnerOrgProjects(org.id) : [],
      enabled: !!org?.id && !isCreating,
    });

  const assignProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (org?.id) {
        await partnerOrgsApi.assignProjectToPartnerOrg(org.id, projectId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['partner-org-projects', org?.id],
      });
      refetchPartnerOrgProjects();
      onUpdate?.();
    },
  });

  const removeProjectMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      partnerOrgsApi.unassignProjectFromPartnerOrg(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['partner-org-projects', org?.id],
      });
      refetchPartnerOrgProjects();
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

  const handleCancel = () => {
    if (org && !isCreating) {
      setFormData({
        name: org.name,
        description: org.description || null,
        is_public: org.is_public ?? false,
        is_individual: org.is_individual ?? false,
      });
    }
    setEditingInfo(false);
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
        }`}>
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {isCreating
                ? 'Create Partner Organization'
                : currentOrg?.name || 'Partner Organization'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {isCreating ? 'New organization' : 'Partner Organization Details'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          {/* Organization Information */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Organization Information
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
                  Name
                </label>
                {isCreating || editingInfo ? (
                  <input
                    type='text'
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    required
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {currentOrg?.name || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Description
                </label>
                {isCreating || editingInfo ? (
                  <textarea
                    value={formData.description || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        description: e.target.value || null,
                      })
                    }
                    rows={4}
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap'>
                    {currentOrg?.description || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Is Public
                </label>
                {isCreating || editingInfo ? (
                  <div className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      id='is_public'
                      checked={formData.is_public || false}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          is_public: e.target.checked,
                        })
                      }
                      className='w-4 h-4 rounded border-neutral-300 dark:border-neutral-700'
                    />
                    <label
                      htmlFor='is_public'
                      className='text-sm text-neutral-700 dark:text-neutral-300'>
                      Public
                    </label>
                  </div>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {currentOrg?.is_public ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Is Individual
                </label>
                {isCreating || editingInfo ? (
                  <div className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      id='is_individual'
                      checked={formData.is_individual || false}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          is_individual: e.target.checked,
                        })
                      }
                      className='w-4 h-4 rounded border-neutral-300 dark:border-neutral-700'
                    />
                    <label
                      htmlFor='is_individual'
                      className='text-sm text-neutral-700 dark:text-neutral-300'>
                      Individual
                    </label>
                  </div>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {currentOrg?.is_individual ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
              {currentOrg && (
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Created
                  </label>
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {formatDate(currentOrg.created_at)}
                  </p>
                </div>
              )}
              {(isCreating || editingInfo) && (
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={isCreating ? handleClose : handleCancel}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      !formData.name
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

          {/* User Assignments */}
          {currentOrg && (
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                User Assignments
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
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
            </section>
          )}

          {/* Projects */}
          {currentOrg && (
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Projects
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <EntityProjectAssignments
                  assignments={partnerOrgProjects || []}
                  onUpdate={onUpdate}
                  onAssign={async projectId => {
                    await assignProjectMutation.mutateAsync(projectId);
                  }}
                  onRemove={async assignmentId => {
                    await removeProjectMutation.mutateAsync(assignmentId);
                  }}
                  onProjectClick={() => {
                    // Could open project modal here if needed
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
