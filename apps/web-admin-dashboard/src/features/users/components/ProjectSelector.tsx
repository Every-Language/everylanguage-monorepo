import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { X, Search } from 'lucide-react';

interface ProjectSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (projectId: string) => void;
  excludeProjectIds?: string[];
  searchPlaceholder?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeProjectIds = [],
  searchPlaceholder = 'Search by project name...',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-selector', debouncedSearch],
    queryFn: () => usersApi.searchProjects(debouncedSearch || '', 20),
    enabled: isOpen && debouncedSearch.length >= 2,
  });

  const filteredProjects = projects.filter(
    project => !excludeProjectIds.includes(project.id)
  );

  const handleProjectClick = (projectId: string) => {
    onSelect(projectId);
    onClose();
    setSearchQuery('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black opacity-50'
        onClick={handleClose}
      />

      {/* Modal */}
      <div className='relative max-w-md w-full max-h-[80vh] bg-white dark:bg-neutral-900 shadow-xl rounded-lg flex flex-col'>
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              Select Project
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Search and select a project to assign
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Search */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400' />
            <input
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
              autoFocus
            />
          </div>
        </div>

        {/* Project List */}
        <div className='flex-1 overflow-y-auto'>
          {isLoading ? (
            <div className='p-8 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
              <p className='mt-4 text-sm text-neutral-600 dark:text-neutral-400'>
                Searching projects...
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className='p-8 text-center'>
              <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                {debouncedSearch.length >= 2
                  ? 'No projects found matching your search'
                  : 'Start typing to search for projects'}
              </p>
            </div>
          ) : (
            <div className='divide-y divide-neutral-200 dark:divide-neutral-800'>
              {filteredProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className='w-full px-6 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'>
                  <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                    {project.name}
                  </div>
                  {project.description && (
                    <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                      {project.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
