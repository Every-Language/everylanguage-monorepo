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
import { donationsApi } from '../../donations/api/donationsApi';
import type { DonationWithAllocations } from '@/types';
import { UserModal } from './UserModal';
import type { UserWithRoles } from '../types';
import { subscriptionsApi } from '../../subscriptions/api/subscriptionsApi';
import type { SubscriptionWithDonations } from '@/types';
import { ViewSubscriptionModal } from '../../subscriptions/components/ViewSubscriptionModal';

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
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
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

          {/* Donations */}
          {currentOrg && (
            <section>
              <PartnerOrgDonationsSection partnerOrgId={currentOrg.id} />
            </section>
          )}

          {/* Subscriptions */}
          {currentOrg && (
            <section>
              <PartnerOrgSubscriptionsSection partnerOrgId={currentOrg.id} />
            </section>
          )}
        </div>
      </div>

      {/* User Modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            refetchOrg();
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
};

interface PartnerOrgDonationsSectionProps {
  partnerOrgId: string;
}

const PartnerOrgDonationsSection: React.FC<PartnerOrgDonationsSectionProps> = ({
  partnerOrgId,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['partner-org-donations', partnerOrgId],
    queryFn: () =>
      donationsApi.fetchDonations({
        page: 1,
        pageSize: 1000, // Get all donations for this partner org
      }),
  });

  const donations = (donationsData?.data || []).filter(
    (donation: DonationWithAllocations) =>
      donation.partner_org_id === partnerOrgId
  );

  const formatCurrency = (cents: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: {
        label: 'Draft',
        className:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300',
      },
      pending: {
        label: 'Pending',
        className:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      },
      processing: {
        label: 'Processing',
        className:
          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      },
      completed: {
        label: 'Completed',
        className:
          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      },
      failed: {
        label: 'Failed',
        className:
          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      },
      cancelled: {
        label: 'Cancelled',
        className:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300',
      },
    };

    const badge = badges[status] || badges.pending;
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getIntentDisplay = (donation: DonationWithAllocations) => {
    switch (donation.intent_type) {
      case 'language':
        return donation.intent_language?.name || 'Language';
      case 'region':
        return donation.intent_region?.name || 'Region';
      case 'operation':
        return donation.intent_operation?.name || 'Operation';
      case 'unrestricted':
        return 'Unrestricted';
      default:
        return 'Unknown';
    }
  };

  const handleUserClick = async (userId: string | null) => {
    if (!userId) return;
    const { usersApi } = await import('../api/usersApi');
    try {
      const user = await usersApi.fetchUserById(userId);
      if (user) {
        setSelectedUser(user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  return (
    <div>
      <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
        Donations
      </h3>
      <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
        {isLoading ? (
          <div className='text-center py-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
              Loading donations...
            </p>
          </div>
        ) : donations.length === 0 ? (
          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
            No donations found for this partner organization.
          </p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Date
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Status
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Source
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    User
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Amount
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Intent
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Allocations
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                {donations
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  .map(donation => (
                    <tr key={donation.id}>
                      <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(donation.created_at)}
                      </td>
                      <td className='px-4 py-2 text-sm'>
                        {getStatusBadge(donation.status)}
                      </td>
                      <td className='px-4 py-2 text-sm'>
                        {donation.is_manual ? (
                          <span className='px-2 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'>
                            Manual
                          </span>
                        ) : (
                          <span className='px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'>
                            Stripe
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100'>
                        {donation.user ? (
                          <button
                            onClick={() => handleUserClick(donation.user_id)}
                            className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                            <div className='font-medium'>
                              {donation.user.first_name}{' '}
                              {donation.user.last_name}
                            </div>
                            <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                              {donation.user.email}
                            </div>
                          </button>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            —
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {formatCurrency(
                          donation.amount_cents,
                          donation.currency_code
                        )}
                      </td>
                      <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                        <div>
                          <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                            {donation.intent_type}
                          </span>
                        </div>
                        <div className='mt-1 text-xs'>
                          {getIntentDisplay(donation)}
                        </div>
                      </td>
                      <td className='px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100'>
                        {donation.allocations &&
                        donation.allocations.length > 0 ? (
                          <div>
                            <div className='text-sm font-medium'>
                              Total:{' '}
                              {formatCurrency(
                                donation.allocated_cents,
                                donation.currency_code
                              )}
                            </div>
                            <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                              Remaining:{' '}
                              {formatCurrency(
                                donation.remaining_cents,
                                donation.currency_code
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400 italic'>
                            No allocations
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      {selectedUser && (
        <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};

interface PartnerOrgSubscriptionsSectionProps {
  partnerOrgId: string;
}

const PartnerOrgSubscriptionsSection: React.FC<
  PartnerOrgSubscriptionsSectionProps
> = ({ partnerOrgId }) => {
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionWithDonations | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: ['partner-org-subscriptions', partnerOrgId],
    queryFn: () =>
      subscriptionsApi.fetchSubscriptions({
        page: 1,
        pageSize: 1000, // Get all subscriptions for this partner org
      }),
  });

  const subscriptions = (subscriptionsData?.data || []).filter(
    (subscription: SubscriptionWithDonations) =>
      subscription.partner_org_id === partnerOrgId
  );

  const formatCurrency = (cents: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: {
        label: 'Active',
        className:
          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      },
      cancelled: {
        label: 'Cancelled',
        className:
          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      },
      past_due: {
        label: 'Past Due',
        className:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      },
      incomplete: {
        label: 'Incomplete',
        className:
          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      },
      incomplete_expired: {
        label: 'Incomplete Expired',
        className:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300',
      },
      trialing: {
        label: 'Trialing',
        className:
          'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      },
      unpaid: {
        label: 'Unpaid',
        className:
          'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      },
    };

    const badge = badges[status] || badges.active;
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getIntentDisplay = (subscription: SubscriptionWithDonations) => {
    switch (subscription.intent_type) {
      case 'language':
        return subscription.intent_language?.name || 'Language';
      case 'region':
        return subscription.intent_region?.name || 'Region';
      case 'operation':
        return subscription.intent_operation?.name || 'Operation';
      case 'unrestricted':
        return 'Unrestricted';
      default:
        return 'Unknown';
    }
  };

  const formatAmountFrequency = (
    subscription: SubscriptionWithDonations
  ): string => {
    const amount = formatCurrency(
      subscription.amount_cents,
      subscription.currency_code
    );
    const interval = subscription.interval_type === 'month' ? 'month' : 'year';
    return `${amount} / ${interval}`;
  };

  const handleSubscriptionClick = async (
    subscription: SubscriptionWithDonations
  ) => {
    try {
      const fullSubscription = await subscriptionsApi.fetchSubscriptionById(
        subscription.id
      );
      if (fullSubscription) {
        setSelectedSubscription(fullSubscription);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const handleUserClick = async (userId: string | null) => {
    if (!userId) return;
    const { usersApi } = await import('../api/usersApi');
    try {
      const user = await usersApi.fetchUserById(userId);
      if (user) {
        setSelectedUser(user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  return (
    <div>
      <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
        Subscriptions
      </h3>
      <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
        {isLoading ? (
          <div className='text-center py-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
              Loading subscriptions...
            </p>
          </div>
        ) : subscriptions.length === 0 ? (
          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
            No subscriptions found for this partner organization.
          </p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Date
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Status
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    User
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Amount
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Next Payment
                  </th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Intent
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                {subscriptions
                  .sort(
                    (
                      a: SubscriptionWithDonations,
                      b: SubscriptionWithDonations
                    ) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  .map((subscription: SubscriptionWithDonations) => (
                    <tr
                      key={subscription.id}
                      className='hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleSubscriptionClick(subscription)}>
                      <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(subscription.created_at)}
                      </td>
                      <td className='px-4 py-2 text-sm'>
                        {getStatusBadge(subscription.status)}
                      </td>
                      <td className='px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100'>
                        {subscription.user ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleUserClick(subscription.user_id);
                            }}
                            className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                            <div className='font-medium'>
                              {subscription.user.first_name}{' '}
                              {subscription.user.last_name}
                            </div>
                            <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                              {subscription.user.email}
                            </div>
                          </button>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            —
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {formatAmountFrequency(subscription)}
                      </td>
                      <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(subscription.current_period_end)}
                      </td>
                      <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                        <div>
                          <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                            {subscription.intent_type}
                          </span>
                        </div>
                        <div className='mt-1 text-xs'>
                          {getIntentDisplay(subscription)}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Modal */}
      {selectedSubscription && (
        <ViewSubscriptionModal
          subscription={selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
          onUpdate={() => {
            // Refetch subscriptions
          }}
        />
      )}

      {/* User Modal */}
      {selectedUser && (
        <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};
