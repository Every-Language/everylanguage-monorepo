import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { donationsApi } from '../api/donationsApi';
import { allocationsApi } from '../api/allocationsApi';
import { ViewDonationModal } from '../components/ViewDonationModal';
import { ViewAllocationModal } from '../components/ViewAllocationModal';
import { AddDonationModal } from '../components/AddDonationModal';
import type { DonationWithAllocations, AllocationWithDetails } from '@/types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { languagesApi } from '../../languages/api/languagesApi';
import { subscriptionsApi } from '../../subscriptions/api/subscriptionsApi';
import { UserModal } from '../../users/components/UserModal';
import { PartnerOrgModal } from '../../users/components/PartnerOrgModal';
import type { UserWithRoles, PartnerOrgWithUsers } from '../../users/types';

type DonationSortField = 'date' | 'amount' | 'remaining' | 'donor';
type SortDirection = 'asc' | 'desc';

// Type for allocation with nested operation and project from Supabase query
type AllocationWithNested = {
  id: string;
  amount_cents: number;
  donation_id: string;
  operation_id: string | null;
  project_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  effective_from: string;
  effective_to: string | null;
  currency_code: string;
  operation?: { id: string; name: string; category: string } | null;
  project?: {
    id: string;
    name: string;
    target_language_entity_id: string | null;
    target_language?: { id: string; name: string; level: string } | null;
  } | null;
};

