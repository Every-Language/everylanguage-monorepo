import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectUpdatesApi } from '../api/projectUpdatesApi';
import { ProjectSelector } from '../components/ProjectSelector';
import { AddProjectUpdateModal } from '../components/AddProjectUpdateModal';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { ProjectForSelector } from '../types';

export function ProjectUpdatesPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [publishStatusFilter, setPublishStatusFilter] = useState<
    'all' | 'pending' | 'published'
  >('all');
  const [projectFilter, setProjectFilter] = useState<ProjectForSelector | null>(
    null
  );
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch project updates
  const { data: response, isLoading } = useQuery({
    queryKey: [
      'project-updates',
      page,
      pageSize,
      publishStatusFilter,
      projectFilter?.id,
    ],
    queryFn: () =>
      projectUpdatesApi.fetchProjectUpdates({
        page,
        pageSize,
        publishStatus:
          publishStatusFilter !== 'all' ? publishStatusFilter : undefined,
        projectId: projectFilter?.id,
      }),
  });

  const updates = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength = 100): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getPublishStatusBadge = (
    status: 'pending' | 'published' | 'archived'
  ) => {
    const badges = {
      pending: {
        label: 'Pending',
        className:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      },
      published: {
        label: 'Published',
        className:
          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      },
      archived: {
        label: 'Archived',
        className:
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300',
      },
    };

    const badge = badges[status] || badges.pending;
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Project Updates
          </h1>
          <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
            View and manage project updates
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className='px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2'>
          <Plus className='h-4 w-4' />
          Post Update
        </button>
      </div>

      {/* Filters */}
      <div className='mb-6 space-y-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Publish Status Filter */}
          <Select
            label='Publish Status'
            value={publishStatusFilter}
            onValueChange={value => {
              setPublishStatusFilter(value as 'all' | 'pending' | 'published');
              setPage(1);
            }}>
            <SelectItem value='all'>All</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='published'>Published</SelectItem>
          </Select>

          {/* Project Filter */}
          <div>
            <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
              Project
            </label>
            {projectFilter ? (
              <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900'>
                <div>
                  <p className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    {projectFilter.name}
                  </p>
                  {projectFilter.target_language && (
                    <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                      {projectFilter.target_language.name}
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setProjectFilter(null);
                    setPage(1);
                  }}
                  className='text-xs text-primary-600 dark:text-primary-400 hover:underline'>
                  Clear
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setShowProjectSelector(true)}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left'>
                Select a project...
              </button>
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
              Loading project updates...
            </p>
          </div>
        ) : updates.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-neutral-600 dark:text-neutral-400'>
              No project updates found
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Date and Time
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Project
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Content
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Publish Status
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {updates.map(update => (
                  <tr
                    key={update.id}
                    className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100'>
                      {formatDate(update.created_at)}
                    </td>
                    <td className='px-6 py-4 text-sm'>
                      <div className='font-medium text-neutral-900 dark:text-neutral-100'>
                        {update.project?.name || 'Unknown Project'}
                      </div>
                      {update.project?.target_language && (
                        <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                          {update.project.target_language.name}
                        </div>
                      )}
                    </td>
                    <td className='px-6 py-4 text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                      {update.title}
                    </td>
                    <td className='px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400'>
                      {truncateContent(update.body)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {getPublishStatusBadge(update.publish_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='mt-6 flex items-center justify-between'>
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, totalCount)} of {totalCount} updates
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className='px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1'>
              <ChevronLeft className='h-4 w-4' />
              Previous
            </button>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className='px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1'>
              Next
              <ChevronRight className='h-4 w-4' />
            </button>
          </div>
        </div>
      )}

      {/* Project Selector Modal */}
      <ProjectSelector
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        onSelect={project => {
          setProjectFilter(project);
          setShowProjectSelector(false);
          setPage(1);
        }}
        selectedProjectId={projectFilter?.id}
      />

      {/* Add Project Update Modal */}
      {showAddModal && (
        <AddProjectUpdateModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
