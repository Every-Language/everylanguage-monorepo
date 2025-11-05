import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/query-client';
import { languagesApi } from '../api/languagesApi';
import { regionsApi } from '@/features/regions/api/regionsApi';
import { LanguageEntityModal } from '../components/LanguageEntityModal';
import { RegionModal } from '@/features/regions/components/RegionModal';
import type { LanguageEntityWithRegions, RegionWithLanguages } from '@/types';
import { Search, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

type ModalStackItem =
  | { type: 'language'; entity: LanguageEntityWithRegions; id: string }
  | { type: 'region'; region: RegionWithLanguages; id: string };

export function LanguagesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [regionFilters, setRegionFilters] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [regionSearchQuery, setRegionSearchQuery] = useState('');

  // Modal stack for layered modals
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch regions for filter
  const { data: searchedRegions } = useQuery({
    queryKey: ['region-search-filter', regionSearchQuery],
    queryFn: async () => {
      if (!regionSearchQuery || regionSearchQuery.length < 2) return [];
      const results = await regionsApi.fetchRegions({
        searchQuery: regionSearchQuery,
        page: 1,
        pageSize: 20,
      });
      return results.data;
    },
    enabled: regionSearchQuery.length >= 2,
  });

  // Fetch language entities with pagination and filters
  const regionFilterIds = regionFilters.map(r => r.id);
  const { data: response, isLoading } = useQuery({
    queryKey: queryKeys.languageEntities(
      page,
      pageSize,
      debouncedSearch,
      levelFilter,
      regionFilterIds.join(',')
    ),
    queryFn: () =>
      languagesApi.fetchLanguageEntities({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        levelFilter: levelFilter !== 'all' ? levelFilter : undefined,
        regionFilters: regionFilterIds.length > 0 ? regionFilterIds : undefined,
      }),
  });

  const entities = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleEntityClick = (entity: LanguageEntityWithRegions) => {
    setModalStack([{ type: 'language', entity, id: entity.id }]);
  };

  const handleNavigateToLanguage = async (entityId: string) => {
    // Fetch data first, then open modal
    const entity = await languagesApi.fetchLanguageEntityById(entityId);
    if (entity) {
      setModalStack(prev => [
        ...prev,
        { type: 'language', entity, id: entityId },
      ]);
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

  const handleCloseModal = () => {
    // Pop the top modal from stack
    setModalStack(prev => prev.slice(0, -1));
  };

  const handleCloseAllModals = () => {
    // Clear entire modal stack
    setModalStack([]);
  };

  const handleEntityUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ['language-entities'],
    });
    // Don't close modal - user might want to continue editing
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Language Entities
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          Manage language entities and their properties
        </p>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search languages by name or alias (min 2 characters)...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
        {debouncedSearch && (
          <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
            Showing {entities.length} results for "{debouncedSearch}"
          </p>
        )}
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
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
          >
            <option value='all'>All Levels</option>
            <option value='family'>Family</option>
            <option value='language'>Language</option>
            <option value='dialect'>Dialect</option>
            <option value='mother_tongue'>Mother Tongue</option>
          </select>
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
              value={regionSearchQuery}
              onChange={e => setRegionSearchQuery(e.target.value)}
              className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
            />
            {regionSearchQuery && (
              <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                <button
                  onClick={() => {
                    if (!regionFilters.find(r => r.id === 'none')) {
                      setRegionFilters(prev => [
                        ...prev,
                        { id: 'none', name: 'No Region' },
                      ]);
                      setPage(1);
                    }
                    setRegionSearchQuery('');
                  }}
                  className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'
                >
                  No Region
                </button>
                {searchedRegions &&
                  searchedRegions.map(region => (
                    <button
                      key={region.id}
                      onClick={() => {
                        if (!regionFilters.find(r => r.id === region.id)) {
                          setRegionFilters(prev => [
                            ...prev,
                            { id: region.id, name: region.name },
                          ]);
                          setPage(1);
                        }
                        setRegionSearchQuery('');
                      }}
                      className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100'
                    >
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
          {regionFilters.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-2'>
              {regionFilters.map(region => (
                <span
                  key={region.id}
                  className='inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm'
                >
                  {region.name}
                  <button
                    onClick={() => {
                      setRegionFilters(prev =>
                        prev.filter(r => r.id !== region.id)
                      );
                      setPage(1);
                    }}
                    className='hover:text-primary-900 dark:hover:text-primary-100'
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
              Loading language entities...
            </p>
          </div>
        ) : (
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
                    Regions
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {entities && entities.length > 0 ? (
                  entities.map(entity => (
                    <tr
                      key={entity.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      onClick={() => handleEntityClick(entity)}
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {entity.name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
                          {entity.level}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {entity.region_count || 0} regions
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleEntityClick(entity);
                          }}
                          className='text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 inline-flex items-center transition-colors'
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
                      {debouncedSearch
                        ? 'No language entities found matching your search'
                        : 'No language entities found'}
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

      {/* Modal Stack - render all modals with increasing z-index */}
      {modalStack.map((item, index) => {
        const zIndex = 50 + index;
        const isTopModal = index === modalStack.length - 1;

        if (item.type === 'language') {
          return (
            <div key={`lang-${item.id}-${index}`} style={{ zIndex }}>
              <LanguageEntityModal
                entity={item.entity}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
                onSave={handleEntityUpdated}
                onNavigateToLanguage={handleNavigateToLanguage}
                onNavigateToRegion={handleNavigateToRegion}
              />
            </div>
          );
        } else {
          return (
            <div key={`reg-${item.id}-${index}`} style={{ zIndex }}>
              <RegionModal
                region={item.region}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
                onSave={() => {
                  queryClient.invalidateQueries({ queryKey: ['regions'] });
                  queryClient.invalidateQueries({
                    queryKey: ['language-entities'],
                  });
                }}
                onNavigateToRegion={handleNavigateToRegion}
                onNavigateToLanguage={handleNavigateToLanguage}
              />
            </div>
          );
        }
      })}
    </div>
  );
}
