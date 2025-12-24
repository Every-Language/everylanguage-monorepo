import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/query-client';
import { externalProjectsOverridesApi } from '../api/externalProjectsOverridesApi';
import { languagesApi } from '@/features/languages/api/languagesApi';
import { ExternalProjectOverrideModal } from '../components/ExternalProjectOverrideModal';
import type { ExternalProjectOverrideWithLanguage } from '../api/externalProjectsOverridesApi';
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

function ExternalProjectOverrideRow({
  override,
  onOverrideClick,
}: {
  override: ExternalProjectOverrideWithLanguage;
  onOverrideClick: (override: ExternalProjectOverrideWithLanguage) => void;
}) {
  const completionPercentage =
    override.total_chapters > 0
      ? Math.round(
          (override.completed_chapters / override.total_chapters) * 100
        )
      : 0;

  return (
    <tr
      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
      onClick={() => onOverrideClick(override)}>
      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
        {override.language_entity?.name || 'Unknown'}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
        {override.project_name}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {override.partner_organization || '—'}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {override.is_active ? (
          <span className='text-green-600 dark:text-green-400'>Active</span>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>
            Inactive
          </span>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {override.is_audio ? (
          <span className='text-green-600 dark:text-green-400'>Yes</span>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>No</span>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {override.is_text ? (
          <span className='text-green-600 dark:text-green-400'>Yes</span>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>No</span>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {override.completed_chapters} / {override.total_chapters} (
        {completionPercentage}%)
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {override.start_date
          ? new Date(override.start_date).toLocaleDateString()
          : '—'}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        {override.completion_date
          ? new Date(override.completion_date).toLocaleDateString()
          : '—'}
      </td>
    </tr>
  );
}

export function ExternalProjectsOverridesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [languageFilters, setLanguageFilters] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [selectedOverride, setSelectedOverride] =
    useState<ExternalProjectOverrideWithLanguage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch languages for filter
  const { data: searchedLanguages } = useQuery({
    queryKey: ['language-search-filter', languageSearchQuery],
    queryFn: async () => {
      if (!languageSearchQuery || languageSearchQuery.length < 2) return [];
      const results = await languagesApi.fetchLanguageEntities({
        searchQuery: languageSearchQuery,
        page: 1,
        pageSize: 20,
      });
      return results.data;
    },
    enabled: languageSearchQuery.length >= 2,
  });

  // Fetch external projects overrides with pagination and filters
  const languageFilterIds = languageFilters.map(l => l.id);
  const { data: response, isLoading } = useQuery({
    queryKey: queryKeys.externalProjectsOverrides(
      page,
      pageSize,
      debouncedSearch,
      languageFilterIds.join(',')
    ),
    queryFn: () =>
      externalProjectsOverridesApi.fetchExternalProjectsOverrides({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        languageFilters:
          languageFilterIds.length > 0 ? languageFilterIds : undefined,
      }),
  });

  const overrides = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleOverrideClick = (
    override: ExternalProjectOverrideWithLanguage
  ) => {
    setSelectedOverride(override);
  };

  const handleCloseModal = () => {
    setSelectedOverride(null);
    setShowCreateModal(false);
  };

  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({
      queryKey: ['external-projects-overrides'],
    });
  };

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            External Projects Overrides
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            Manage external project override records
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2'>
          <Plus className='h-5 w-5' />
          Create New
        </button>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search by project name, partner organization, or language (min 2 characters)...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
        {debouncedSearch && (
          <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
            Showing {overrides.length} results for "{debouncedSearch}"
          </p>
        )}
      </div>

      {/* Language Filter */}
      <div className='mb-6'>
        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
          Filter by Languages (OR)
        </label>
        <div className='relative'>
          <input
            type='text'
            placeholder='Type to search and add languages...'
            value={languageSearchQuery}
            onChange={e => setLanguageSearchQuery(e.target.value)}
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          />
          {languageSearchQuery && (
            <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
              {searchedLanguages &&
                searchedLanguages.map(language => (
                  <button
                    key={language.id}
                    onClick={() => {
                      if (!languageFilters.find(l => l.id === language.id)) {
                        setLanguageFilters(prev => [
                          ...prev,
                          { id: language.id, name: language.name },
                        ]);
                        setPage(1);
                      }
                      setLanguageSearchQuery('');
                    }}
                    className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100'>
                    {language.name}{' '}
                    <span className='text-neutral-500 dark:text-neutral-400'>
                      ({language.level})
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Language filter pills */}
        {languageFilters.length > 0 && (
          <div className='flex flex-wrap gap-2 mt-2'>
            {languageFilters.map(language => (
              <span
                key={language.id}
                className='inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm'>
                {language.name}
                <button
                  onClick={() => {
                    setLanguageFilters(prev =>
                      prev.filter(l => l.id !== language.id)
                    );
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

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading external projects overrides...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Language
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Project Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Partner Organization
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Is Active
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Is Audio
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Is Text
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Progress
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Start Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Completion Date
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {overrides && overrides.length > 0 ? (
                  overrides.map(override => (
                    <ExternalProjectOverrideRow
                      key={override.id}
                      override={override}
                      onOverrideClick={handleOverrideClick}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                      {debouncedSearch
                        ? 'No external projects overrides found matching your search'
                        : 'No external projects overrides found'}
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

      {/* Modals */}
      {selectedOverride && (
        <ExternalProjectOverrideModal
          entity={selectedOverride}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
      {showCreateModal && (
        <ExternalProjectOverrideModal
          entity={null}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
