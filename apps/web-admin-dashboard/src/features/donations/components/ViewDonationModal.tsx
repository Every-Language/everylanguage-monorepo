import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { donationsApi } from '../api/donationsApi';
import type { DonationWithAllocations } from '@/types';
import { X, Plus, DollarSign, Calendar, User, CreditCard } from 'lucide-react';

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
  const [allocationType, setAllocationType] = useState<'operation' | 'project'>(
    'operation'
  );
  const [allocationOperationId, setAllocationOperationId] =
    useState<string>('');
  const [allocationProjectId, setAllocationProjectId] = useState<string>('');
  const [allocationAmountCents, setAllocationAmountCents] =
    useState<string>('');
  const [allocationNotes, setAllocationNotes] = useState<string>('');
  const [allocationEffectiveFrom, setAllocationEffectiveFrom] =
    useState<string>(new Date().toISOString().split('T')[0]);

  // Search states
  const [operationSearchQuery, setOperationSearchQuery] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [debouncedOperationSearch, setDebouncedOperationSearch] = useState('');
  const [debouncedProjectSearch, setDebouncedProjectSearch] = useState('');
  const [showOperationDropdown, setShowOperationDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Pagination states for operations/projects lists
  const [operationPage, setOperationPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);
  const [accumulatedOperations, setAccumulatedOperations] = useState<
    Array<{ id: string; name: string; category: string }>
  >([]);
  const [accumulatedProjects, setAccumulatedProjects] = useState<
    Array<{
      id: string;
      name: string;
      target_language_entity_id: string | null;
      target_language_name: string | null;
    }>
  >([]);

  // Refs for click-outside detection
  const operationDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay to allow initial render, then trigger animation
    const timer = setTimeout(() => {
      setIsEntering(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOperationSearch(operationSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [operationSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProjectSearch(projectSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [projectSearchQuery]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  // Search operations (when search query >= 2 chars)
  const { data: searchedOperations = [] } = useQuery({
    queryKey: ['search-operations', debouncedOperationSearch],
    queryFn: () => donationsApi.searchOperations(debouncedOperationSearch, 50),
    enabled: debouncedOperationSearch.length >= 2,
  });

  // Fetch paginated operations (when no search query)
  const { data: paginatedOperationsData } = useQuery({
    queryKey: ['paginated-operations', operationPage],
    queryFn: () =>
      donationsApi.fetchOperationsPaginated({
        page: operationPage,
        pageSize: 20,
      }),
    enabled: debouncedOperationSearch.length < 2 && showOperationDropdown,
  });

  // Accumulate operations pages
  useEffect(() => {
    if (paginatedOperationsData?.data) {
      if (operationPage === 1) {
        setAccumulatedOperations(paginatedOperationsData.data);
      } else {
        setAccumulatedOperations(prev => {
          const existingIds = new Set(prev.map(op => op.id));
          const newOps = paginatedOperationsData.data.filter(
            op => !existingIds.has(op.id)
          );
          return [...prev, ...newOps];
        });
      }
    }
  }, [paginatedOperationsData, operationPage]);

  // Reset accumulated operations when search changes
  useEffect(() => {
    if (debouncedOperationSearch.length >= 2) {
      setAccumulatedOperations([]);
      setOperationPage(1);
    }
  }, [debouncedOperationSearch]);

  // Search projects (when search query >= 2 chars)
  const { data: searchedProjects = [] } = useQuery({
    queryKey: ['search-projects', debouncedProjectSearch],
    queryFn: () => donationsApi.searchProjects(debouncedProjectSearch, 50),
    enabled: debouncedProjectSearch.length >= 2,
  });

  // Fetch paginated projects (when no search query)
  const { data: paginatedProjectsData } = useQuery({
    queryKey: ['paginated-projects', projectPage],
    queryFn: () =>
      donationsApi.fetchProjectsPaginated({ page: projectPage, pageSize: 20 }),
    enabled: debouncedProjectSearch.length < 2 && showProjectDropdown,
  });

  // Accumulate projects pages
  useEffect(() => {
    if (paginatedProjectsData?.data) {
      if (projectPage === 1) {
        setAccumulatedProjects(paginatedProjectsData.data);
      } else {
        setAccumulatedProjects(prev => {
          const existingIds = new Set(prev.map(proj => proj.id));
          const newProjs = paginatedProjectsData.data.filter(
            proj => !existingIds.has(proj.id)
          );
          return [...prev, ...newProjs];
        });
      }
    }
  }, [paginatedProjectsData, projectPage]);

  // Reset accumulated projects when search changes
  useEffect(() => {
    if (debouncedProjectSearch.length >= 2) {
      setAccumulatedProjects([]);
      setProjectPage(1);
    }
  }, [debouncedProjectSearch]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        operationDropdownRef.current &&
        !operationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowOperationDropdown(false);
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Combine operations: search results or accumulated paginated list
  const displayOperations =
    debouncedOperationSearch.length >= 2
      ? searchedOperations
      : accumulatedOperations;

  // Combine projects: search results or accumulated paginated list
  const displayProjects =
    debouncedProjectSearch.length >= 2 ? searchedProjects : accumulatedProjects;

  // Fetch donation by ID to get latest data including allocations
  const { data: currentDonation } = useQuery({
    queryKey: ['donation', donation.id],
    queryFn: () => donationsApi.fetchDonationById(donation.id),
    enabled: !!donation.id,
    initialData: donation,
  });

  // Use currentDonation if available, otherwise fall back to donation prop
  const displayDonation = currentDonation || donation;

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
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['donation', donation.id] });
      onUpdate();
      setShowAddAllocation(false);
      // Reset form
      setAllocationType('operation');
      setAllocationOperationId('');
      setAllocationProjectId('');
      setAllocationAmountCents('');
      setAllocationNotes('');
      setAllocationEffectiveFrom(new Date().toISOString().split('T')[0]);
      setOperationSearchQuery('');
      setProjectSearchQuery('');
      setShowOperationDropdown(false);
      setShowProjectDropdown(false);
      setOperationPage(1);
      setProjectPage(1);
      setAccumulatedOperations([]);
      setAccumulatedProjects([]);
    },
  });

  const handleAddAllocation = () => {
    const amountCents = Math.round(parseFloat(allocationAmountCents) * 100);

    if (!amountCents || amountCents <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amountCents > displayDonation.remaining_cents) {
      alert(
        `Amount exceeds remaining donation balance (${formatCurrency(displayDonation.remaining_cents, displayDonation.currency_code)})`
      );
      return;
    }

    if (allocationType === 'operation' && !allocationOperationId) {
      alert('Please select an operation');
      return;
    }

    if (allocationType === 'project' && !allocationProjectId) {
      alert('Please select a project');
      return;
    }

    createAllocationMutation.mutate({
      donation_id: displayDonation.id,
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
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getIntentDisplay = () => {
    switch (displayDonation.intent_type) {
      case 'language':
        return {
          type: 'Language',
          name: displayDonation.intent_language?.name || 'Unknown',
        };
      case 'region':
        return {
          type: 'Region',
          name: displayDonation.intent_region?.name || 'Unknown',
        };
      case 'operation':
        return {
          type: 'Operation',
          name: displayDonation.intent_operation?.name || 'Unknown',
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
                  Donation Details
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
                      {displayDonation.user ? (
                        <>
                          <div className='font-medium'>
                            {displayDonation.user.first_name}{' '}
                            {displayDonation.user.last_name}
                          </div>
                          <div className='text-neutral-500 dark:text-neutral-400'>
                            {displayDonation.user.email}
                          </div>
                        </>
                      ) : displayDonation.partner_org ? (
                        <>
                          <div className='font-medium'>
                            {displayDonation.partner_org.name}
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
                        displayDonation.amount_cents,
                        displayDonation.currency_code
                      )}
                      {displayDonation.is_recurring && (
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
                    <div>{getStatusBadge(displayDonation.status)}</div>
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
                      {displayDonation.payment_method === 'card'
                        ? 'Credit Card'
                        : displayDonation.payment_method === 'us_bank_account'
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
                      {formatDate(displayDonation.created_at)}
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
                        displayDonation.amount_cents,
                        displayDonation.currency_code
                      )}
                    </div>
                  </div>
                  <div>
                    <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Allocated
                    </div>
                    <div className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                      {formatCurrency(
                        displayDonation.allocated_cents,
                        displayDonation.currency_code
                      )}
                    </div>
                  </div>
                  <div>
                    <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                      Remaining
                    </div>
                    <div className='text-xl font-bold text-green-600 dark:text-green-400'>
                      {formatCurrency(
                        displayDonation.remaining_cents,
                        displayDonation.currency_code
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocations List */}
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                    Allocations ({displayDonation.allocations.length})
                  </h3>
                  {displayDonation.remaining_cents > 0 && (
                    <button
                      onClick={() => setShowAddAllocation(!showAddAllocation)}
                      className='inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-lg transition-colors'>
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
                      {/* Tab Selector */}
                      <div className='flex gap-2 border-b border-neutral-200 dark:border-neutral-700'>
                        <button
                          type='button'
                          onClick={() => {
                            setAllocationType('operation');
                            setAllocationProjectId('');
                            setProjectSearchQuery('');
                            setShowProjectDropdown(false);
                            setProjectPage(1);
                            setAccumulatedProjects([]);
                          }}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            allocationType === 'operation'
                              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }`}>
                          Operation
                        </button>
                        <button
                          type='button'
                          onClick={() => {
                            setAllocationType('project');
                            setAllocationOperationId('');
                            setOperationSearchQuery('');
                            setShowOperationDropdown(false);
                            setOperationPage(1);
                            setAccumulatedOperations([]);
                          }}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            allocationType === 'project'
                              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }`}>
                          Project
                        </button>
                      </div>

                      {/* Operation or Project Selector */}
                      <div>
                        {allocationType === 'operation' ? (
                          <div className='space-y-2'>
                            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                              Operation{' '}
                              <span className='text-error-500'>*</span>
                            </label>
                            <div
                              className='relative'
                              ref={operationDropdownRef}>
                              <input
                                type='text'
                                value={operationSearchQuery}
                                onChange={e => {
                                  setOperationSearchQuery(e.target.value);
                                  setShowOperationDropdown(true);
                                }}
                                onFocus={() => setShowOperationDropdown(true)}
                                placeholder='Type to search operations...'
                                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                              />
                              {showOperationDropdown && (
                                <div className='absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                                  {displayOperations.length > 0 ? (
                                    <>
                                      {displayOperations.map(op => (
                                        <button
                                          key={op.id}
                                          type='button'
                                          onClick={() => {
                                            setAllocationOperationId(op.id);
                                            setOperationSearchQuery(
                                              `${op.name} (${op.category})`
                                            );
                                            setShowOperationDropdown(false);
                                          }}
                                          className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors ${
                                            allocationOperationId === op.id
                                              ? 'bg-primary-100 dark:bg-primary-900/30'
                                              : ''
                                          }`}>
                                          {op.name} ({op.category})
                                        </button>
                                      ))}
                                      {debouncedOperationSearch.length < 2 &&
                                        paginatedOperationsData &&
                                        operationPage <
                                          paginatedOperationsData.totalPages && (
                                          <button
                                            type='button'
                                            onClick={() => {
                                              setOperationPage(p => p + 1);
                                            }}
                                            className='w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-t border-neutral-200 dark:border-neutral-700'>
                                            Load more...
                                          </button>
                                        )}
                                    </>
                                  ) : (
                                    <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                                      {debouncedOperationSearch.length >= 2
                                        ? 'No operations found'
                                        : 'Loading...'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {allocationOperationId && (
                              <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                                Selected:{' '}
                                {displayOperations.find(
                                  op => op.id === allocationOperationId
                                )?.name || 'Operation'}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                              Project <span className='text-error-500'>*</span>
                            </label>
                            <div className='relative' ref={projectDropdownRef}>
                              <input
                                type='text'
                                value={projectSearchQuery}
                                onChange={e => {
                                  setProjectSearchQuery(e.target.value);
                                  setShowProjectDropdown(true);
                                }}
                                onFocus={() => setShowProjectDropdown(true)}
                                placeholder='Type to search projects...'
                                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                              />
                              {showProjectDropdown && (
                                <div className='absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                                  {displayProjects.length > 0 ? (
                                    <>
                                      {displayProjects.map(proj => (
                                        <button
                                          key={proj.id}
                                          type='button'
                                          onClick={() => {
                                            setAllocationProjectId(proj.id);
                                            setProjectSearchQuery(
                                              proj.target_language_name
                                                ? `${proj.name} (${proj.target_language_name})`
                                                : proj.name
                                            );
                                            setShowProjectDropdown(false);
                                          }}
                                          className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors ${
                                            allocationProjectId === proj.id
                                              ? 'bg-primary-100 dark:bg-primary-900/30'
                                              : ''
                                          }`}>
                                          {proj.name}
                                          {proj.target_language_name &&
                                            ` (${proj.target_language_name})`}
                                        </button>
                                      ))}
                                      {debouncedProjectSearch.length < 2 &&
                                        paginatedProjectsData &&
                                        projectPage <
                                          paginatedProjectsData.totalPages && (
                                          <button
                                            type='button'
                                            onClick={() => {
                                              setProjectPage(p => p + 1);
                                            }}
                                            className='w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-t border-neutral-200 dark:border-neutral-700'>
                                            Load more...
                                          </button>
                                        )}
                                    </>
                                  ) : (
                                    <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                                      {debouncedProjectSearch.length >= 2
                                        ? 'No projects found'
                                        : 'Loading...'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {allocationProjectId && (
                              <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                                Selected:{' '}
                                {(() => {
                                  const selected = displayProjects.find(
                                    proj => proj.id === allocationProjectId
                                  );
                                  return selected
                                    ? selected.target_language_name
                                      ? `${selected.name} (${selected.target_language_name})`
                                      : selected.name
                                    : 'Project';
                                })()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                            Amount ({displayDonation.currency_code})
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
                              displayDonation.remaining_cents,
                              displayDonation.currency_code
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
                          className='px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50'>
                          {createAllocationMutation.isPending
                            ? 'Creating...'
                            : 'Create Allocation'}
                        </button>
                        <button
                          onClick={() => setShowAddAllocation(false)}
                          className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors'>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Allocations Table */}
                {displayDonation.allocations.length > 0 ? (
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
                        {displayDonation.allocations.map(allocation => (
                          <tr key={allocation.id}>
                            <td className='px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100'>
                              {allocation.operation ? (
                                <>
                                  <div className='font-medium'>
                                    {allocation.operation.name}
                                  </div>
                                  {allocation.operation.category && (
                                    <div className='text-neutral-500 dark:text-neutral-400 text-xs mt-0.5'>
                                      Operation ·{' '}
                                      {allocation.operation.category}
                                    </div>
                                  )}
                                </>
                              ) : allocation.project ? (
                                <>
                                  <div className='font-medium'>
                                    {allocation.project.name}
                                    {allocation.project.target_language && (
                                      <span className='text-neutral-500 dark:text-neutral-400 font-normal'>
                                        {' '}
                                        (
                                        {
                                          allocation.project.target_language
                                            .name
                                        }
                                        )
                                      </span>
                                    )}
                                  </div>
                                </>
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
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors'>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