export function DonationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [intentTypeFilter, setIntentTypeFilter] = useState<string>('all');
  const [onlyUnallocated, setOnlyUnallocated] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [operationFilter, setOperationFilter] = useState<{
    id: string;
    name: string;
    category?: string | null;
  } | null>(null);
  const [regionFilter, setRegionFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');
  const [operationSearchTerm, setOperationSearchTerm] = useState('');
  const [regionSearchTerm, setRegionSearchTerm] = useState('');
  const [debouncedLanguageSearch, setDebouncedLanguageSearch] = useState('');
  const [debouncedOperationSearch, setDebouncedOperationSearch] = useState('');
  const [debouncedRegionSearch, setDebouncedRegionSearch] = useState('');
  const [showOperationDropdown, setShowOperationDropdown] = useState(false);
  const [operationPage, setOperationPage] = useState(1);
  const [accumulatedOperations, setAccumulatedOperations] = useState<
    Array<{ id: string; name: string; category: string }>
  >([]);
  const operationDropdownRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<DonationSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedDonation, setSelectedDonation] =
    useState<DonationWithAllocations | null>(null);
  const [selectedAllocation, setSelectedAllocation] =
    useState<AllocationWithDetails | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedPartnerOrg, setSelectedPartnerOrg] =
    useState<PartnerOrgWithUsers | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLanguageSearch(languageSearchTerm);
    }, 250);

    return () => clearTimeout(timer);
  }, [languageSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOperationSearch(operationSearchTerm);
    }, 250);

    return () => clearTimeout(timer);
  }, [operationSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRegionSearch(regionSearchTerm);
    }, 250);

    return () => clearTimeout(timer);
  }, [regionSearchTerm]);

  const { data: languageSearchResults = [] } = useQuery({
    queryKey: ['donation-language-filter', debouncedLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(debouncedLanguageSearch),
    enabled: debouncedLanguageSearch.length >= 2,
  });

  const { data: operationSearchResults = [] } = useQuery({
    queryKey: ['donation-operation-filter', debouncedOperationSearch],
    queryFn: () => donationsApi.searchOperations(debouncedOperationSearch, 20),
    enabled: debouncedOperationSearch.length >= 2,
  });

  const { data: regionSearchResults = [] } = useQuery({
    queryKey: ['donation-region-filter', debouncedRegionSearch],
    queryFn: () => subscriptionsApi.searchRegions(debouncedRegionSearch, 50),
    enabled: debouncedRegionSearch.length >= 2,
  });

  // Fetch paginated operations (when no search query)
  const { data: paginatedOperationsData } = useQuery({
    queryKey: ['donation-paginated-operations', operationPage],
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

  // Combine operations: search results or accumulated paginated list
  const displayOperations =
    debouncedOperationSearch.length >= 2
      ? operationSearchResults
      : accumulatedOperations;

  // Click outside handler for operation dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        operationDropdownRef.current &&
        !operationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowOperationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch donations with pagination and filters
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'donations',
      page,
      pageSize,
      statusFilter,
      intentTypeFilter,
      onlyUnallocated,
      languageFilter?.id ?? null,
      operationFilter?.id ?? null,
      regionFilter?.id ?? null,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      donationsApi.fetchDonations({
        page,
        pageSize,
        statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
        intentTypeFilter:
          intentTypeFilter !== 'all' ? intentTypeFilter : undefined,
        intentLanguageId: languageFilter?.id,
        intentOperationId: operationFilter?.id,
        intentRegionId: regionFilter?.id,
        sortField,
        sortDirection,
        onlyUnallocated,
      }),
  });

  const donations = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;
  const hasActiveFilters =
    statusFilter !== 'all' ||
    intentTypeFilter !== 'all' ||
    onlyUnallocated ||
    !!languageFilter ||
    !!operationFilter;
  const emptyMessage = onlyUnallocated
    ? 'No unallocated donations found'
    : hasActiveFilters
      ? 'No donations found matching your filters'
      : 'No donations found';

  const toggledDirection = (field: DonationSortField): SortDirection => {
    if (sortField !== field) return 'desc';
    return sortDirection === 'asc' ? 'desc' : 'asc';
  };

  const handleSort = (field: DonationSortField) => {
    setSortDirection(toggledDirection(field));
    setSortField(field);
    setPage(1);
  };

  const getSortIndicator = (field: DonationSortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleDonationClick = (donation: DonationWithAllocations) => {
    setSelectedDonation(donation);
  };

  const handleUserClick = async (
    e: React.MouseEvent,
    userId: string | null
  ) => {
    e.stopPropagation();
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

  const handlePartnerOrgClick = async (
    e: React.MouseEvent,
    partnerOrgId: string | null
  ) => {
    e.stopPropagation();
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

  const handleCloseModal = () => {
    setSelectedDonation(null);
  };

  const handleDonationUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ['donations'],
    });
  };

  const handleAllocationClick = async (
    e: React.MouseEvent,
    allocationId: string
  ) => {
    e.stopPropagation(); // Prevent row click
    try {
      const allocation = await allocationsApi.fetchAllocationById(allocationId);
      if (allocation) {
        setSelectedAllocation(allocation);
      }
    } catch (error) {
      console.error('Failed to fetch allocation:', error);
    }
  };

  const handleCloseAllocationModal = () => {
    setSelectedAllocation(null);
  };

  const handleAllocationUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ['allocations'],
    });
    queryClient.invalidateQueries({
      queryKey: ['donations'],
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

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-start justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Donations
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage donations and allocations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors'>
          <Plus className='h-4 w-4' />
          Add Donation
        </button>
      </div>

      {/* Filters */}
      <div className='mb-6 space-y-4'>
        <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
          {/* Status Filter */}
          <Select
            label='Status'
            value={statusFilter}
            onValueChange={value => {
              setStatusFilter(value);
              setPage(1);
            }}>
            <SelectItem value='all'>All Statuses</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='processing'>Processing</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
            <SelectItem value='failed'>Failed</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
          </Select>

          {/* Intent Type Filter */}
          <Select
            label='Intent Type'
            value={intentTypeFilter}
            onValueChange={value => {
              setIntentTypeFilter(value);
              setPage(1);
            }}>
            <SelectItem value='all'>All Intent Types</SelectItem>
            <SelectItem value='language'>Language</SelectItem>
            <SelectItem value='region'>Region</SelectItem>
            <SelectItem value='operation'>Operation</SelectItem>
            <SelectItem value='unrestricted'>Unrestricted</SelectItem>
          </Select>

          {/* Language filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Language Intent
            </label>
            {languageFilter ? (
              <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900'>
                <div>
                  <p className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    {languageFilter.name}
                  </p>
                  <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                    Language
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setLanguageFilter(null);
                    setPage(1);
                  }}
                  className='text-xs text-primary-600 dark:text-primary-400 hover:underline'>
                  Clear
                </button>
              </div>
            ) : (
              <div className='relative'>
                <input
                  type='text'
                  value={languageSearchTerm}
                  onChange={e => setLanguageSearchTerm(e.target.value)}
                  placeholder='Search languages...'
                  className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
                />
                {debouncedLanguageSearch.length >= 2 && (
                  <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                    {languageSearchResults.length === 0 ? (
                      <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                        No matches
                      </div>
                    ) : (
                      languageSearchResults.map(language => (
                        <button
                          key={language.id}
                          type='button'
                          onClick={() => {
                            setLanguageFilter({
                              id: language.id,
                              name: language.name,
                            });
                            setLanguageSearchTerm('');
                            setDebouncedLanguageSearch('');
                            setIntentTypeFilter('language');
                            setPage(1);
                          }}
                          className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                          {language.name}{' '}
                          <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                            ({language.level})
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Operation filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Operation Intent
            </label>
            {operationFilter ? (
              <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900'>
                <div>
                  <p className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    {operationFilter.name}
                  </p>
                  <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                    {operationFilter.category || 'Operation'}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setOperationFilter(null);
                    setPage(1);
                  }}
                  className='text-xs text-primary-600 dark:text-primary-400 hover:underline'>
                  Clear
                </button>
              </div>
            ) : (
              <div className='relative' ref={operationDropdownRef}>
                <input
                  type='text'
                  value={operationSearchTerm}
                  onChange={e => {
                    setOperationSearchTerm(e.target.value);
                    setShowOperationDropdown(true);
                  }}
                  onFocus={() => setShowOperationDropdown(true)}
                  placeholder='Search operations...'
                  className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
                />
                {showOperationDropdown && (
                  <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                    {displayOperations.length > 0 ? (
                      <>
                        {displayOperations.map(operation => (
                          <button
                            key={operation.id}
                            type='button'
                            onClick={() => {
                              setOperationFilter({
                                id: operation.id,
                                name: operation.name,
                                category: operation.category,
                              });
                              setOperationSearchTerm('');
                              setDebouncedOperationSearch('');
                              setShowOperationDropdown(false);
                              setIntentTypeFilter('operation');
                              setPage(1);
                            }}
                            className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                            {operation.name}{' '}
                            <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                              ({operation.category || 'operation'})
                            </span>
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
                          ? 'No matches'
                          : 'Loading...'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Region filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Region Intent
            </label>
            {regionFilter ? (
              <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900'>
                <div>
                  <p className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    {regionFilter.name}
                  </p>
                  <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                    Region
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setRegionFilter(null);
                    setPage(1);
                  }}
                  className='text-xs text-primary-600 dark:text-primary-400 hover:underline'>
                  Clear
                </button>
              </div>
            ) : (
              <div className='relative'>
                <input
                  type='text'
                  value={regionSearchTerm}
                  onChange={e => setRegionSearchTerm(e.target.value)}
                  placeholder='Search regions...'
                  className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
                />
                {debouncedRegionSearch.length >= 2 && (
                  <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                    {regionSearchResults.length === 0 ? (
                      <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                        No matches
                      </div>
                    ) : (
                      regionSearchResults.map(region => (
                        <button
                          key={region.id}
                          type='button'
                          onClick={() => {
                            setRegionFilter({
                              id: region.id,
                              name: region.name,
                            });
                            setRegionSearchTerm('');
                            setDebouncedRegionSearch('');
                            setIntentTypeFilter('region');
                            setPage(1);
                          }}
                          className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                          {region.name}{' '}
                          <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                            ({region.level})
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className='flex items-center cursor-pointer'>
            <input
              type='checkbox'
              checked={onlyUnallocated}
              onChange={e => {
                setOnlyUnallocated(e.target.checked);
                setPage(1);
              }}
              className='w-4 h-4 text-primary-600 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 rounded focus:ring-primary-500 dark:focus:ring-primary-600'
            />
            <span className='ml-2 text-sm text-neutral-700 dark:text-neutral-300'>
              Show only unallocated
            </span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading donations...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    <button
                      type='button'
                      onClick={() => handleSort('date')}
                      className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                      Date
                      <span>{getSortIndicator('date')}</span>
                    </button>
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Source
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    <button
                      type='button'
                      onClick={() => handleSort('donor')}
                      className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                      User
                      <span>{getSortIndicator('donor')}</span>
                    </button>
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Partner Org
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    <button
                      type='button'
                      onClick={() => handleSort('amount')}
                      className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                      Amount
                      <span>{getSortIndicator('amount')}</span>
                    </button>
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Intent
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Allocations
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    <button
                      type='button'
                      onClick={() => handleSort('remaining')}
                      className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                      Remaining
                      <span>{getSortIndicator('remaining')}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {donations && donations.length > 0 ? (
                  donations.map(donation => (
                    <tr
                      key={donation.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleDonationClick(donation)}>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(donation.created_at)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        {getStatusBadge(donation.status)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
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
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                        {donation.user ? (
                          <button
                            onClick={e => handleUserClick(e, donation.user_id)}
                            className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                            <div className='font-medium'>
                              {donation.user.first_name}{' '}
                              {donation.user.last_name}
                            </div>
                            <div className='text-neutral-500 dark:text-neutral-400 text-xs'>
                              {donation.user.email}
                            </div>
                          </button>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            —
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                        {donation.partner_org ? (
                          <button
                            onClick={e =>
                              handlePartnerOrgClick(e, donation.partner_org_id)
                            }
                            className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                            <div className='font-medium'>
                              {donation.partner_org.name}
                            </div>
                            <div className='text-neutral-500 dark:text-neutral-400 text-xs'>
                              Partner Org
                            </div>
                          </button>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            —
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {formatCurrency(
                          donation.amount_cents,
                          donation.currency_code
                        )}
                        {donation.is_recurring && (
                          <span className='ml-2 text-xs text-primary-600 dark:text-primary-400'>
                            recurring
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        <div>
                          <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                            {donation.intent_type}
                          </span>
                        </div>
                        <div className='mt-1 text-xs'>
                          {getIntentDisplay(donation)}
                        </div>
                      </td>
                      <td className='px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100'>
                        {donation.allocations &&
                        donation.allocations.length > 0 ? (
                          <div className='space-y-1'>
                            {donation.allocations.map(allocation => (
                              <button
                                key={allocation.id}
                                onClick={e =>
                                  handleAllocationClick(e, allocation.id)
                                }
                                className='block text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                                {formatCurrency(
                                  allocation.amount_cents,
                                  allocation.currency_code ||
                                    donation.currency_code
                                )}
                                {(allocation as AllocationWithNested).operation
                                  ? ` → ${(allocation as AllocationWithNested).operation!.name}`
                                  : (allocation as AllocationWithNested).project
                                    ? ` → ${(allocation as AllocationWithNested).project!.name}`
                                    : ''}
                              </button>
                            ))}
                            <div className='pt-1 mt-1 border-t border-neutral-200 dark:border-neutral-700'>
                              <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                                Total:{' '}
                                {formatCurrency(
                                  donation.allocated_cents,
                                  donation.currency_code
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400 italic'>
                            No allocations
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                        <span
                          className={
                            donation.remaining_cents > 0
                              ? 'font-medium text-green-600 dark:text-green-400'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }>
                          {formatCurrency(
                            donation.remaining_cents,
                            donation.currency_code
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className='mt-4 flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800'>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Page {page} of {totalPages} ({totalCount.toLocaleString()} total)
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                <ChevronLeft className='h-4 w-4' />
              </button>
              <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                {((page - 1) * pageSize + 1).toLocaleString()} -{' '}
                {Math.min(page * pageSize, totalCount).toLocaleString()}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Donation Modal */}
      {selectedDonation && (
        <ViewDonationModal
          donation={selectedDonation}
          onClose={handleCloseModal}
          onUpdate={handleDonationUpdated}
        />
      )}

      {/* View Allocation Modal */}
      {selectedAllocation && (
        <ViewAllocationModal
          allocation={selectedAllocation}
          onClose={handleCloseAllocationModal}
          onUpdate={handleAllocationUpdated}
        />
      )}

      {/* Add Donation Modal */}
      {showAddModal && (
        <AddDonationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['donations'] });
            setShowAddModal(false);
          }}
        />
      )}

      {/* User Modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['donations'] });
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
            queryClient.invalidateQueries({ queryKey: ['donations'] });
          }}
        />
      )}
    </div>
  );
}
