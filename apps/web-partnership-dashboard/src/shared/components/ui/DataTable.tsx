'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Select, SelectItem } from './Select';
import { Pagination } from './Pagination';
import { cn } from '../../theme/utils';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: Array<{ value: string; label: string }>;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  paginate?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Controlled: search term (synced to URL when used with onSearchTermChange) */
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  /** Controlled: filter values keyed by column key */
  filters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
  /** Controlled: current 1-based page */
  page?: number;
  onPageChange?: (page: number) => void;
  /** Controlled: page size (use with pageSize from props when controlled) */
  onPageSizeChange?: (pageSize: number) => void;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  className,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  loading = false,
  onRowClick,
  rowClassName,
  paginate = false,
  pageSize: initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
  filters: controlledFilters,
  onFilterChange,
  onClearFilters,
  page: controlledPage,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [internalFilters, setInternalFilters] = useState<
    Record<string, string>
  >({});
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);

  const searchTerm =
    controlledSearchTerm !== undefined
      ? controlledSearchTerm
      : internalSearchTerm;
  const filters =
    controlledFilters !== undefined ? controlledFilters : internalFilters;
  const currentPage =
    controlledPage !== undefined ? controlledPage : internalPage;
  const effectivePageSize =
    onPageSizeChange !== undefined ? initialPageSize : internalPageSize;

  const FILTER_ALL = '__all__';

  // Handle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Handle filters
  const handleFilterChange = (key: string, value: string) => {
    if (onFilterChange) {
      onFilterChange(key, value);
    } else {
      setInternalFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      setInternalFilters({});
      setInternalSearchTerm('');
    }
    if (onSearchTermChange) onSearchTermChange('');
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm && searchable) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          return value
            ?.toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters (FILTER_ALL means "no filter" for select columns)
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== FILTER_ALL) {
        const valueLower = value.toLowerCase();
        filtered = filtered.filter(row => {
          const cellValue = row[key];
          if (valueLower === '__null__') {
            return cellValue == null;
          }
          const str = (cellValue?.toString() ?? '').toLowerCase();
          return str.includes(valueLower);
        });
      }
    });

    // Apply sorting
    if (sortKey && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === bValue) return 0;

        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortKey, sortDirection, filters, columns, searchable]);

  // Paginate: slice to current page (reset to page 1 when filters change)
  const paginatedData = paginate
    ? processedData.slice(
        (currentPage - 1) * effectivePageSize,
        (currentPage - 1) * effectivePageSize + effectivePageSize
      )
    : processedData;

  const totalPages = paginate
    ? Math.ceil(processedData.length / effectivePageSize) || 1
    : 1;

  // Reset to page 1 when filtered/sorted data shrinks and current page is out of range
  useEffect(() => {
    if (paginate && currentPage > totalPages && totalPages > 0) {
      if (onPageChange) onPageChange(1);
      else setInternalPage(1);
    }
  }, [paginate, currentPage, totalPages, onPageChange]);

  // Active filters count (exclude FILTER_ALL and empty)
  const activeFiltersCount =
    Object.values(filters).filter(v => v && v !== FILTER_ALL).length +
    (searchTerm ? 1 : 0);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-neutral-600 dark:text-neutral-400'>Loading...</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className='flex flex-col lg:flex-row gap-4'>
        {searchable && (
          <div className='relative flex-1'>
            <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
            <Input
              value={searchTerm}
              onChange={e => {
                const v = e.target.value;
                if (onSearchTermChange) onSearchTermChange(v);
                else setInternalSearchTerm(v);
              }}
              placeholder={searchPlaceholder}
              className='pl-10'
            />
          </div>
        )}

        {/* Column Filters */}
        <div className='flex gap-2 flex-wrap'>
          {columns
            .filter(column => column.filterable)
            .map(column => (
              <div key={column.key} className='min-w-[150px]'>
                {column.filterType === 'select' && column.filterOptions ? (
                  <Select
                    value={filters[column.key] || FILTER_ALL}
                    onValueChange={value =>
                      handleFilterChange(column.key, value)
                    }
                    placeholder={`Filter ${column.header}`}>
                    <SelectItem value={FILTER_ALL}>
                      All {column.header}
                    </SelectItem>
                    {column.filterOptions
                      .filter(
                        opt => opt.value !== '' && opt.value !== FILTER_ALL
                      )
                      .map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </Select>
                ) : (
                  <Input
                    value={filters[column.key] || ''}
                    onChange={e =>
                      handleFilterChange(column.key, e.target.value)
                    }
                    placeholder={`Filter ${column.header}`}
                  />
                )}
              </div>
            ))}

          {activeFiltersCount > 0 && (
            <Button
              variant='outline'
              size='sm'
              onClick={clearFilters}
              className='whitespace-nowrap'>
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className='border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-neutral-50 dark:bg-neutral-800'>
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400',
                      column.sortable &&
                        'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700',
                      column.width && `w-${column.width}`
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}>
                    <div className='flex items-center space-x-1'>
                      <span>{column.header}</span>
                      {column.sortable && (
                        <div className='flex flex-col'>
                          <ChevronUpIcon
                            className={cn(
                              'h-3 w-3',
                              sortKey === column.key && sortDirection === 'asc'
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-neutral-300 dark:text-neutral-600'
                            )}
                          />
                          <ChevronDownIcon
                            className={cn(
                              'h-3 w-3 -mt-1',
                              sortKey === column.key && sortDirection === 'desc'
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-neutral-300 dark:text-neutral-600'
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700'>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className='px-4 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-neutral-50 dark:hover:bg-neutral-800',
                      onRowClick && 'cursor-pointer',
                      rowClassName && rowClassName(row)
                    )}
                    onClick={() => onRowClick && onRowClick(row)}>
                    {columns.map(column => (
                      <td
                        key={column.key}
                        className='px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100'>
                        {column.render
                          ? column.render(row[column.key] as T[keyof T], row)
                          : (row[column.key] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results info and pagination */}
      {processedData.length > 0 && (
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            {paginate
              ? `Showing ${(currentPage - 1) * effectivePageSize + 1} to ${Math.min(currentPage * effectivePageSize, processedData.length)} of ${processedData.length} results`
              : `Showing ${processedData.length} of ${data.length} results`}
            {activeFiltersCount > 0 && ' (filtered)'}
          </div>
          {paginate && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedData.length}
              itemsPerPage={effectivePageSize}
              onPageChange={p => {
                if (onPageChange) onPageChange(p);
                else setInternalPage(p);
              }}
              showInfo={false}
              showSizeChanger
              pageSizeOptions={pageSizeOptions}
              onPageSizeChange={size => {
                if (onPageSizeChange) {
                  onPageSizeChange(size);
                  onPageChange?.(1);
                } else {
                  setInternalPageSize(size);
                  setInternalPage(1);
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
