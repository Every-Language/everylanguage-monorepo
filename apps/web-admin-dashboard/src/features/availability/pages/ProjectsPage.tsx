import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/projectsApi';
import { ViewProjectModal } from '../components/ViewProjectModal';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch projects
  const { data: response, isLoading } = useQuery({
    queryKey: ['projects', page, pageSize, debouncedSearch],
    queryFn: () =>
      projectsApi.fetchProjects({
        page,
        pageSize,
        searchQuery: debouncedSearch,
      }),
  });

  const projects = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleCloseModal = () => {
    setSelectedProjectId(null);
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Projects
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          View and manage all projects
        </p>
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
                      Name
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Target Language
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Source Language
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Region
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                  {projects && projects.length > 0 ? (
                    projects.map(project => (
                      <tr
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                          {project.name}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {project.target_language ? (
                            <div>
                              <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                                {project.target_language.name}
                              </span>
                              <span className='ml-2 text-xs text-neutral-500 dark:text-neutral-400'>
                                ({project.target_language.level})
                              </span>
                            </div>
                          ) : (
                            <span className='text-neutral-400 dark:text-neutral-600'>
                              —
                            </span>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {project.source_language ? (
                            <div>
                              <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                                {project.source_language.name}
                              </span>
                              <span className='ml-2 text-xs text-neutral-500 dark:text-neutral-400'>
                                ({project.source_language.level})
                              </span>
                            </div>
                          ) : (
                            <span className='text-neutral-400 dark:text-neutral-600'>
                              —
                            </span>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {project.region ? (
                            <div>
                              <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                                {project.region.name}
                              </span>
                              <span className='ml-2 text-xs text-neutral-500 dark:text-neutral-400'>
                                ({project.region.level})
                              </span>
                            </div>
                          ) : (
                            <span className='text-neutral-400 dark:text-neutral-600'>
                              —
                            </span>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                          {project.created_at
                            ? new Date(project.created_at).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                      >
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

      {/* Project Modal */}
      {selectedProjectId && (
        <ViewProjectModal
          projectId={selectedProjectId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
