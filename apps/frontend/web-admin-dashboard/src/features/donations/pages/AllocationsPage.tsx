import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { allocationsApi } from '../api/allocationsApi';
import { ViewAllocationModal } from '../components/ViewAllocationModal';
import type { AllocationWithDetails } from '@/types';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export function AllocationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedAllocation, setSelectedAllocation] =
    useState<AllocationWithDetails | null>(null);

  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch operations for filter
  const { data: operations } = useQuery({
    queryKey: ['operations-list'],
    queryFn: () => allocationsApi.fetchOperations(),
  });

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => allocationsApi.fetchProjects(),
  });

  // Fetch allocations with pagination and filters
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'allocations',
      page,
      pageSize,
      debouncedSearch,
      operationFilter,
      projectFilter,
    ],
    queryFn: () =>
      allocationsApi.fetchAllocations({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        operationFilter:
          operationFilter !== 'all' ? operationFilter : undefined,
        projectFilter: projectFilter !== 'all' ? projectFilter : undefined,
      }),
  });

  const allocations = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleAllocationClick = (allocation: AllocationWithDetails) => {
    setSelectedAllocation(allocation);
  };

  const handleCloseModal = () => {
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

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Allocations
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          View and manage donation allocations
        </p>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search allocations by operation, project, or notes...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
        {debouncedSearch && (
          <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
            Showing {allocations.length} results for "{debouncedSearch}"
          </p>
        )}
      </div>

      {/* Filters */}
      <div className='mb-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Operation Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Operation
          </label>
          <select
            value={operationFilter}
            onChange={e => {
              setOperationFilter(e.target.value);
              setPage(1);
            }}
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          >
            <option value='all'>All Operations</option>
            {operations?.map(op => (
              <option key={op.id} value={op.id}>
                {op.name} ({op.category})
              </option>
            ))}
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Project
          </label>
          <select
            value={projectFilter}
            onChange={e => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          >
            <option value='all'>All Projects</option>
            {projects?.map(proj => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading allocations...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Operation / Project
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Amount
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Donation ID
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Effective From
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Created By
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Notes
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {allocations && allocations.length > 0 ? (
                  allocations.map(allocation => (
                    <tr
                      key={allocation.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleAllocationClick(allocation)}
                    >
                      <td className='px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100'>
                        {allocation.operation ? (
                          <div>
                            <div className='font-medium'>
                              {allocation.operation.name}
                            </div>
                            <div className='text-neutral-500 dark:text-neutral-400 text-xs'>
                              Operation · {allocation.operation.category}
                            </div>
                          </div>
                        ) : allocation.project ? (
                          <div>
                            <div className='font-medium'>
                              {allocation.project.name}
                            </div>
                            <div className='text-neutral-500 dark:text-neutral-400 text-xs'>
                              Project · {allocation.project.project_status}
                            </div>
                          </div>
                        ) : (
                          <span className='text-neutral-500 dark:text-neutral-400'>
                            Unspecified
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {formatCurrency(
                          allocation.amount_cents,
                          allocation.currency_code
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 font-mono'>
                        {allocation.donation_id.slice(0, 8)}...
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatDate(allocation.effective_from)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {allocation.created_by_user ? (
                          <div>
                            <div>
                              {allocation.created_by_user.first_name}{' '}
                              {allocation.created_by_user.last_name}
                            </div>
                            <div className='text-xs'>
                              {allocation.created_by_user.email}
                            </div>
                          </div>
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
                        {allocation.notes ? (
                          <span className='line-clamp-2'>
                            {allocation.notes}
                          </span>
                        ) : (
                          <span className='italic'>No notes</span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleAllocationClick(allocation);
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
                      colSpan={7}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                    >
                      {debouncedSearch
                        ? 'No allocations found matching your search'
                        : 'No allocations found'}
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

      {/* View Allocation Modal */}
      {selectedAllocation && (
        <ViewAllocationModal
          allocation={selectedAllocation}
          onClose={handleCloseModal}
          onUpdate={handleAllocationUpdated}
        />
      )}
    </div>
  );
}
