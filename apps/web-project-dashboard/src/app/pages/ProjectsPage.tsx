import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Clock, LogOut, FolderOpen } from 'lucide-react';
import { useProjectsByUser } from '../../shared/hooks/query/projects';
import { useLanguageEntitiesByIds } from '../../shared/hooks/query/language-entities';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useTheme } from '../../shared/theme';
import { Button } from '../../shared/design-system/components/Button';
import { Input } from '../../shared/design-system/components/Input';
import { Card } from '../../shared/design-system/components/Card';
import { LoadingSpinner } from '../../shared/design-system/components/LoadingSpinner';
import {
  Alert,
  AlertDescription,
} from '../../shared/design-system/components/Alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../shared/design-system/components/Dialog';
import { ProjectCreationForm } from '../../features/projects/components/ProjectCreationForm';
import { formatDistanceToNow } from 'date-fns';
import type { Project } from '../../shared/stores/types';

interface ProjectWithMetadata extends Project {
  target_language_name: string;
  source_language_name: string;
}

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>(() => {
    try {
      const recent = localStorage.getItem('recent-projects');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  });

  // Fetch user's projects
  const {
    data: projects = [],
    isLoading,
    error,
  } = useProjectsByUser(user?.id || null);

  // Extract unique language entity IDs from projects
  const languageIds = useMemo(() => {
    const ids = new Set<string>();
    projects.forEach(project => {
      if (project.source_language_entity_id)
        ids.add(project.source_language_entity_id);
      if (project.target_language_entity_id)
        ids.add(project.target_language_entity_id);
    });
    return Array.from(ids);
  }, [projects]);

  const { data: languageEntities = [], isLoading: languagesLoading } =
    useLanguageEntitiesByIds(languageIds);

  // Create language lookup map
  const languageLookup = useMemo(() => {
    const map = new Map<string, string>();
    languageEntities.forEach(entity => {
      map.set(entity.id, entity.name);
    });
    return map;
  }, [languageEntities]);

  // Enhance projects with metadata
  const projectsWithMetadata = useMemo((): ProjectWithMetadata[] => {
    return projects.map(project => ({
      ...project,
      target_language_name: languagesLoading
        ? 'Loading...'
        : languageLookup.get(project.target_language_entity_id) || 'Unknown',
      source_language_name: languagesLoading
        ? 'Loading...'
        : languageLookup.get(project.source_language_entity_id) || 'Unknown',
    }));
  }, [projects, languageLookup, languagesLoading]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projectsWithMetadata;

    const term = searchTerm.toLowerCase();
    return projectsWithMetadata.filter(
      project =>
        project.name.toLowerCase().includes(term) ||
        project.description?.toLowerCase().includes(term) ||
        project.target_language_name.toLowerCase().includes(term) ||
        project.source_language_name.toLowerCase().includes(term)
    );
  }, [projectsWithMetadata, searchTerm]);

  // Helper function to safely parse project dates
  const getProjectDate = useCallback((project: Project): Date => {
    const dateString = project.updated_at || project.created_at;
    return dateString ? new Date(dateString) : new Date();
  }, []);

  // Sort projects: recent first, then by updated date
  const sortedProjects = useMemo(() => {
    const recent = filteredProjects.filter(p => recentProjects.includes(p.id));
    const others = filteredProjects.filter(p => !recentProjects.includes(p.id));

    // Sort recent projects by their position in recentProjects array
    recent.sort(
      (a, b) => recentProjects.indexOf(a.id) - recentProjects.indexOf(b.id)
    );

    // Sort other projects by updated date
    others.sort((a, b) => {
      const aDate = getProjectDate(a).getTime();
      const bDate = getProjectDate(b).getTime();
      return bDate - aDate;
    });

    return [...recent, ...others];
  }, [filteredProjects, recentProjects, getProjectDate]);

  // Handle project selection
  const handleProjectSelect = useCallback(
    (project: Project) => {
      // Update recent projects
      const updated = [
        project.id,
        ...recentProjects.filter(id => id !== project.id),
      ].slice(0, 5);
      setRecentProjects(updated);
      localStorage.setItem('recent-projects', JSON.stringify(updated));

      // Navigate to project dashboard
      navigate(`/project/${project.id}/dashboard`);
    },
    [navigate, recentProjects]
  );

  // Handle project creation success
  const handleProjectCreated = useCallback(
    (newProject: Project) => {
      setShowCreateForm(false);
      handleProjectSelect(newProject);
    },
    [handleProjectSelect]
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleThemeToggle = () => {
    setTheme(
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    );
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-accent-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900'>
      {/* Header */}
      <header className='sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            {/* Logo */}
            <div className='flex items-center gap-3'>
              <img
                src='/images/every-language-logo-300x221.png'
                alt='Every Language Logo'
                className='h-10 w-auto object-contain'
              />
              <div>
                <h1 className='text-lg font-bold text-neutral-900 dark:text-white'>
                  Every
                  <span className='text-accent-600 dark:text-accent-400'>
                    Language
                  </span>
                </h1>
                <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                  Project Dashboard
                </p>
              </div>
            </div>

            {/* User Actions */}
            <div className='flex items-center gap-3'>
              <Button
                size='sm'
                variant='ghost'
                onClick={handleThemeToggle}
                className='text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                title={`Current theme: ${theme}`}>
                {theme === 'system' ? (
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                    />
                  </svg>
                ) : resolvedTheme === 'light' ? (
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
                    />
                  </svg>
                ) : (
                  <svg
                    className='h-5 w-5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
                    />
                  </svg>
                )}
              </Button>

              <div className='flex items-center gap-2 pl-3 border-l border-neutral-200 dark:border-neutral-700'>
                <div className='h-8 w-8 bg-gradient-to-br from-accent-600 to-accent-700 rounded-full flex items-center justify-center'>
                  <span className='text-white text-sm font-medium'>
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className='hidden sm:block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                  {user?.email}
                </span>
              </div>

              <Button
                size='sm'
                variant='ghost'
                onClick={handleSignOut}
                className='text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                title='Sign out'>
                <LogOut className='h-5 w-5' />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        {/* Page Header */}
        <div className='text-center mb-12'>
          <h2 className='text-4xl font-bold text-neutral-900 dark:text-white mb-4'>
            Your Projects
          </h2>
          <p className='text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto'>
            Select a Bible translation project to continue your work, or create
            a new one to get started.
          </p>
        </div>

        {/* Search and Create */}
        <div className='flex flex-col sm:flex-row gap-4 mb-8'>
          <div className='relative flex-1'>
            <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5' />
            <Input
              placeholder='Search projects by name, language, or description...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='pl-12 h-12 text-base'
            />
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className='h-12 px-6'
            leftIcon={<Plus className='w-5 h-5' />}>
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className='flex items-center justify-center py-20'>
            <LoadingSpinner size='lg' />
            <span className='ml-3 text-lg text-neutral-500'>
              Loading projects...
            </span>
          </div>
        ) : error ? (
          <div className='max-w-md mx-auto'>
            <Alert variant='destructive'>
              <AlertDescription>
                Error loading projects: {error.message}
              </AlertDescription>
            </Alert>
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className='text-center py-20'>
            <div className='w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6'>
              <FolderOpen className='w-10 h-10 text-neutral-400' />
            </div>
            <h3 className='text-xl font-semibold text-neutral-900 dark:text-white mb-2'>
              {searchTerm ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className='text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto'>
              {searchTerm
                ? 'Try adjusting your search terms.'
                : 'Create your first Bible translation project to get started.'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                leftIcon={<Plus className='w-5 h-5' />}>
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {sortedProjects.map(project => {
              const isRecent = recentProjects.includes(project.id);

              return (
                <Card
                  key={project.id}
                  className='group cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-accent-500/10 hover:border-accent-300 dark:hover:border-accent-700 hover:-translate-y-1'
                  onClick={() => handleProjectSelect(project)}>
                  <div className='p-6'>
                    {/* Header */}
                    <div className='flex items-start justify-between mb-4'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <h3 className='font-semibold text-lg text-neutral-900 dark:text-white truncate group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors'>
                            {project.name}
                          </h3>
                          {isRecent && (
                            <div className='flex items-center text-xs text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/30 px-2 py-0.5 rounded-full'>
                              <Clock className='w-3 h-3 mr-1' />
                              Recent
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Languages */}
                    <div className='space-y-2 mb-4'>
                      <div className='flex items-center text-sm'>
                        <span className='text-neutral-500 dark:text-neutral-400 w-16'>
                          Source:
                        </span>
                        <span className='text-neutral-700 dark:text-neutral-300 font-medium'>
                          {project.source_language_name}
                        </span>
                      </div>
                      <div className='flex items-center text-sm'>
                        <span className='text-neutral-500 dark:text-neutral-400 w-16'>
                          Target:
                        </span>
                        <span className='text-neutral-700 dark:text-neutral-300 font-medium'>
                          {project.target_language_name}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className='text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4'>
                        {project.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className='flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700'>
                      <span className='text-xs text-neutral-400'>
                        Updated{' '}
                        {formatDistanceToNow(getProjectDate(project), {
                          addSuffix: true,
                        })}
                      </span>
                      <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                        <span className='text-xs text-accent-600 dark:text-accent-400 font-medium'>
                          Open →
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent size='5xl' className='max-h-[95vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up your Bible translation project with the required
              information
            </DialogDescription>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto'>
            <ProjectCreationForm
              onProjectCreated={handleProjectCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
