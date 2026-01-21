import { useState, useMemo, useEffect } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { languageAvailabilityApi } from '../api/languageAvailabilityApi';
import { LanguageAvailabilityRow } from '../components/LanguageAvailabilityRow';
import { AddLanguageModal } from '../components/AddLanguageModal';
import { useLanguageAvailabilityMutations } from '../hooks/useLanguageAvailabilityMutations';
import { useLanguageDragAndDrop } from '../hooks/useLanguageDragAndDrop';
import { useLanguageAvailabilityFilters } from '../hooks/useLanguageAvailabilityFilters';
import type { LanguageFundingStatus } from '@/types';

export function LanguageAvailabilityPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<string>('');
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [priorityValue, setPriorityValue] = useState<string>('');
  const [sortField, setSortField] = useState<'name' | 'budget' | 'priority'>(
    'priority'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filters = useLanguageAvailabilityFilters();
  const mutations = useLanguageAvailabilityMutations();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    filters.debouncedSearch,
    filters.statusFilter,
    filters.debouncedExternalIdSearch,
    filters.regionFilterIds.join(','),
  ]);

  // Fetch available languages
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'available-languages',
      page,
      pageSize,
      filters.debouncedSearch,
      filters.statusFilter,
      sortField,
      sortDirection,
      filters.debouncedExternalIdSearch,
      filters.regionFilterIds.join(','),
    ],
    queryFn: () =>
      languageAvailabilityApi.fetchAvailableLanguages({
        page,
        pageSize,
        searchQuery: filters.debouncedSearch,
        statusFilter:
          filters.statusFilter !== 'all'
            ? (filters.statusFilter as LanguageFundingStatus)
            : undefined,
        sortField,
        sortDirection,
        externalIdSearch:
          filters.debouncedExternalIdSearch.trim().length > 0
            ? filters.debouncedExternalIdSearch.trim()
            : undefined,
        regionFilters:
          filters.regionFilterIds.length > 0
            ? filters.regionFilterIds
            : undefined,
      }),
  });

  const languages = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const isReordering = sortField === 'priority';

  const dragAndDrop = useLanguageDragAndDrop({
    languages,
    isReordering,
    onReorder: mutations.reorderLanguagesMutation.mutate,
  });

  const displayedLanguages = isReordering
    ? dragAndDrop.orderedLanguages
    : languages;

  const priorityDisplayById = useMemo((): Record<string, number> => {
    if (!isReordering) return {};
    return dragAndDrop.orderedLanguages.reduce<Record<string, number>>(
      (acc, language, i) => {
        acc[language.id] = i + 1;
        return acc;
      },
      {}
    );
  }, [isReordering, dragAndDrop.orderedLanguages]);

  const handleSort = (field: 'name' | 'budget' | 'priority'): void => {
    if (field === 'priority') {
      setSortField('priority');
      setSortDirection('asc');
      setPage(1);
      return;
    }
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'budget' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const getSortIndicator = (
    field: 'name' | 'budget' | 'priority'
  ): string | null => {
    if (field === 'priority') return null;
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleStatusChange = (
    languageId: string,
    newStatus: LanguageFundingStatus
  ): void => {
    mutations.updateStatusMutation.mutate({ languageId, status: newStatus });
  };

  const handleAddLanguage = (languageId: string): void => {
    mutations.setAvailableMutation.mutate(languageId);
  };

  const handleStartEditBudget = (
    languageId: string,
    currentBudget: number | null
  ): void => {
    setEditingBudget(languageId);
    setBudgetValue(currentBudget ? (currentBudget / 100).toFixed(2) : '');
    setEditingPriority(null);
  };

  const handleStartEditPriority = (
    languageId: string,
    currentPriority: number | null
  ): void => {
    setEditingPriority(languageId);
    setPriorityValue(
      currentPriority !== null && currentPriority !== undefined
        ? String(currentPriority)
        : ''
    );
    setEditingBudget(null);
  };

  const handleSaveBudget = (languageId: string): void => {
    const budgetCents =
      budgetValue.trim() === ''
        ? null
        : Math.round(parseFloat(budgetValue) * 100);
    if (budgetCents !== null && (isNaN(budgetCents) || budgetCents < 0)) {
      return; // Invalid input
    }
    mutations.updateBudgetMutation.mutate({ languageId, budgetCents });
    setEditingBudget(null);
  };

  const handleCancelEditBudget = (): void => {
    setEditingBudget(null);
    setBudgetValue('');
  };

  const handleSavePriority = (languageId: string): void => {
    const trimmedValue = priorityValue.trim();
    const priority =
      trimmedValue === '' ? null : Number.parseInt(trimmedValue, 10);

    if (
      priority !== null &&
      (!Number.isInteger(priority) || Number.isNaN(priority) || priority < 0)
    ) {
      return; // Invalid input
    }

    mutations.updatePriorityMutation.mutate({ languageId, priority });
    setEditingPriority(null);
  };

  const handleCancelEditPriority = (): void => {
    setEditingPriority(null);
    setPriorityValue('');
  };

  const handleDelete = (languageId: string): void => {
    const language = languages.find(l => l.id === languageId);
    if (language) {
      const confirmed = window.confirm(
        `Are you sure you want to delete the funding record for "${language.name}"? This action cannot be undone.`
      );
      if (confirmed) {
        mutations.deleteMutation.mutate(languageId);
      }
    }
  };

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Language Availability
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage language funding status and budgets
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setShowAddModal(true)}
            className='inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'>
            <Plus className='h-5 w-5 mr-2' />
            Add Language
          </button>
        </div>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search languages...'
            value={filters.searchTerm}
            onChange={e => filters.setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
      </div>

      <div className='mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <Select
          label='Funding Status'
          value={filters.statusFilter}
          onValueChange={value => {
            filters.setStatusFilter(value);
            setPage(1);
          }}>
          <SelectItem value='all'>All statuses</SelectItem>
          <SelectItem value='draft'>Draft</SelectItem>
          <SelectItem value='available'>Available</SelectItem>
          <SelectItem value='in_progress'>In Progress</SelectItem>
          <SelectItem value='funded'>Funded</SelectItem>
          <SelectItem value='archived'>Archived</SelectItem>
        </Select>

        {/* External ID Search */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Search by External ID
          </label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500' />
            <input
              type='text'
              placeholder='Search external IDs...'
              value={filters.externalIdSearch}
              onChange={e => filters.setExternalIdSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
            />
          </div>
        </div>

        {/* Region Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Filter by Regions (OR)
          </label>
          <div className='relative'>
            <input
              type='text'
              placeholder='Type to search and add regions...'
              value={filters.regionSearchQuery}
              onChange={e => filters.setRegionSearchQuery(e.target.value)}
              className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
            />
            {filters.regionSearchQuery && (
              <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                <button
                  onClick={filters.addNoRegionFilter}
                  className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'>
                  No Region
                </button>
                {filters.searchedRegions &&
                  filters.searchedRegions.map(region => (
                    <button
                      key={region.id}
                      onClick={() => filters.addRegionFilter(region)}
                      className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100'>
                      {region.name}{' '}
                      <span className='text-neutral-500 dark:text-neutral-400'>
                        ({region.level})
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Region filter pills */}
          {filters.regionFilters.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-2'>
              {filters.regionFilters.map(region => (
                <span
                  key={region.id}
                  className='inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm'>
                  {region.name}
                  <button
                    onClick={() => {
                      filters.removeRegionFilter(region.id);
                      setPage(1);
                    }}
                    className='hover:text-primary-900 dark:hover:text-primary-100'>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading languages...
            </p>
          </div>
        ) : (
          <>
            <DndContext
              sensors={dragAndDrop.sensors}
              onDragStart={dragAndDrop.handleDragStart}
              onDragOver={dragAndDrop.handleDragOver}
              onDragEnd={dragAndDrop.handleDragEnd}>
              <SortableContext
                items={displayedLanguages.map(language => language.id)}
                strategy={verticalListSortingStrategy}>
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
                          <button
                            type='button'
                            onClick={() => handleSort('budget')}
                            className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                            Budget
                            <span>{getSortIndicator('budget')}</span>
                          </button>
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          <button
                            type='button'
                            onClick={() => handleSort('priority')}
                            className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                            Priority
                            <span>{getSortIndicator('priority')}</span>
                          </button>
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Status
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          External IDs
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Regions
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Population
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                      {displayedLanguages && displayedLanguages.length > 0 ? (
                        displayedLanguages.map(language => (
                          <LanguageAvailabilityRow
                            key={language.id}
                            language={language}
                            displayPriority={
                              isReordering
                                ? (priorityDisplayById[language.id] ?? null)
                                : (language.language_funding?.priority ?? null)
                            }
                            isReordering={isReordering}
                            editingBudget={editingBudget}
                            budgetValue={budgetValue}
                            onBudgetChange={setBudgetValue}
                            onBudgetSave={handleSaveBudget}
                            onBudgetCancel={handleCancelEditBudget}
                            onBudgetStartEdit={handleStartEditBudget}
                            editingPriority={editingPriority}
                            priorityValue={priorityValue}
                            onPriorityChange={setPriorityValue}
                            onPrioritySave={handleSavePriority}
                            onPriorityCancel={handleCancelEditPriority}
                            onPriorityStartEdit={handleStartEditPriority}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            updateBudgetMutation={
                              mutations.updateBudgetMutation
                            }
                            updatePriorityMutation={
                              mutations.updatePriorityMutation
                            }
                            updateStatusMutation={
                              mutations.updateStatusMutation
                            }
                            deleteMutation={mutations.deleteMutation}
                          />
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                            {filters.debouncedSearch
                              ? 'No languages found matching your search'
                              : 'No languages found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
              <DragOverlay>
                {dragAndDrop.activeDragId ? (
                  <div className='rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 shadow-lg'>
                    {displayedLanguages.find(
                      language => language.id === dragAndDrop.activeDragId
                    )?.name ?? 'Dragging'}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Pagination */}
            {totalPages > 1 && (
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

      {/* Add Language Modal */}
      <AddLanguageModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddLanguage={handleAddLanguage}
        isPending={mutations.setAvailableMutation.isPending}
      />
    </div>
  );
}
