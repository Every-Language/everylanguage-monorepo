import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { donationsApi } from '../api/donationsApi';
import type { DonationWithAllocations } from '@/types';
import {
  X,
  Plus,
  DollarSign,
  Calendar,
  User,
  Building2,
  CreditCard,
} from 'lucide-react';

interface ViewDonationModalProps {
  donation: DonationWithAllocations;
  onClose: () => void;
  onUpdate: () => void;
}

export function ViewDonationModal({
  donation,
  onClose,
  onUpdate,
}: ViewDonationModalProps) {
  const queryClient = useQueryClient();

  // State for animations
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // State for add allocation form
  const [showAddAllocation, setShowAddAllocation] = useState(false);
  const [allocationOperationId, setAllocationOperationId] =
    useState<string>('');
  const [allocationProjectId, setAllocationProjectId] = useState<string>('');
  const [allocationAmountCents, setAllocationAmountCents] =
    useState<string>('');
  const [allocationNotes, setAllocationNotes] = useState<string>('');
  const [allocationEffectiveFrom, setAllocationEffectiveFrom] =
    useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Small delay to allow initial render, then trigger animation
    const timer = setTimeout(() => {
      setIsEntering(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  // Fetch operations for allocation dropdown
  const { data: operations } = useQuery({
    queryKey: ['operations-list'],
    queryFn: () => donationsApi.fetchOperations(),
  });

  // Fetch projects for allocation dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => donationsApi.fetchProjects(),
  });

  // Create allocation mutation
  const createAllocationMutation = useMutation({
    mutationFn: (allocationData: {
      donation_id: string;
      operation_id?: string;
      project_id?: string;
      amount_cents: number;
      notes?: string;
      effective_from?: string;
    }) => donationsApi.createAllocation(allocationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      onUpdate();
      setShowAddAllocation(false);
      // Reset form
      setAllocationOperationId('');
      setAllocationProjectId('');
      setAllocationAmountCents('');
      setAllocationNotes('');
      setAllocationEffectiveFrom(new Date().toISOString().split('T')[0]);
    },
  });

  const handleAddAllocation = () => {
    const amountCents = Math.round(parseFloat(allocationAmountCents) * 100);

    if (!amountCents || amountCents <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amountCents > donation.remaining_cents) {
      alert(
        `Amount exceeds remaining donation balance (${formatCurrency(donation.remaining_cents, donation.currency_code)})`
      );
      return;
    }

    if (!allocationOperationId && !allocationProjectId) {
      alert('Please select either an operation or a project');
      return;
    }

    createAllocationMutation.mutate({
      donation_id: donation.id,
      operation_id: allocationOperationId || undefined,
      project_id: allocationProjectId || undefined,
      amount_cents: amountCents,
      notes: allocationNotes || undefined,
      effective_from: allocationEffectiveFrom,
    });
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
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  const getIntentDisplay = () => {
    switch (donation.intent_type) {
      case 'language':
        return {
          type: 'Language',
          name: donation.intent_language?.name || 'Unknown',
        };
      case 'region':
        return {
          type: 'Region',
          name: donation.intent_region?.name || 'Unknown',
        };
      case 'operation':
        return {
          type: 'Operation',
          name: donation.intent_operation?.name || 'Unknown',
        };
      case 'unrestricted':
        return { type: 'Unrestricted', name: 'No specific intent' };
      default:
        return { type: 'Unknown', name: 'Unknown' };
    }
  };

  const intentDisplay = getIntentDisplay();

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
        }`}
      >
        <div className='flex min-h-full items-center justify-center p-4'>
          <div
            className={`relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 w-full max-w-4xl transform transition-all duration-300 ${
              isEntering && !isExiting
                ? 'scale-100 opacity-100'
                : 'scale-95 opacity-0'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800'>
              <div>
                <h2 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
                  Donation Details
                </h2>
                <p className='mt-1 text-sm text-neutral-500 dark:text-neutral-400'>
                  ID: {donation.id}
                </p>
              </div>
              <button
                onClick={handleClose}
                className='text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors'
              >
                <X className='h-6 w-6' />
              </button>
            </div>

            {/* Content */}
            <div className='p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto'>
              {/* Donation Info */}
              <div className='grid grid-cols-2 gap-6'>
                {/* Left Column */}
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      <User className='inline h-4 w-4 mr-1' />
                      Donor
                    </label>
                    <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {donation.user ? (
                        <>
                          <div className='font-medium'>
                            {donation.user.first_name} {donation.user.last_name}
                          </div>
                          <div className='text-neutral-500 dark:text-neutral-400'>
                            {donation.user.email}
                          </div>
                        </>
                      ) : donation.partner_org ? (
                        <>
                          <div className='font-medium'>
                            {donation.partner_org.name}
                          </div>
                          <div className='text-neutral-500 dark:text-neutral-400'>
                            Partner Organization
                          </div>
                        </>
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
                      Amount
                    </label>
                    <div className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
                      {formatCurrency(
                        donation.amount_cents,
                        donation.currency_code
                      )}
                      {donation.is_recurring && (
                        <span className='ml-2 text-sm font-normal text-primary-600 dark:text-primary-400'>
                          / month
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Status
                    </label>
                    <div>{getStatusBadge(donation.status)}</div>
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
                      <CreditCard className='inline h-4 w-4 mr-1' />
                      Payment Method
                    </label>
                    <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {donation.payment_method === 'card'
                        ? 'Credit Card'
                        : donation.payment_method === 'us_bank_account'
                          ? 'US Bank Account'
                          : 'SEPA Debit'}
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      <Calendar className='inline h-4 w-4 mr-1' />
                      Date
                    </label>
                    <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {formatDate(donation.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocation Summary */}
              <div className='bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4'>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                  Allocation Summary
                </h3>
                <div className='grid grid-cols-3 gap-4'>
                  <div>
                    <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Total Amount
                    </div>
                    <div className='text-xl font-bold text-neutral-900 dark:text-neutral-100'>
                      {formatCurrency(
                        donation.amount_cents,
                        donation.currency_code
                      )}
                    </div>
                  </div>
                  <div>
                    <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Allocated
                    </div>
                    <div className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                      {formatCurrency(
                        donation.allocated_cents,
                        donation.currency_code
                      )}
                    </div>
                  </div>
                  <div>
                    <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Remaining
                    </div>
                    <div className='text-xl font-bold text-green-600 dark:text-green-400'>
                      {formatCurrency(
                        donation.remaining_cents,
                        donation.currency_code
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocations List */}
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                    Allocations ({donation.allocations.length})
                  </h3>
                  {donation.remaining_cents > 0 && (
                    <button
                      onClick={() => setShowAddAllocation(!showAddAllocation)}
                      className='inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-lg transition-colors'
                    >
                      <Plus className='h-4 w-4 mr-1' />
                      Add Allocation
                    </button>
                  )}
                </div>

                {/* Add Allocation Form */}
                {showAddAllocation && (
                  <div className='mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800'>
                    <h4 className='text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3'>
                      New Allocation
                    </h4>
                    <div className='space-y-3'>
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                            Operation (optional)
                          </label>
                          <select
                            value={allocationOperationId}
                            onChange={e =>
                              setAllocationOperationId(e.target.value)
                            }
                            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                          >
                            <option value=''>Select operation</option>
                            {operations?.map(op => (
                              <option key={op.id} value={op.id}>
                                {op.name} ({op.category})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                            Project (optional)
                          </label>
                          <select
                            value={allocationProjectId}
                            onChange={e =>
                              setAllocationProjectId(e.target.value)
                            }
                            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                          >
                            <option value=''>Select project</option>
                            {projects?.map(proj => (
                              <option key={proj.id} value={proj.id}>
                                {proj.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                            Amount ({donation.currency_code})
                          </label>
                          <input
                            type='number'
                            step='0.01'
                            value={allocationAmountCents}
                            onChange={e =>
                              setAllocationAmountCents(e.target.value)
                            }
                            placeholder='0.00'
                            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                          />
                          <p className='mt-1 text-xs text-neutral-500 dark:text-neutral-400'>
                            Max:{' '}
                            {formatCurrency(
                              donation.remaining_cents,
                              donation.currency_code
                            )}
                          </p>
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                            Effective From
                          </label>
                          <input
                            type='date'
                            value={allocationEffectiveFrom}
                            onChange={e =>
                              setAllocationEffectiveFrom(e.target.value)
                            }
                            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                          Notes (optional)
                        </label>
                        <textarea
                          value={allocationNotes}
                          onChange={e => setAllocationNotes(e.target.value)}
                          rows={2}
                          className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                          placeholder='Add notes about this allocation'
                        />
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={handleAddAllocation}
                          disabled={createAllocationMutation.isPending}
                          className='px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50'
                        >
                          {createAllocationMutation.isPending
                            ? 'Creating...'
                            : 'Create Allocation'}
                        </button>
                        <button
                          onClick={() => setShowAddAllocation(false)}
                          className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors'
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Allocations Table */}
                {donation.allocations.length > 0 ? (
                  <div className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'>
                    <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                      <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                        <tr>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Operation / Project
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Amount
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Effective From
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                        {donation.allocations.map(allocation => (
                          <tr key={allocation.id}>
                            <td className='px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100'>
                              {allocation.operation_id ? (
                                <span className='font-medium'>
                                  Operation: {allocation.operation_id}
                                </span>
                              ) : allocation.project_id ? (
                                <span className='font-medium'>
                                  Project: {allocation.project_id}
                                </span>
                              ) : (
                                <span className='text-neutral-500 dark:text-neutral-400'>
                                  Unspecified
                                </span>
                              )}
                            </td>
                            <td className='px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                              {formatCurrency(
                                allocation.amount_cents,
                                allocation.currency_code
                              )}
                            </td>
                            <td className='px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400'>
                              {new Date(
                                allocation.effective_from
                              ).toLocaleDateString()}
                            </td>
                            <td className='px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400'>
                              {allocation.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='text-center py-8 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-lg'>
                    No allocations yet
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className='flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-800'>
              <button
                onClick={handleClose}
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
