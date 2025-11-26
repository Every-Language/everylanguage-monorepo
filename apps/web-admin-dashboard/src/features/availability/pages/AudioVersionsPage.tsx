import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { versionsApi } from '../api/versionsApi';
import { projectsApi } from '../api/projectsApi';
import { languagesApi } from '../../languages/api/languagesApi';
import { ViewAudioVersionModal } from '../components/ViewAudioVersionModal';
import { ViewProjectModal } from '../components/ViewProjectModal';
import { LanguageEntityModal } from '../../languages/components/LanguageEntityModal';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LanguageEntityWithRegions } from '@/types';

type ModalStackItem =
  | { type: 'audioVersion'; id: string }
  | { type: 'project'; id: string }
  | { type: 'language'; id: string; entity: LanguageEntityWithRegions };

export function AudioVersionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [projectFilters, setProjectFilters] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [languageFilters, setLanguageFilters] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [sortField, setSortField] = useState<
    'name' | 'project' | 'language' | 'progress'
  >('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch projects for filter dropdown
  const { data: projectSearchResults = [] } = useQuery({
    queryKey: ['projects-search', projectSearch],
    queryFn: async () => {
      if (!projectSearch || projectSearch.length < 2) return [];
      const results = await projectsApi.fetchProjects({
        searchQuery: projectSearch,
        page: 1,
        pageSize: 20,
      });
      return results.data.map(p => ({ id: p.id, name: p.name }));
    },
    enabled: projectSearch.length >= 2,
  });

  // Fetch languages for filter dropdown
  const { data: languageSearchResults = [] } = useQuery({
    queryKey: ['languages-search', languageSearch],
    queryFn: async () => {
      if (!languageSearch || languageSearch.length < 2) return [];
      const results = await languagesApi.fetchLanguageEntities({
        searchQuery: languageSearch,
        page: 1,
        pageSize: 20,
      });
      return results.data.map(l => ({ id: l.id, name: l.name }));
    },
    enabled: languageSearch.length >= 2,
  });

  const projectIds = projectFilters.map(p => p.id);
  const languageIds = languageFilters.map(l => l.id);

  const handleSort = (field: 'name' | 'project' | 'language' | 'progress') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'progress' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const getSortIndicator = (
    field: 'name' | 'project' | 'language' | 'progress'
  ) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Fetch audio versions
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'audio-versions-paginated',
      page,
      pageSize,
      debouncedSearch,
      projectIds.join(','),
      languageIds.join(','),
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      versionsApi.fetchAudioVersionsPaginated({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        projectIds: projectIds.length > 0 ? projectIds : undefined,
        languageIds: languageIds.length > 0 ? languageIds : undefined,
        sortField,
        sortDirection,
      }),
  });

  const versions = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleVersionClick = (versionId: string) => {
    setModalStack(prev => [...prev, { type: 'audioVersion', id: versionId }]);
  };

  const handleProjectClick = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setModalStack(prev => [...prev, { type: 'project', id: projectId }]);
  };

  const handleLanguageClick = async (
    e: React.MouseEvent,
    languageId: string
  ) => {
    e.stopPropagation();
    try {
      const entity = await languagesApi.fetchLanguageEntityById(languageId);
      if (entity) {
        setModalStack(prev => [
          ...prev,
          { type: 'language', id: languageId, entity },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch language entity:', error);
    }
  };

  const handleCloseModal = () => {
    setModalStack(prev => prev.slice(0, -1));
  };

  const handleCloseAllModals = () => {
    setModalStack([]);
  };

  const handleNavigateToLanguage = async (languageId: string) => {
    try {
      const entity = await languagesApi.fetchLanguageEntityById(languageId);
      if (entity) {
        setModalStack(prev => [
          ...prev,
          { type: 'language', id: languageId, entity },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch language entity:', error);
    }
  };

  const handleNavigateToRegion = async (regionId: string) => {
    // Not needed for this page, but required by ViewProjectModal
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Audio Versions
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          View and manage all audio versions
        </p>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search audio versions by name...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
      </div>

      {/* Filters */}
      <div className='mb-6 space-y-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Project filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Projects
            </label>
            <div className='relative'>
              <input
                type='text'
                placeholder='Search projects...'
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
              />
              {projectSearch.length >= 2 && (
                <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {projectSearchResults.length === 0 ? (
                    <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                      No matches
                    </div>
                  ) : (
                    projectSearchResults.map(project => (
                      <button
                        key={project.id}
                        type='button'
                        onClick={() => {
                          if (
                            !projectFilters.find(item => item.id === project.id)
                          ) {
                            setProjectFilters(prev => [...prev, project]);
                            setPage(1);
                          }
                          setProjectSearch('');
                        }}
                        className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                      >
                        {project.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {projectFilters.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {projectFilters.map(project => (
                  <span
                    key={project.id}
                    className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-200'
                  >
                    {project.name}
                    <button
                      type='button'
                      onClick={() => {
                        setProjectFilters(prev =>
                          prev.filter(item => item.id !== project.id)
                        );
                        setPage(1);
                      }}
                      className='text-xs hover:underline'
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Language filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Languages
            </label>
            <div className='relative'>
              <input
                type='text'
                placeholder='Search languages...'
                value={languageSearch}
                onChange={e => setLanguageSearch(e.target.value)}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
              />
              {languageSearch.length >= 2 && (
                <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {languageSearchResults.length === 0 ? (
                    <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                      No matches
                    </div>
                  ) : (
                    languageSearchResults.map(language => (
                      <button
                        key={language.id}
                        type='button'
                        onClick={() => {
                          if (
                            !languageFilters.find(
                              item => item.id === language.id
                            )
                          ) {
                            setLanguageFilters(prev => [...prev, language]);
                            setPage(1);
                          }
                          setLanguageSearch('');
                        }}
                        className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                      >
                        {language.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {languageFilters.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {languageFilters.map(language => (
                  <span
                    key={language.id}
                    className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                  >
                    {language.name}
                    <button
                      type='button'
                      onClick={() => {
                        setLanguageFilters(prev =>
                          prev.filter(item => item.id !== language.id)
                        );
                        setPage(1);
                      }}
                      className='text-xs hover:underline'
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading audio versions...
            </p>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table
                className='w-full divide-y divide-neutral-200 dark:divide-neutral-800'
                style={{ tableLayout: 'fixed' }}
              >
                <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                  <tr>
                    <th
                      className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                      style={{ width: '25%' }}
                    >
                      <button
                        type='button'
                        onClick={() => handleSort('name')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'
                      >
                        Name
                        <span>{getSortIndicator('name')}</span>
                      </button>
                    </th>
                    <th
                      className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                      style={{ width: '25%' }}
                    >
                      <button
                        type='button'
                        onClick={() => handleSort('project')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'
                      >
                        Project
                        <span>{getSortIndicator('project')}</span>
                      </button>
                    </th>
                    <th
                      className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                      style={{ width: '25%' }}
                    >
                      <button
                        type='button'
                        onClick={() => handleSort('language')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'
                      >
                        Language
                        <span>{getSortIndicator('language')}</span>
                      </button>
                    </th>
                    <th
                      className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
                      style={{ width: '25%' }}
                    >
                      <button
                        type='button'
                        onClick={() => handleSort('progress')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'
                      >
                        Progress
                        <span>{getSortIndicator('progress')}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {versions && versions.length > 0 ? (
                    versions.map(version => (
                      <tr
                        key={version.id}
                        onClick={() => handleVersionClick(version.id)}
                        className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100 overflow-hidden text-ellipsis'>
                          {version.name}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 overflow-hidden text-ellipsis'>
                          {version.project ? (
                            <button
                              onClick={e =>
                                handleProjectClick(e, version.project!.id)
                              }
                              className='text-primary-600 dark:text-primary-400 hover:underline font-medium text-neutral-900 dark:text-neutral-100'
                            >
                              {version.project.name}
                            </button>
                          ) : (
                            <span className='text-neutral-400 dark:text-neutral-600'>
                              —
                            </span>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 overflow-hidden text-ellipsis'>
                          {version.language ? (
                            <button
                              onClick={e =>
                                handleLanguageClick(e, version.language!.id)
                              }
                              className='text-primary-600 dark:text-primary-400 hover:underline font-medium text-neutral-900 dark:text-neutral-100'
                            >
                              {version.language.name}
                            </button>
                          ) : (
                            <span className='text-neutral-400 dark:text-neutral-600'>
                              —
                            </span>
                          )}
                        </td>
                        <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
                          {version.progress ? (
                            <div className='flex flex-col gap-1'>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-neutral-600 dark:text-neutral-400'>
                                  {version.progress.chapters_with_audio}/
                                  {version.progress.total_chapters} -{' '}
                                  {version.progress.progress_percentage}%
                                </span>
                              </div>
                              <div className='w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden'>
                                <div
                                  className='h-full bg-primary-600 dark:bg-primary-500 transition-all'
                                  style={{
                                    width: `${Math.min(version.progress.progress_percentage, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className='text-neutral-400 dark:text-neutral-600'>
                              —
                            </span>
                          )}
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
                          ? 'No audio versions found matching your search'
                          : 'No audio versions found'}
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

      {/* Modal Stack */}
      {modalStack.map((item, index) => {
        const zIndex = 50 + index;
        const isTopModal = index === modalStack.length - 1;

        if (item.type === 'audioVersion') {
          return (
            <div key={`audioVersion-${item.id}-${index}`} style={{ zIndex }}>
              <ViewAudioVersionModal
                audioVersionId={item.id}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
              />
            </div>
          );
        } else if (item.type === 'project') {
          return (
            <div key={`project-${item.id}-${index}`} style={{ zIndex }}>
              <ViewProjectModal
                projectId={item.id}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
                onNavigateToLanguage={handleNavigateToLanguage}
                onNavigateToRegion={handleNavigateToRegion}
                onOpenTextVersion={(textVersionId: string) => {
                  // Not applicable for audio versions page
                }}
                onOpenAudioVersion={(audioVersionId: string) => {
                  setModalStack(prev => [
                    ...prev,
                    { type: 'audioVersion', id: audioVersionId },
                  ]);
                }}
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
                  queryClient.invalidateQueries({
                    queryKey: ['audio-versions-paginated'],
                  });
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
