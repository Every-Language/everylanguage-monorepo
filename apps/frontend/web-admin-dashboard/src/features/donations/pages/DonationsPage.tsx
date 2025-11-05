import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { donationsApi } from '../api/donationsApi';
import { ViewDonationModal } from '../components/ViewDonationModal';
import type { DonationWithAllocations } from '@/types';
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';

export function DonationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [intentTypeFilter, setIntentTypeFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [onlyUnallocated, setOnlyUnallocated] = useState(false);
  const [selectedDonation, setSelectedDonation] =
    useState<DonationWithAllocations | null>(null);

  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch donations with pagination and filters
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'donations',
      page,
      pageSize,
      debouncedSearch,
      statusFilter,
      intentTypeFilter,
      paymentMethodFilter,
      onlyUnallocated,
    ],
    queryFn: () =>
      donationsApi.fetchDonations({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
        intentTypeFilter:
          intentTypeFilter !== 'all' ? intentTypeFilter : undefined,
        paymentMethodFilter:
          paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
        onlyUnallocated,
      }),
  });

  const donations = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleDonationClick = (donation: DonationWithAllocations) => {
    setSelectedDonation(donation);
  };

  const handleCloseModal = () => {
    setSelectedDonation(null);
  };

  const handleDonationUpdated = () => {
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
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}
      >
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
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Donations
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          Manage donations and allocations
        </p>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search donations by donor name, email, or intent...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
        {debouncedSearch && (
          <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
            Showing {donations.length} results for "{debouncedSearch}"
          </p>
        )}
      </div>

      {/* Filters */}
      <div className='mb-6 grid grid-cols-1 md:grid-cols-4 gap-4'>
        {/* Status Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          >
            <option value='all'>All Statuses</option>
            <option value='pending'>Pending</option>
            <option value='processing'>Processing</option>
            <option value='completed'>Completed</option>
            <option value='failed'>Failed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </div>

        {/* Intent Type Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Intent Type
          </label>
          <select
            value={intentTypeFilter}
            onChange={e => {
              setIntentTypeFilter(e.target.value);
              setPage(1);
            }}
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          >
            <option value='all'>All Intent Types</option>
            <option value='language'>Language</option>
            <option value='region'>Region</option>
            <option value='operation'>Operation</option>
            <option value='unrestricted'>Unrestricted</option>
          </select>
        </div>

        {/* Payment Method Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Payment Method
          </label>
          <select
            value={paymentMethodFilter}
            onChange={e => {
              setPaymentMethodFilter(e.target.value);
              setPage(1);
            }}
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          >
            <option value='all'>All Payment Methods</option>
            <option value='card'>Card</option>
            <option value='us_bank_account'>US Bank Account</option>
            <option value='sepa_debit'>SEPA Debit</option>
          </select>
        </div>

        {/* Unallocated Filter */}
        <div className='flex items-end'>
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
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Donor
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Amount
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Intent
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Allocated
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Remaining
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Date
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {donations && donations.length > 0 ? (
                  donations.map(donation => (
                    <tr
                      key={donation.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleDonationClick(donation)}
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                        {donation.user ? (
                          <div>
                            <div className='font-medium'>
                              {donation.user.first_name}{' '}
                              {donation.user.last_name}
                            </div>
                            <div className='text-neutral-500 dark:text-neutral-400 text-xs'>
                              {donation.user.email}
                            </div>
                          </div>
                        ) : donation.partner_org ? (
                          <div>
                            <div className='font-medium'>
                              {donation.partner_org.name}
                            </div>
                            <div className='text-neutral-500 dark:text-neutral-400 text-xs'>
                              Partner Org
                            </div>
                          </div>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            Unknown
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
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatCurrency(
                          donation.allocated_cents,
                          donation.currency_code
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                        <span
                          className={
                            donation.remaining_cents > 0
                              ? 'font-medium text-green-600 dark:text-green-400'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }
                        >
                          {formatCurrency(
                            donation.remaining_cents,
                            donation.currency_code
                          )}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        {getStatusBadge(donation.status)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(donation.created_at)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDonationClick(donation);
                          }}
                          className='text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 inline-flex items-center transition-colors'
                        >
                          <Eye className='h-4 w-4 mr-1' />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                    >
                      {debouncedSearch
                        ? 'No donations found matching your search'
                        : onlyUnallocated
                          ? 'No unallocated donations found'
                          : 'No donations found'}
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
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronLeft className='h-4 w-4' />
              </button>
              <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                {((page - 1) * pageSize + 1).toLocaleString()} -{' '}
                {Math.min(page * pageSize, totalCount).toLocaleString()}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
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
    </div>
  );
}
