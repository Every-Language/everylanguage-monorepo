import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projectsApi';
import { languagesApi } from '../../languages/api/languagesApi';
import { regionsApi } from '../../regions/api/regionsApi';
import { ViewProjectModal } from '../components/ViewProjectModal';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { LanguageEntityModal } from '../../languages/components/LanguageEntityModal';
import { RegionModal } from '../../regions/components/RegionModal';
import { ViewTextVersionModal } from '../components/ViewTextVersionModal';
import { ViewAudioVersionModal } from '../components/ViewAudioVersionModal';
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import type { LanguageEntityWithRegions, RegionWithLanguages } from '@/types';
import type { Database } from '@everylanguage/shared-types';

type ModalStackItem =
  | { type: 'project'; id: string }
  | { type: 'language'; id: string; entity: LanguageEntityWithRegions }
  | { type: 'region'; id: string; region: RegionWithLanguages }
  | { type: 'textVersion'; id: string }
  | { type: 'audioVersion'; id: string };

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [targetLanguageFilters, setTargetLanguageFilters] = useState<
    Array<{ id: string; name: string; level?: string | null }>
  >([]);
  const [regionFilters, setRegionFilters] = useState<
    Array<{ id: string; name: string; level?: string | null }>
  >([]);
  const [targetLanguageSearch, setTargetLanguageSearch] = useState('');
  const [regionSearchTerm, setRegionSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<
    'created_at' | 'name' | 'target_language'
  >('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: targetLanguageResults = [] } = useQuery({
    queryKey: ['projects-target-language-search', targetLanguageSearch],
    queryFn: async () => {
      if (!targetLanguageSearch || targetLanguageSearch.length < 2) return [];
      const results = await languagesApi.fetchLanguageEntities({
        searchQuery: targetLanguageSearch,
        page: 1,
        pageSize: 20,
      });
      return results.data;
    },
    enabled: targetLanguageSearch.length >= 2,
  });

  const { data: regionSearchResults = [] } = useQuery({
    queryKey: ['projects-region-search', regionSearchTerm],
    queryFn: async () => {
      if (!regionSearchTerm || regionSearchTerm.length < 2) return [];
      const results = await regionsApi.fetchRegions({
        searchQuery: regionSearchTerm,
        page: 1,
        pageSize: 20,
      });
      return results.data;
    },
    enabled: regionSearchTerm.length >= 2,
  });

  const targetLanguageIds = targetLanguageFilters.map(language => language.id);
  const regionIds = regionFilters.map(region => region.id);
  const handleSort = (field: 'created_at' | 'name' | 'target_language') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const getSortIndicator = (
    field: 'created_at' | 'name' | 'target_language'
  ) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Fetch projects
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'projects',
      page,
      pageSize,
      debouncedSearch,
      targetLanguageIds.join(','),
      regionIds.join(','),
      statusFilter,
      sortField,
      sortDirection,
    ],
    queryFn: () =>
      projectsApi.fetchProjects({
        page,
        pageSize,
        searchQuery: debouncedSearch,
        targetLanguageIds:
          targetLanguageIds.length > 0 ? targetLanguageIds : undefined,
        regionIds: regionIds.length > 0 ? regionIds : undefined,
        statusFilter:
          statusFilter !== 'all'
            ? (statusFilter as Database['public']['Enums']['project_status'])
            : undefined,
        sortField,
        sortDirection,
      }),
  });

  const projects = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleProjectClick = (projectId: string) => {
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
    try {
      const region = await regionsApi.fetchRegionById(regionId);
      if (region) {
        setModalStack(prev => [
          ...prev,
          { type: 'region', id: regionId, region },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch region:', error);
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'precreated':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  return (
    <div className='p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Projects
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            View and manage all projects
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className='inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors'>
          <Plus className='h-5 w-5 mr-2' />
          Create Project
        </button>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search projects by name...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
      </div>

      {/* Filters */}
      <div className='mb-6 space-y-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Target language filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Target Languages
            </label>
            <div className='relative'>
              <input
                type='text'
                placeholder='Search target languages...'
                value={targetLanguageSearch}
                onChange={e => setTargetLanguageSearch(e.target.value)}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
              />
              {targetLanguageSearch.length >= 2 && (
                <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {targetLanguageResults.length === 0 ? (
                    <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                      No matches
                    </div>
                  ) : (
                    targetLanguageResults.map(language => (
                      <button
                        key={language.id}
                        type='button'
                        onClick={() => {
                          if (
                            !targetLanguageFilters.find(
                              item => item.id === language.id
                            )
                          ) {
                            setTargetLanguageFilters(prev => [
                              ...prev,
                              {
                                id: language.id,
                                name: language.name,
                                level: language.level,
                              },
                            ]);
                            setPage(1);
                          }
                          setTargetLanguageSearch('');
                        }}
                        className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                        {language.name}{' '}
                        <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                          ({language.level})
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {targetLanguageFilters.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {targetLanguageFilters.map(language => (
                  <span
                    key={language.id}
                    className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-200'>
                    {language.name}
                    <button
                      type='button'
                      onClick={() => {
                        setTargetLanguageFilters(prev =>
                          prev.filter(item => item.id !== language.id)
                        );
                        setPage(1);
                      }}
                      className='text-xs hover:underline'>
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Region filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Regions
            </label>
            <div className='relative'>
              <input
                type='text'
                placeholder='Search regions...'
                value={regionSearchTerm}
                onChange={e => setRegionSearchTerm(e.target.value)}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600'
              />
              {regionSearchTerm.length >= 2 && (
                <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {regionSearchResults.length === 0 ? (
                    <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                      No matches
                    </div>
                  ) : (
                    regionSearchResults.map(region => (
                      <button
                        key={region.id}
                        type='button'
                        onClick={() => {
                          if (
                            !regionFilters.find(item => item.id === region.id)
                          ) {
                            setRegionFilters(prev => [
                              ...prev,
                              {
                                id: region.id,
                                name: region.name,
                                level: region.level,
                              },
                            ]);
                            setPage(1);
                          }
                          setRegionSearchTerm('');
                        }}
                        className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                        {region.name}{' '}
                        <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                          ({region.level})
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {regionFilters.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {regionFilters.map(region => (
                  <span
                    key={region.id}
                    className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'>
                    {region.name}
                    <button
                      type='button'
                      onClick={() => {
                        setRegionFilters(prev =>
                          prev.filter(item => item.id !== region.id)
                        );
                        setPage(1);
                      }}
                      className='text-xs hover:underline'>
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Select
            label='Project Status'
            value={statusFilter}
            onValueChange={value => {
              setStatusFilter(value);
              setPage(1);
            }}>
            <SelectItem value='all'>All statuses</SelectItem>
            <SelectItem value='active'>Active</SelectItem>
            <SelectItem value='completed'>Completed</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
            <SelectItem value='precreated'>Precreated</SelectItem>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading projects...
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
                      <button
                        type='button'
                        onClick={() => handleSort('target_language')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                        Target Language
                        <span>{getSortIndicator('target_language')}</span>
                      </button>
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Progress
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      <button
                        type='button'
                        onClick={() => handleSort('created_at')}
                        className='flex items-center gap-1 text-neutral-600 dark:text-neutral-300'>
                        Created
                        <span>{getSortIndicator('created_at')}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {projects && projects.length > 0 ? (
                    projects.map(project => (
                      <tr
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'>
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100 overflow-hidden text-ellipsis'>
                          {project.name}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 overflow-hidden text-ellipsis'>
                          {project.target_language ? (
                            <button
                              onClick={e =>
                                handleLanguageClick(
                                  e,
                                  project.target_language!.id
                                )
                              }
                              className='text-primary-600 dark:text-primary-400 hover:underline font-medium text-neutral-900 dark:text-neutral-100'>
                              {project.target_language.name}
                            </button>
                          ) : (
                            <span className='text-neutral-400 dark:text-neutral-600'>
                              —
                            </span>
                          )}
                        </td>
                        <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
                          <div className='flex flex-col gap-2'>
                            {/* Text Versions */}
                            {project.textVersions &&
                            project.textVersions.length > 0
                              ? project.textVersions.map(version => (
                                  <div
                                    key={`text-${version.id}`}
                                    className='cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 p-1 rounded transition-colors'
                                    onClick={e => {
                                      e.stopPropagation();
                                      setModalStack(prev => [
                                        ...prev,
                                        { type: 'textVersion', id: version.id },
                                      ]);
                                    }}>
                                    <div className='flex items-center gap-2 mb-1'>
                                      <span className='text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline cursor-pointer'>
                                        {version.name}
                                      </span>
                                      {version.progress && (
                                        <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                                          ({version.progress.complete_chapters}/
                                          {version.progress.total_chapters} -{' '}
                                          {version.progress.progress_percentage}
                                          %)
                                        </span>
                                      )}
                                    </div>
                                    {version.progress && (
                                      <div className='w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden'>
                                        <div
                                          className='h-full bg-primary-600 dark:bg-primary-500 transition-all'
                                          style={{
                                            width: `${Math.min(version.progress.progress_percentage, 100)}%`,
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))
                              : null}
                            {/* Audio Versions */}
                            {project.audioVersions &&
                            project.audioVersions.length > 0
                              ? project.audioVersions.map(version => (
                                  <div
                                    key={`audio-${version.id}`}
                                    className='cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 p-1 rounded transition-colors'
                                    onClick={e => {
                                      e.stopPropagation();
                                      setModalStack(prev => [
                                        ...prev,
                                        {
                                          type: 'audioVersion',
                                          id: version.id,
                                        },
                                      ]);
                                    }}>
                                    <div className='flex items-center gap-2 mb-1'>
                                      <span className='text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline cursor-pointer'>
                                        {version.name}
                                      </span>
                                      {version.progress && (
                                        <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                                          (
                                          {version.progress.chapters_with_audio}
                                          /{version.progress.total_chapters} -{' '}
                                          {version.progress.progress_percentage}
                                          %)
                                        </span>
                                      )}
                                    </div>
                                    {version.progress && (
                                      <div className='w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden'>
                                        <div
                                          className='h-full bg-primary-600 dark:bg-primary-500 transition-all'
                                          style={{
                                            width: `${Math.min(version.progress.progress_percentage, 100)}%`,
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))
                              : null}
                            {/* Show message if no versions */}
                            {(!project.textVersions ||
                              project.textVersions.length === 0) &&
                              (!project.audioVersions ||
                                project.audioVersions.length === 0) && (
                                <span className='text-neutral-400 dark:text-neutral-600'>
                                  —
                                </span>
                              )}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm'>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                              project.project_status
                            )}`}>
                            {project.project_status}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {project.created_at
                            ? new Date(project.created_at).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )
                            : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'>
                        {debouncedSearch
                          ? 'No projects found matching your search'
                          : 'No projects found'}
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

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}

      {/* Modal Stack */}
      {modalStack.map((item, index) => {
        const zIndex = 50 + index;
        const isTopModal = index === modalStack.length - 1;

        if (item.type === 'project') {
          return (
            <div key={`project-${item.id}-${index}`} style={{ zIndex }}>
              <ViewProjectModal
                projectId={item.id}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
                onNavigateToLanguage={handleNavigateToLanguage}
                onNavigateToRegion={handleNavigateToRegion}
                onOpenTextVersion={(textVersionId: string) => {
                  setModalStack(prev => [
                    ...prev,
                    { type: 'textVersion', id: textVersionId },
                  ]);
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
        } else if (item.type === 'textVersion') {
          return (
            <div key={`textVersion-${item.id}-${index}`} style={{ zIndex }}>
              <ViewTextVersionModal
                textVersionId={item.id}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
              />
            </div>
          );
        } else if (item.type === 'audioVersion') {
          return (
            <div key={`audioVersion-${item.id}-${index}`} style={{ zIndex }}>
              <ViewAudioVersionModal
                audioVersionId={item.id}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
              />
            </div>
          );
        } else if (item.type === 'language') {
          return (
            <div key={`lang-${item.id}-${index}`} style={{ zIndex }}>
              <LanguageEntityModal
                entity={item.entity}
                onClose={isTopModal ? handleCloseModal : handleCloseAllModals}
                onSave={() => {
                  queryClient.invalidateQueries({
                    queryKey: ['language-entities'],
                  });
                  queryClient.invalidateQueries({ queryKey: ['projects'] });
                }}
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
                  queryClient.invalidateQueries({ queryKey: ['projects'] });
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
