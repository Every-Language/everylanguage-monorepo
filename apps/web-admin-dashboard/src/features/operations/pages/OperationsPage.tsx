import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operationsApi } from '../api/operationsApi';
import type { EntityStatus, OperationCategory } from '../api/operationsApi';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AddOperationModal } from '../components/AddOperationModal';
import { ViewOperationModal } from '../components/ViewOperationModal';
import { Select, SelectItem } from '@everylanguage/shared-ui';

const OPERATION_CATEGORIES: OperationCategory[] = [
  'travel',
  'administration',
  'legal',
  'server',
  'marketing',
  'development',
];

const STATUS_OPTIONS: EntityStatus[] = [
  'draft',
  'available',
  'funded',
  'archived',
];

export function OperationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(
    null
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilterValue, setStatusFilterValue] = useState<string>('all');
  const [sortField, setSortField] = useState<
    'name' | 'allocations' | 'costs' | 'balance'
  >('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch operations
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'operations',
      page,
      pageSize,
      debouncedSearch,
      categoryFilter,
      statusFilterValue,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      operationsApi.fetchOperations({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        categoryFilter:
          categoryFilter !== 'all'
            ? (categoryFilter as OperationCategory)
            : undefined,
        statusFilter:
          statusFilterValue !== 'all'
            ? (statusFilterValue as EntityStatus)
            : undefined,
        sortField,
        sortDirection,
      }),
  });

  const operations = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      operationId,
      status,
    }: {
      operationId: string;
      status: EntityStatus;
    }) => operationsApi.updateOperation(operationId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });

  const handleStatusChange = (operationId: string, newStatus: EntityStatus) => {
    updateStatusMutation.mutate({ operationId, status: newStatus });
  };

  const formatCurrency = (cents: number | null): string => {
    if (cents === null) return '—';
    return `$${((cents || 0) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatCategory = (category: OperationCategory | null): string => {
    if (!category) return '—';
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getBalanceClassName = (balanceCents: number | null): string => {
    if (balanceCents === null) {
      return 'text-neutral-500 dark:text-neutral-400';
    }
    if (balanceCents < 0) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-neutral-900 dark:text-neutral-100';
  };

  const handleOperationClick = (operationId: string) => {
    setSelectedOperationId(operationId);
  };

  const handleCloseModal = () => {
    setSelectedOperationId(null);
    queryClient.invalidateQueries({ queryKey: ['operations'] });
  };

  const handleSort = (field: 'name' | 'allocations' | 'costs' | 'balance') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const getSortIndicator = (
    field: 'name' | 'allocations' | 'costs' | 'balance'
  ) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Operations
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage operational funding categories and costs
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className='inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'>
          <Plus className='h-5 w-5 mr-2' />
          Add Operation
        </button>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search operations...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
      </div>

      <div className='mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Select
          label='Category'
          value={categoryFilter}
          onValueChange={value => {
            setCategoryFilter(value);
            setPage(1);
          }}>
          <SelectItem value='all'>All categories</SelectItem>
          {OPERATION_CATEGORIES.map(category => (
            <SelectItem key={category} value={category}>
              {formatCategory(category)}
            </SelectItem>
          ))}
        </Select>

        <Select
          label='Status'
          value={statusFilterValue}
          onValueChange={value => {
            setStatusFilterValue(value);
            setPage(1);
          }}>
          <SelectItem value='all'>All statuses</SelectItem>
          {STATUS_OPTIONS.map(status => (
            <SelectItem key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading operations...
            </p>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      <button
                        type='button'
                        onClick={() => handleSort('name')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                        Name
                        <span>{getSortIndicator('name')}</span>
                      </button>
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Category
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      <button
                        type='button'
                        onClick={() => handleSort('allocations')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                        Allocations
                        <span>{getSortIndicator('allocations')}</span>
                      </button>
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      <button
                        type='button'
                        onClick={() => handleSort('costs')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                        Costs
                        <span>{getSortIndicator('costs')}</span>
                      </button>
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      <button
                        type='button'
                        onClick={() => handleSort('balance')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                        Balance
                        <span>{getSortIndicator('balance')}</span>
                      </button>
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {operations && operations.length > 0 ? (
                    operations.map(operation => (
                      <tr
                        key={operation.operation_id}
                        onClick={() =>
                          operation.operation_id &&
                          handleOperationClick(operation.operation_id)
                        }
                        className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                          {operation.operation_name || '—'}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {operation.category ? (
                            <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                              {formatCategory(operation.category)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                          {formatCurrency(operation.total_allocated_cents)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                          {formatCurrency(operation.total_costs_cents)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getBalanceClassName(
                            operation.balance_cents
                          )}`}>
                          {formatCurrency(operation.balance_cents)}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          <div
                            onClick={e => e.stopPropagation()}
                            className='w-full'>
                            <Select
                              value={operation.status || 'draft'}
                              onValueChange={value =>
                                operation.operation_id &&
                                handleStatusChange(
                                  operation.operation_id,
                                  value as EntityStatus
                                )
                              }
                              disabled={updateStatusMutation.isPending}>
                              {STATUS_OPTIONS.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status.charAt(0).toUpperCase() +
                                    status.slice(1)}
                                </SelectItem>
                              ))}
                            </Select>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                        {debouncedSearch
                          ? 'No operations found matching your search'
                          : 'No operations found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className='mt-4 flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800'>
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  Page {page} of {totalPages} ({totalCount.toLocaleString()}{' '}
                  total)
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
          </>
        )}
      </div>

      {/* Add Operation Modal */}
      {showAddModal && (
        <AddOperationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['operations'] });
          }}
        />
      )}

      {/* View Operation Modal */}
      {selectedOperationId && (
        <ViewOperationModal
          operationId={selectedOperationId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
