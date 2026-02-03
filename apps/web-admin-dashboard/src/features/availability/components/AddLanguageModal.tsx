import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { languageAvailabilityApi } from '../api/languageAvailabilityApi';
import { DraftLanguageRow } from './DraftLanguageRow';

interface AddLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLanguage: (languageId: string) => void;
  isPending: boolean;
}

export function AddLanguageModal({
  isOpen,
  onClose,
  onAddLanguage,
  isPending,
}: AddLanguageModalProps): React.JSX.Element | null {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [externalIdSearch, setExternalIdSearch] = useState('');
  const [debouncedExternalIdSearch, setDebouncedExternalIdSearch] =
    useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce external ID search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExternalIdSearch(externalIdSearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [externalIdSearch]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setExternalIdSearch('');
      setPage(1);
    }
  }, [isOpen]);

  // Fetch all languages (with no funding record) for add modal
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'all-languages',
      page,
      pageSize,
      debouncedSearch,
      debouncedExternalIdSearch,
    ],
    queryFn: () =>
      languageAvailabilityApi.fetchAllLanguages({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        externalIdSearch:
          debouncedExternalIdSearch.trim().length > 0
            ? debouncedExternalIdSearch.trim()
            : undefined,
      }),
    enabled: isOpen,
  });

  const languages = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex min-h-screen items-center justify-center p-4'>
        <div
          className='fixed inset-0 bg-black/50 transition-opacity'
          onClick={onClose}
        />
        <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              Add Language
            </h2>
            <button
              onClick={onClose}
              className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
              <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
            </button>
          </div>

          {/* Search */}
          <div className='p-6 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0 space-y-3'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
              <input
                type='text'
                placeholder='Search languages by name...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
              />
            </div>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
              <input
                type='text'
                placeholder='Search languages by external ID...'
                value={externalIdSearch}
                onChange={e => setExternalIdSearch(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
              />
            </div>
          </div>

          {/* Table */}
          <div className='flex-1 overflow-y-auto min-h-0'>
            {isLoading ? (
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
                      <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                        External IDs
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                        Regions
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                    {languages && languages.length > 0 ? (
                      languages.map(language => (
                        <DraftLanguageRow
                          key={language.id}
                          language={language}
                          onAddLanguage={onAddLanguage}
                          onCloseModal={onClose}
                          isPending={isPending}
                        />
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                          {debouncedSearch || debouncedExternalIdSearch
                            ? 'No languages found matching your search'
                            : 'No languages available to add'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className='flex items-center justify-between px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
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
        </div>
      </div>
    </div>
  );
}
