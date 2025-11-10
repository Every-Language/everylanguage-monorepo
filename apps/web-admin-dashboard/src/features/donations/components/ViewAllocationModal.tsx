import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allocationsApi } from '../api/allocationsApi';
import type { AllocationWithDetails } from '@/types';
import {
  X,
  Edit,
  Save,
  Trash2,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react';

interface ViewAllocationModalProps {
  allocation: AllocationWithDetails;
  onClose: () => void;
  onUpdate: () => void;
}

export function ViewAllocationModal({
  allocation,
  onClose,
  onUpdate,
}: ViewAllocationModalProps) {
  const queryClient = useQueryClient();

  // State for animations
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editOperationId, setEditOperationId] = useState<string>(
    allocation.operation_id || ''
  );
  const [editProjectId, setEditProjectId] = useState<string>(
    allocation.project_id || ''
  );
  const [editAmountCents, setEditAmountCents] = useState<string>(
    (allocation.amount_cents / 100).toFixed(2)
  );
  const [editNotes, setEditNotes] = useState<string>(allocation.notes || '');
  const [editEffectiveFrom, setEditEffectiveFrom] = useState<string>(
    allocation.effective_from.split('T')[0]
  );
  const [editEffectiveTo, setEditEffectiveTo] = useState<string>(
    allocation.effective_to ? allocation.effective_to.split('T')[0] : ''
  );

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

  // Fetch operations for dropdown
  const { data: operations } = useQuery({
    queryKey: ['operations-list'],
    queryFn: () => allocationsApi.fetchOperations(),
  });

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => allocationsApi.fetchProjects(),
  });

  // Update allocation mutation
  const updateAllocationMutation = useMutation({
    mutationFn: (updates: {
      amount_cents?: number;
      operation_id?: string | null;
      project_id?: string | null;
      notes?: string | null;
      effective_from?: string;
      effective_to?: string | null;
    }) => allocationsApi.updateAllocation(allocation.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      onUpdate();
      setIsEditing(false);
    },
  });

  // Delete allocation mutation
  const deleteAllocationMutation = useMutation({
    mutationFn: () => allocationsApi.deleteAllocation(allocation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      onUpdate();
      handleClose();
    },
  });

  const handleSave = () => {
    const amountCents = Math.round(parseFloat(editAmountCents) * 100);

    if (!amountCents || amountCents <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!editOperationId && !editProjectId) {
      alert('Please select either an operation or a project');
      return;
    }

    updateAllocationMutation.mutate({
      amount_cents: amountCents,
      operation_id: editOperationId || null,
      project_id: editProjectId || null,
      notes: editNotes || null,
      effective_from: editEffectiveFrom,
      effective_to: editEffectiveTo || null,
    });
  };

  const handleDelete = () => {
    if (
      confirm(
        'Are you sure you want to delete this allocation? This action cannot be undone.'
      )
    ) {
      deleteAllocationMutation.mutate();
    }
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
            className={`relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 w-full max-w-3xl transform transition-all duration-300 ${
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
                  Allocation Details
                </h2>
                <p className='mt-1 text-sm text-neutral-500 dark:text-neutral-400'>
                  ID: {allocation.id}
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
              {!isEditing ? (
                /* View Mode */
                <>
                  {/* Allocation Info */}
                  <div className='grid grid-cols-2 gap-6'>
                    {/* Left Column */}
                    <div className='space-y-4'>
                      <div>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                          <DollarSign className='inline h-4 w-4 mr-1' />
                          Amount
                        </label>
                        <div className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
                          {formatCurrency(
                            allocation.amount_cents,
                            allocation.currency_code
                          )}
                        </div>
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                          Allocated To
                        </label>
                        <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                          {allocation.operation ? (
                            <>
                              <div className='font-medium'>
                                {allocation.operation.name}
                              </div>
                              <div className='text-neutral-500 dark:text-neutral-400'>
                                Operation · {allocation.operation.category}
                              </div>
                            </>
                          ) : allocation.project ? (
                            <>
                              <div className='font-medium'>
                                {allocation.project.name}
                              </div>
                              <div className='text-neutral-500 dark:text-neutral-400'>
                                Project · {allocation.project.project_status}
                              </div>
                            </>
                          ) : (
                            <span className='text-neutral-500 dark:text-neutral-400'>
                              Unspecified
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                          <Calendar className='inline h-4 w-4 mr-1' />
                          Effective Period
                        </label>
                        <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                          <div>
                            From:{' '}
                            {new Date(
                              allocation.effective_from
                            ).toLocaleDateString()}
                          </div>
                          <div>
                            To:{' '}
                            {allocation.effective_to
                              ? new Date(
                                  allocation.effective_to
                                ).toLocaleDateString()
                              : 'Ongoing'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className='space-y-4'>
                      <div>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                          Donation ID
                        </label>
                        <div className='text-sm font-mono text-neutral-900 dark:text-neutral-100'>
                          {allocation.donation_id}
                        </div>
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                          <User className='inline h-4 w-4 mr-1' />
                          Created By
                        </label>
                        <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                          {allocation.created_by_user ? (
                            <>
                              <div className='font-medium'>
                                {allocation.created_by_user.first_name}{' '}
                                {allocation.created_by_user.last_name}
                              </div>
                              <div className='text-neutral-500 dark:text-neutral-400'>
                                {allocation.created_by_user.email}
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
                          Created At
                        </label>
                        <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                          {formatDate(allocation.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                      Notes
                    </label>
                    <div className='bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-sm text-neutral-900 dark:text-neutral-100'>
                      {allocation.notes || (
                        <span className='italic text-neutral-500 dark:text-neutral-400'>
                          No notes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Donation Info */}
                  {allocation.donation && (
                    <div className='bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4'>
                      <h3 className='text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2'>
                        Donation Information
                      </h3>
                      <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            Total Amount:
                          </span>{' '}
                          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                            {formatCurrency(
                              allocation.donation.amount_cents,
                              allocation.currency_code
                            )}
                          </span>
                        </div>
                        <div>
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            Status:
                          </span>{' '}
                          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                            {allocation.donation.status}
                          </span>
                        </div>
                        <div>
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            Intent:
                          </span>{' '}
                          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                            {allocation.donation.intent_type}
                          </span>
                        </div>
                        <div>
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            Payment Method:
                          </span>{' '}
                          <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                            {allocation.donation.payment_method}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Edit Mode */
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Operation
                      </label>
                      <select
                        value={editOperationId}
                        onChange={e => setEditOperationId(e.target.value)}
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      >
                        <option value=''>None</option>
                        {operations?.map(op => (
                          <option key={op.id} value={op.id}>
                            {op.name} ({op.category})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Project
                      </label>
                      <select
                        value={editProjectId}
                        onChange={e => setEditProjectId(e.target.value)}
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      >
                        <option value=''>None</option>
                        {projects?.map(proj => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Amount ({allocation.currency_code})
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      value={editAmountCents}
                      onChange={e => setEditAmountCents(e.target.value)}
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Effective From
                      </label>
                      <input
                        type='date'
                        value={editEffectiveFrom}
                        onChange={e => setEditEffectiveFrom(e.target.value)}
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Effective To (optional)
                      </label>
                      <input
                        type='date'
                        value={editEffectiveTo}
                        onChange={e => setEditEffectiveTo(e.target.value)}
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Notes
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      rows={4}
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      placeholder='Add notes about this allocation'
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className='flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800'>
              <div>
                {!isEditing && (
                  <button
                    onClick={handleDelete}
                    disabled={deleteAllocationMutation.isPending}
                    className='px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center'
                  >
                    <Trash2 className='h-4 w-4 mr-1' />
                    {deleteAllocationMutation.isPending
                      ? 'Deleting...'
                      : 'Delete'}
                  </button>
                )}
              </div>
              <div className='flex items-center gap-3'>
                {!isEditing ? (
                  <>
                    <button
                      onClick={handleClose}
                      className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors'
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className='px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-lg transition-colors inline-flex items-center'
                    >
                      <Edit className='h-4 w-4 mr-1' />
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={updateAllocationMutation.isPending}
                      className='px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center'
                    >
                      <Save className='h-4 w-4 mr-1' />
                      {updateAllocationMutation.isPending
                        ? 'Saving...'
                        : 'Save'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
