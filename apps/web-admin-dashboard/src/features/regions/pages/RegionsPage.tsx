import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/query-client';
import { regionsApi } from '../api/regionsApi';
import { languagesApi } from '@/features/languages/api/languagesApi';
import { RegionModal } from '../components/RegionModal';
import { LanguageEntityModal } from '@/features/languages/components/LanguageEntityModal';
import type { RegionWithLanguages, LanguageEntityWithRegions } from '@/types';
import { Search, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

type ModalStackItem =
  | { type: 'region'; region: RegionWithLanguages; id: string }
  | { type: 'language'; entity: LanguageEntityWithRegions; id: string };

export function RegionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [languageFilters, setLanguageFilters] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');

  // Modal stack for layered modals
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
  const queryClient = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search
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

  // Fetch regions with pagination, search, and filters
  const languageFilterIds = languageFilters.map(l => l.id);
  const { data: regionsData, isLoading } = useQuery({
    queryKey: queryKeys.regions(
      page,
      pageSize,
      debouncedSearch,
      levelFilter,
      languageFilterIds.join(',')
    ),
    queryFn: () =>
      regionsApi.fetchRegions({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        levelFilter: levelFilter !== 'all' ? levelFilter : undefined,
        languageFilters:
          languageFilterIds.length > 0 ? languageFilterIds : undefined,
      }),
  });

  const regions = regionsData?.data || [];
  const totalRegions = regionsData?.total || 0;
  const totalPages = Math.ceil(totalRegions / pageSize);

  const handleRegionClick = async (region: RegionWithLanguages) => {
    // Fetch full region data with language entities before opening modal
    const fullRegion = await regionsApi.fetchRegionById(region.id);
    if (fullRegion) {
      setModalStack([{ type: 'region', region: fullRegion, id: region.id }]);
    }
  };

  const handleNavigateToRegion = async (regionId: string) => {
    // Fetch data first, then open modal
    const region = await regionsApi.fetchRegionById(regionId);
    if (region) {
      setModalStack(prev => [
        ...prev,
        { type: 'region', region, id: regionId },
      ]);
    }
  };

  const handleNavigateToLanguage = async (languageId: string) => {
    // Fetch data first, then open modal
    const entity = await languagesApi.fetchLanguageEntityById(languageId);
    if (entity) {
      setModalStack(prev => [
        ...prev,
        { type: 'language', entity, id: languageId },
      ]);
    }
  };

  const handleCloseModal = () => {
    // Pop the top modal from stack
    setModalStack(prev => prev.slice(0, -1));
  };

  const handleCloseAllModals = () => {
    // Clear entire modal stack
    setModalStack([]);
  };

  const handleRegionUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ['regions'],
    });
    // Don't close modal - user might want to continue editing
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Regions
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          Manage regional data and relationships
        </p>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search regions...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
      </div>

      {/* Filters */}
      <div className='mb-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Level Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Filter by Level
          </label>
          <select
            value={levelFilter}
            onChange={e => {
              setLevelFilter(e.target.value);
              setPage(1);
            }}
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-secondary-500 dark:focus:ring-secondary-600'
          >
            <option value='all'>All Levels</option>
            <option value='continent'>Continent</option>
            <option value='world_region'>World Region</option>
            <option value='country'>Country</option>
            <option value='state'>State</option>
            <option value='province'>Province</option>
            <option value='district'>District</option>
            <option value='town'>Town</option>
            <option value='village'>Village</option>
          </select>
        </div>

        {/* Language Filter */}
        <div>
          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
            Filter by Languages (OR)
          </label>
          <div className='relative'>
            <input
              type='text'
              placeholder='Type to search and add languages...'
              value={languageSearchQuery}
              onChange={e => setLanguageSearchQuery(e.target.value)}
              className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-secondary-500 dark:focus:ring-secondary-600'
            />
            {languageSearchQuery && (
              <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                <button
                  onClick={() => {
                    if (!languageFilters.find(l => l.id === 'none')) {
                      setLanguageFilters(prev => [
                        ...prev,
                        { id: 'none', name: 'No Languages' },
                      ]);
                      setPage(1);
                    }
                    setLanguageSearchQuery('');
                  }}
                  className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'
                >
                  No Languages
                </button>
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
                      className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100'
                    >
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
                  className='inline-flex items-center gap-1 px-3 py-1 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300 rounded-full text-sm'
                >
                  {language.name}
                  <button
                    onClick={() => {
                      setLanguageFilters(prev =>
                        prev.filter(l => l.id !== language.id)
                      );
                      setPage(1);
                    }}
                    className='hover:text-secondary-900 dark:hover:text-secondary-100'
                  >
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
              Loading regions...
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
                      Level
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Languages
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {regions && regions.length > 0 ? (
                    regions.map(region => (
                      <tr
                        key={region.id}
                        className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                        onClick={() => handleRegionClick(region)}
                      >
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                          {region.name}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          <span className='px-2 py-1 text-xs font-medium rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300'>
                            {region.level}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {region.language_count || 0} languages
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleRegionClick(region);
                            }}
                            className='text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-300 inline-flex items-center transition-colors'
                          >
                            <Edit className='h-4 w-4 mr-1' />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                      >
                        {searchTerm
                          ? 'No regions found matching your search'
                          : 'No regions found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  Showing {(page - 1) * pageSize + 1} to{' '}
                  {Math.min(page * pageSize, totalRegions)} of {totalRegions}{' '}
                  regions
                </div>
                <div className='flex items-center space-x-2'>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className='px-3 py-1 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronLeft className='h-4 w-4 text-neutral-600 dark:text-neutral-400' />
                  </button>
                  <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className='px-3 py-1 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronRight className='h-4 w-4 text-neutral-600 dark:text-neutral-400' />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Stack - render all modals with increasing z-index */}
      {modalStack.map((item, index) => {
        const zIndex = 50 + index;
        const isTopModal = index === modalStack.length - 1;

        if (item.type === 'region') {
          return (
            <div key={`reg-${item.id}-${index}`} style={{ zIndex }}>
              <RegionModal
                region={item.region}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
                onSave={handleRegionUpdated}
                onNavigateToRegion={handleNavigateToRegion}
                onNavigateToLanguage={handleNavigateToLanguage}
              />
            </div>
          );
        } else {
          return (
            <div key={`lang-${item.id}-${index}`} style={{ zIndex }}>
              <LanguageEntityModal
                entity={item.entity}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
                onSave={() => {
                  queryClient.invalidateQueries({
                    queryKey: ['language-entities'],
                  });
                  queryClient.invalidateQueries({ queryKey: ['regions'] });
                }}
                onNavigateToLanguage={handleNavigateToLanguage}
                onNavigateToRegion={handleNavigateToRegion}
              />
            </div>
          );
        }
      })}
    </div>
  );
}
