import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '../api/subscriptionsApi';
import { ViewSubscriptionModal } from '../components/ViewSubscriptionModal';
import type { SubscriptionWithDonations } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { languagesApi } from '../../languages/api/languagesApi';
import { donationsApi } from '../../donations/api/donationsApi';
import { UserModal } from '../../users/components/UserModal';
import { PartnerOrgModal } from '../../users/components/PartnerOrgModal';
import type { UserWithRoles } from '../../users/types';
import type { PartnerOrgWithUsers } from '../../users/types';

type SubscriptionSortField = 'date' | 'amount' | 'next_payment';
type SortDirection = 'asc' | 'desc';

export function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [intentTypeFilter, setIntentTypeFilter] = useState<string>('all');
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
  const [sortField, setSortField] = useState<SubscriptionSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionWithDonations | null>(null);
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
    queryKey: ['subscription-language-filter', debouncedLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(debouncedLanguageSearch),
    enabled: debouncedLanguageSearch.length >= 2,
  });

  const { data: operationSearchResults = [] } = useQuery({
    queryKey: ['subscription-operation-filter', debouncedOperationSearch],
    queryFn: () => donationsApi.searchOperations(debouncedOperationSearch, 20),
    enabled: debouncedOperationSearch.length >= 2,
  });

  const { data: regionSearchResults = [] } = useQuery({
    queryKey: ['subscription-region-filter', debouncedRegionSearch],
    queryFn: () => subscriptionsApi.searchRegions(debouncedRegionSearch, 20),
    enabled: debouncedRegionSearch.length >= 2,
  });

  // Fetch paginated operations (when no search query)
  const { data: paginatedOperationsData } = useQuery({
    queryKey: ['subscription-paginated-operations', operationPage],
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

  // Fetch subscriptions with pagination and filters
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'subscriptions',
      page,
      pageSize,
      statusFilter,
      intentTypeFilter,
      languageFilter?.id ?? null,
      operationFilter?.id ?? null,
      regionFilter?.id ?? null,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      subscriptionsApi.fetchSubscriptions({
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
      }),
  });

  const subscriptions = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;
  const hasActiveFilters =
    statusFilter !== 'all' ||
    intentTypeFilter !== 'all' ||
    !!languageFilter ||
    !!operationFilter ||
    !!regionFilter;

  const toggledDirection = (field: SubscriptionSortField): SortDirection => {
    if (sortField !== field) return 'desc';
    return sortDirection === 'asc' ? 'desc' : 'asc';
  };

  const handleSort = (field: SubscriptionSortField) => {
    setSortDirection(toggledDirection(field));
    setSortField(field);
    setPage(1);
  };

  const getSortIndicator = (field: SubscriptionSortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleSubscriptionClick = (subscription: SubscriptionWithDonations) => {
    setSelectedSubscription(subscription);
  };

  const handleCloseModal = () => {
    setSelectedSubscription(null);
  };

  const handleSubscriptionUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ['subscriptions'],
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

  const getFrequencyDisplay = (subscription: SubscriptionWithDonations) => {
    const amount = formatCurrency(
      subscription.amount_cents,
      subscription.currency_code
    );
    const interval = subscription.interval_type === 'month' ? 'month' : 'year';
    return `${amount} / ${interval}`;
  };

  const handleUserClick = async (
    e: React.MouseEvent,
    userId: string | null
  ) => {
    e.stopPropagation();
    if (!userId) return;
    // Fetch user data - we'll need to import usersApi
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

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-start justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Subscriptions
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage customer subscriptions
          </p>
        </div>
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
            <SelectItem value='active'>Active</SelectItem>
            <SelectItem value='canceled'>Canceled</SelectItem>
            <SelectItem value='past_due'>Past Due</SelectItem>
            <SelectItem value='unpaid'>Unpaid</SelectItem>
            <SelectItem value='incomplete'>Incomplete</SelectItem>
            <SelectItem value='trialing'>Trialing</SelectItem>
            <SelectItem value='paused'>Paused</SelectItem>
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
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading subscriptions...
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
                    Donor
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Partner Org
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    <button
                      type='button'
                      onClick={() => handleSort('amount')}
                      className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                      Amount + Frequency
                      <span>{getSortIndicator('amount')}</span>
                    </button>
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    <button
                      type='button'
                      onClick={() => handleSort('next_payment')}
                      className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                      Next Payment Date
                      <span>{getSortIndicator('next_payment')}</span>
                    </button>
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Intent
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {subscriptions && subscriptions.length > 0 ? (
                  subscriptions.map(subscription => (
                    <tr
                      key={subscription.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleSubscriptionClick(subscription)}>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(subscription.created_at)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        {getStatusBadge(subscription.status)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                        {subscription.user ? (
                          <button
                            onClick={e =>
                              handleUserClick(e, subscription.user_id)
                            }
                            className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                            <div className='font-medium'>
                              {subscription.user.first_name}{' '}
                              {subscription.user.last_name}
                            </div>
                            <div className='text-neutral-500 dark:text-neutral-400 text-xs'>
                              {subscription.user.email}
                            </div>
                          </button>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            —
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                        {subscription.partner_org ? (
                          <button
                            onClick={e =>
                              handlePartnerOrgClick(
                                e,
                                subscription.partner_org_id
                              )
                            }
                            className='text-left text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 hover:underline transition-colors'>
                            <div className='font-medium'>
                              {subscription.partner_org.name}
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
                        {getFrequencyDisplay(subscription)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatNextPaymentDate(subscription.current_period_end)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
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
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                      {hasActiveFilters
                        ? 'No subscriptions found matching your filters'
                        : 'No subscriptions found'}
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

      {/* View Subscription Modal */}
      {selectedSubscription && (
        <ViewSubscriptionModal
          subscription={selectedSubscription}
          onClose={handleCloseModal}
          onUpdate={handleSubscriptionUpdated}
        />
      )}

      {/* User Modal */}
      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
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
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
          }}
        />
      )}
    </div>
  );
}
