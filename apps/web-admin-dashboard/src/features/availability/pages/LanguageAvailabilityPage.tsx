import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { languageAvailabilityApi } from '../api/languageAvailabilityApi';
import type { LanguageFundingStatus } from '@/types';
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X as XIcon,
} from 'lucide-react';

export function LanguageAvailabilityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalSearchTerm, setAddModalSearchTerm] = useState('');
  const [addModalDebouncedSearch, setAddModalDebouncedSearch] = useState('');
  const [addModalPage, setAddModalPage] = useState(1);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<string>('');
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce add modal search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setAddModalDebouncedSearch(addModalSearchTerm);
      setAddModalPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [addModalSearchTerm]);

  // Fetch available languages
  const { data: response, isLoading } = useQuery({
    queryKey: ['available-languages', page, pageSize, debouncedSearch],
    queryFn: () =>
      languageAvailabilityApi.fetchAvailableLanguages({
        page,
        pageSize,
        searchQuery: debouncedSearch,
      }),
  });

  // Fetch draft languages for add modal
  const { data: draftResponse, isLoading: isLoadingDrafts } = useQuery({
    queryKey: [
      'draft-languages',
      addModalPage,
      pageSize,
      addModalDebouncedSearch,
    ],
    queryFn: () =>
      languageAvailabilityApi.fetchDraftLanguages({
        page: addModalPage,
        pageSize,
        searchQuery: addModalDebouncedSearch,
      }),
    enabled: showAddModal,
  });

  const languages = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const draftLanguages = draftResponse?.data || [];
  const draftTotalCount = draftResponse?.count || 0;
  const draftTotalPages = draftResponse?.totalPages || 1;

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      languageId,
      status,
    }: {
      languageId: string;
      status: LanguageFundingStatus;
    }) =>
      languageAvailabilityApi.updateLanguageFundingStatus(languageId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: ({
      languageId,
      budgetCents,
    }: {
      languageId: string;
      budgetCents: number | null;
    }) => languageAvailabilityApi.updateLanguageBudget(languageId, budgetCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
      setEditingBudget(null);
    },
  });

  // Set language available mutation
  const setAvailableMutation = useMutation({
    mutationFn: (languageId: string) =>
      languageAvailabilityApi.setLanguageAvailable(languageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
      queryClient.invalidateQueries({ queryKey: ['draft-languages'] });
    },
  });

  const handleStatusChange = (
    languageId: string,
    newStatus: LanguageFundingStatus
  ) => {
    updateStatusMutation.mutate({ languageId, status: newStatus });
  };

  const handleAddLanguage = (languageId: string) => {
    setAvailableMutation.mutate(languageId);
  };

  const handleStartEditBudget = (
    languageId: string,
    currentBudget: number | null
  ) => {
    setEditingBudget(languageId);
    setBudgetValue(currentBudget ? (currentBudget / 100).toFixed(2) : '');
  };

  const handleSaveBudget = (languageId: string) => {
    const budgetCents =
      budgetValue.trim() === ''
        ? null
        : Math.round(parseFloat(budgetValue) * 100);
    if (budgetCents !== null && (isNaN(budgetCents) || budgetCents < 0)) {
      return; // Invalid input
    }
    updateBudgetMutation.mutate({ languageId, budgetCents });
  };

  const handleCancelEditBudget = () => {
    setEditingBudget(null);
    setBudgetValue('');
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
        <button
          onClick={() => setShowAddModal(true)}
          className='inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'
        >
          <Plus className='h-5 w-5 mr-2' />
          Add Language
        </button>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search languages...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
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
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Name
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Budget
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {languages && languages.length > 0 ? (
                    languages.map(language => (
                      <tr
                        key={language.id}
                        className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                          {language.name}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {editingBudget === language.id ? (
                            <div className='flex items-center gap-2'>
                              <span className='text-neutral-600 dark:text-neutral-400'>
                                $
                              </span>
                              <input
                                type='number'
                                step='0.01'
                                min='0'
                                value={budgetValue}
                                onChange={e => setBudgetValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleSaveBudget(language.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditBudget();
                                  }
                                }}
                                className='w-24 px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveBudget(language.id)}
                                disabled={updateBudgetMutation.isPending}
                                className='p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50'
                              >
                                <Check className='h-4 w-4' />
                              </button>
                              <button
                                onClick={handleCancelEditBudget}
                                className='p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                              >
                                <XIcon className='h-4 w-4' />
                              </button>
                            </div>
                          ) : (
                            <div className='flex items-center gap-2'>
                              <span className='text-neutral-900 dark:text-neutral-100'>
                                {language.language_funding?.budget_cents
                                  ? `$${((language.language_funding.budget_cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '—'}
                              </span>
                              <button
                                onClick={() =>
                                  handleStartEditBudget(
                                    language.id,
                                    language.language_funding?.budget_cents ||
                                      null
                                  )
                                }
                                className='p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                                title='Edit budget'
                              >
                                <Edit2 className='h-3 w-3' />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          <select
                            value={
                              language.language_funding?.funding_status ||
                              'draft'
                            }
                            onChange={e =>
                              handleStatusChange(
                                language.id,
                                e.target.value as LanguageFundingStatus
                              )
                            }
                            disabled={updateStatusMutation.isPending}
                            className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <option value='draft'>Draft</option>
                            <option value='available'>Available</option>
                            <option value='in_progress'>In Progress</option>
                            <option value='funded'>Funded</option>
                            <option value='archived'>Archived</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                      >
                        {debouncedSearch
                          ? 'No languages found matching your search'
                          : 'No languages found'}
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
          </>
        )}
      </div>

      {/* Add Language Modal */}
      {showAddModal && (
        <div className='fixed inset-0 z-50 overflow-y-auto'>
          <div className='flex min-h-screen items-center justify-center p-4'>
            <div
              className='fixed inset-0 bg-black/50 transition-opacity'
              onClick={() => setShowAddModal(false)}
            />
            <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col'>
              {/* Header */}
              <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
                <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
                  Add Language
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
                >
                  <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
                </button>
              </div>

              {/* Search */}
              <div className='p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
                  <input
                    type='text'
                    placeholder='Search draft languages...'
                    value={addModalSearchTerm}
                    onChange={e => setAddModalSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
                  />
                </div>
              </div>

              {/* Table */}
              <div className='flex-1 overflow-y-auto min-h-0'>
                {isLoadingDrafts ? (
                  <div className='p-8 text-center'>
                    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
                    <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
                      Loading languages...
                    </p>
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
                      <thead className='bg-neutral-50 dark:bg-neutral-800/50 sticky top-0'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Name
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Level
                          </th>
                          <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                        {draftLanguages && draftLanguages.length > 0 ? (
                          draftLanguages.map(language => (
                            <tr
                              key={language.id}
                              className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
                            >
                              <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                                {language.name}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                                <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                                  {language.level}
                                </span>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                                <button
                                  onClick={() => {
                                    handleAddLanguage(language.id);
                                    setShowAddModal(false);
                                  }}
                                  disabled={setAvailableMutation.isPending}
                                  className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                >
                                  Add Language
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={3}
                              className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                            >
                              {addModalDebouncedSearch
                                ? 'No draft languages found matching your search'
                                : 'No draft languages found'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {!isLoadingDrafts && draftTotalPages > 1 && (
                <div className='flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
                  <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                    Page {addModalPage} of {draftTotalPages} (
                    {draftTotalCount.toLocaleString()} total)
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => setAddModalPage(p => Math.max(1, p - 1))}
                      disabled={addModalPage === 1}
                      className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </button>
                    <span className='text-sm text-neutral-600 dark:text-neutral-400 min-w-[100px] text-center'>
                      {((addModalPage - 1) * pageSize + 1).toLocaleString()} -{' '}
                      {Math.min(
                        addModalPage * pageSize,
                        draftTotalCount
                      ).toLocaleString()}
                    </span>
                    <button
                      onClick={() =>
                        setAddModalPage(p => Math.min(draftTotalPages, p + 1))
                      }
                      disabled={addModalPage === draftTotalPages}
                      className='px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                    >
                      <ChevronRight className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
