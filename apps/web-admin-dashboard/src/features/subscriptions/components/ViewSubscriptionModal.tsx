import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '../api/subscriptionsApi';
import type {
  SubscriptionWithDonations,
  DonationWithAllocations,
} from '@/types';
import { X, DollarSign, Calendar, User, Repeat } from 'lucide-react';
import { ViewDonationModal } from '../../donations/components/ViewDonationModal';
import { UserModal } from '../../users/components/UserModal';
import { PartnerOrgModal } from '../../users/components/PartnerOrgModal';
import type { UserWithRoles } from '../../users/types';
import type { PartnerOrgWithUsers } from '../../users/types';

interface ViewSubscriptionModalProps {
  subscription: SubscriptionWithDonations;
  onClose: () => void;
  onUpdate: () => void;
}

export function ViewSubscriptionModal({
  subscription: initialSubscription,
  onClose,
  onUpdate,
}: ViewSubscriptionModalProps) {
  const queryClient = useQueryClient();

  // State for animations
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [selectedDonation, setSelectedDonation] =
    useState<DonationWithAllocations | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedPartnerOrg, setSelectedPartnerOrg] =
    useState<PartnerOrgWithUsers | null>(null);

  useEffect(() => {
    // Small delay to allow initial render, then trigger animation
    const timer = setTimeout(() => {
      setIsEntering(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Fetch subscription by ID to get latest data including donations
  const { data: currentSubscription } = useQuery({
    queryKey: ['subscription', initialSubscription.id],
    queryFn: () =>
      subscriptionsApi.fetchSubscriptionById(initialSubscription.id),
    enabled: !!initialSubscription.id,
    initialData: initialSubscription,
  });

  // Use currentSubscription if available, otherwise fall back to initialSubscription prop
  const displaySubscription = currentSubscription || initialSubscription;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNextPaymentDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return formatDate(dateString);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: {
        label: 'Active',
        className:
          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      },
      canceled: {
        label: 'Canceled',
        className:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300',
      },
      past_due: {
        label: 'Past Due',
        className:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      },
      unpaid: {
        label: 'Unpaid',
        className:
          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
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
      paused: {
        label: 'Paused',
        className:
          'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      },
    };

    const badge = badges[status] || badges.incomplete;
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getIntentDisplay = () => {
    switch (displaySubscription.intent_type) {
      case 'language':
        return {
          type: 'Language',
          name: displaySubscription.intent_language?.name || 'Unknown',
        };
      case 'region':
        return {
          type: 'Region',
          name: displaySubscription.intent_region?.name || 'Unknown',
        };
      case 'operation':
        return {
          type: 'Operation',
          name: displaySubscription.intent_operation?.name || 'Unknown',
        };
      case 'unrestricted':
        return { type: 'Unrestricted', name: 'No specific intent' };
      default:
        return { type: 'Unknown', name: 'Unknown' };
    }
  };

  const getFrequencyDisplay = () => {
    const amount = formatCurrency(
      displaySubscription.amount_cents,
      displaySubscription.currency_code
    );
    const interval =
      displaySubscription.interval_type === 'month' ? 'month' : 'year';
    return `${amount} / ${interval}`;
  };

  const intentDisplay = getIntentDisplay();

  const handleDonationClick = (donation: DonationWithAllocations) => {
    setSelectedDonation(donation);
  };

  const handleCloseDonationModal = () => {
    setSelectedDonation(null);
  };

  const handleDonationUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ['subscription', displaySubscription.id],
    });
    onUpdate();
  };

  const handleUserClick = async (userId: string | null) => {
    if (!userId) return;
    const { usersApi } = await import('../../users/api/usersApi');
    try {
      const user = await usersApi.fetchUserById(userId);
      if (user) {
        setSelectedUser(user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const handlePartnerOrgClick = async (partnerOrgId: string | null) => {
    if (!partnerOrgId) return;
    const { partnerOrgsApi } = await import('../../users/api/partnerOrgsApi');
    try {
      const org = await partnerOrgsApi.fetchPartnerOrgById(partnerOrgId);
      if (org) {
        setSelectedPartnerOrg(org);
      }
    } catch (error) {
      console.error('Failed to fetch partner org:', error);
    }
  };

  const getStatusBadgeForDonation = (status: string) => {
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

  const getIntentDisplayForDonation = (donation: DonationWithAllocations) => {
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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isEntering && !isExiting ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${
          isEntering && !isExiting ? 'opacity-100' : 'opacity-0'
        }`}>
        <div className='flex min-h-full items-center justify-center p-4'>
          <div
            className={`relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 w-full max-w-4xl transform transition-all duration-300 ${
              isEntering && !isExiting
                ? 'scale-100 opacity-100'
                : 'scale-95 opacity-0'
            }`}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800'>
              <div>
                <h2 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
                  Subscription Details
                </h2>
              </div>
              <button
                onClick={handleClose}
                className='text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors'>
                <X className='h-6 w-6' />
              </button>
            </div>

            {/* Content */}
            <div className='p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto'>
              {/* Subscription Info */}
              <div className='grid grid-cols-2 gap-6'>
                {/* Left Column */}
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      <User className='inline h-4 w-4 mr-1' />
                      Donor
                    </label>
                    <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {displaySubscription.user ? (
                        <button
                          onClick={() =>
                            handleUserClick(displaySubscription.user_id)
                          }
                          className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                          <div className='font-medium'>
                            {displaySubscription.user.first_name}{' '}
                            {displaySubscription.user.last_name}
                          </div>
                          <div className='text-neutral-500 dark:text-neutral-400'>
                            {displaySubscription.user.email}
                          </div>
                        </button>
                      ) : displaySubscription.partner_org ? (
                        <button
                          onClick={() =>
                            handlePartnerOrgClick(
                              displaySubscription.partner_org_id
                            )
                          }
                          className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                          <div className='font-medium'>
                            {displaySubscription.partner_org.name}
                          </div>
                          <div className='text-neutral-500 dark:text-neutral-400'>
                            Partner Organization
                          </div>
                        </button>
                      ) : (
                        <span className='text-neutral-500 dark:text-neutral-400'>
                          Unknown
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      <DollarSign className='inline h-4 w-4 mr-1' />
                      Amount + Frequency
                    </label>
                    <div className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
                      {getFrequencyDisplay()}
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Status
                    </label>
                    <div>{getStatusBadge(displaySubscription.status)}</div>
                  </div>
                </div>

                {/* Right Column */}
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Intent
                    </label>
                    <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                      <div className='font-medium'>{intentDisplay.type}</div>
                      <div className='text-neutral-500 dark:text-neutral-400'>
                        {intentDisplay.name}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      <Repeat className='inline h-4 w-4 mr-1' />
                      Next Payment Date
                    </label>
                    <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {formatNextPaymentDate(
                        displaySubscription.current_period_end
                      )}
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      <Calendar className='inline h-4 w-4 mr-1' />
                      Created
                    </label>
                    <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {formatDate(displaySubscription.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Donations List */}
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                    Linked Donations ({displaySubscription.donations.length})
                  </h3>
                </div>

                {/* Donations Table */}
                {displaySubscription.donations.length > 0 ? (
                  <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'>
                    <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                      <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                        <tr>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Date
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Status
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Source
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Amount
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Intent
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Allocations
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                        {displaySubscription.donations
                          .sort(
                            (a, b) =>
                              new Date(b.created_at).getTime() -
                              new Date(a.created_at).getTime()
                          )
                          .map(donation => (
                            <tr
                              key={donation.id}
                              className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                              onClick={() => handleDonationClick(donation)}>
                              <td className='px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400'>
                                {formatDate(donation.created_at)}
                              </td>
                              <td className='px-4 py-3 text-sm'>
                                {getStatusBadgeForDonation(donation.status)}
                              </td>
                              <td className='px-4 py-3 text-sm'>
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
                              <td className='px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                                {formatCurrency(
                                  donation.amount_cents,
                                  donation.currency_code
                                )}
                              </td>
                              <td className='px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400'>
                                <div>
                                  <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                                    {donation.intent_type}
                                  </span>
                                </div>
                                <div className='mt-1 text-xs'>
                                  {getIntentDisplayForDonation(donation)}
                                </div>
                              </td>
                              <td className='px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100'>
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
                ) : (
                  <div className='text-center py-8 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-lg'>
                    No donations linked to this subscription yet
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className='flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-800'>
              <button
                onClick={handleClose}
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors'>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Donation Modal */}
      {selectedDonation && (
        <ViewDonationModal
          donation={selectedDonation}
          onClose={handleCloseDonationModal}
          onUpdate={handleDonationUpdated}
        />
      )}

      {/* User Modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({
              queryKey: ['subscription', displaySubscription.id],
            });
            onUpdate();
          }}
        />
      )}

      {/* Partner Org Modal */}
      {selectedPartnerOrg && (
        <PartnerOrgModal
          org={selectedPartnerOrg}
          isCreating={false}
          onClose={() => setSelectedPartnerOrg(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({
              queryKey: ['subscription', displaySubscription.id],
            });
            onUpdate();
          }}
        />
      )}
    </>
  );
}
