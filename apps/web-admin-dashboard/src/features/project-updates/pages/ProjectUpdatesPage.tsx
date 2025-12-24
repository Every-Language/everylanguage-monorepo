import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectUpdatesApi } from '../api/projectUpdatesApi';
import { ProjectSelector } from '../components/ProjectSelector';
import { AddProjectUpdateModal } from '../components/AddProjectUpdateModal';
import { EditProjectUpdateModal } from '../components/EditProjectUpdateModal';
import { downloadService } from '@/shared/services/downloadService';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import type { ProjectForSelector, ProjectUpdateWithProject } from '../types';

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
  const [editingUpdate, setEditingUpdate] =
    useState<ProjectUpdateWithProject | null>(null);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<
    Record<string, Record<string, string>>
  >({});
  const queryClient = useQueryClient();

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

  const updates = useMemo(() => response?.data || [], [response?.data]);
  const totalCount = response?.count || 0;
  const totalPages = response?.totalPages || 1;

  // Memoize media IDs and update-to-media mapping to avoid recreating on every render
  const { allMediaIds, updateMediaMap } = useMemo(() => {
    const mediaIds: string[] = [];
    const mediaMap: Record<
      string,
      Array<{ id: string; media_type: string }>
    > = {};

    for (const update of updates) {
      if (update.media && update.media.length > 0) {
        mediaMap[update.id] = update.media;
        for (const media of update.media) {
          if (media.id && !mediaIds.includes(media.id)) {
            mediaIds.push(media.id);
          }
        }
      }
    }

    return {
      allMediaIds: mediaIds.sort(),
      updateMediaMap: mediaMap,
    };
  }, [updates]);

  // Load media URLs for thumbnails
  const { data: mediaUrlsData } = useQuery({
    queryKey: ['project-updates-media-urls', allMediaIds.join(',')],
    queryFn: async () => {
      if (allMediaIds.length === 0) {
        return {};
      }

      const urlMap: Record<string, Record<string, string>> = {};

      try {
        // Fetch all media URLs in one call
        const result = await downloadService.getDownloadUrlsById({
          projectUpdatesMediaIds: allMediaIds,
          expirationHours: 24,
        });

        if (result.projectUpdatesMedia) {
          // Map URLs back to updates using the memoized map
          for (const [updateId, mediaList] of Object.entries(updateMediaMap)) {
            const updateMediaUrls: Record<string, string> = {};
            for (const media of mediaList) {
              const url = result.projectUpdatesMedia?.[media.id];
              if (url) {
                updateMediaUrls[media.id] = url;
              }
            }
            if (Object.keys(updateMediaUrls).length > 0) {
              urlMap[updateId] = updateMediaUrls;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load media URLs:', error);
        // Return empty map on error instead of throwing
        return {};
      }

      return urlMap;
    },
    enabled: allMediaIds.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });

  // Update mediaUrls state when data changes
  useEffect(() => {
    if (mediaUrlsData) {
      setMediaUrls(mediaUrlsData);
    }
  }, [mediaUrlsData]);

  const deleteMutation = useMutation({
    mutationFn: async (updateId: string) => {
      await projectUpdatesApi.deleteProjectUpdate(updateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-updates'] });
      setDeletingUpdateId(null);
    },
  });

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
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Media
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400'>
                    Actions
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
                    <td className='px-6 py-4'>
                      {update.media && update.media.length > 0 ? (
                        <div className='flex gap-2 flex-wrap'>
                          {update.media.slice(0, 3).map(media => {
                            const urls = mediaUrls[update.id];
                            const url = urls?.[media.id];
                            return (
                              <div
                                key={media.id}
                                className='relative w-16 h-16 rounded overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800'>
                                {url ? (
                                  media.media_type === 'image' ? (
                                    <img
                                      src={url}
                                      alt={media.original_filename || 'Media'}
                                      className='w-full h-full object-cover'
                                    />
                                  ) : (
                                    <div className='w-full h-full flex items-center justify-center'>
                                      <ImageIcon className='h-6 w-6 text-neutral-400' />
                                    </div>
                                  )
                                ) : (
                                  <div className='w-full h-full flex items-center justify-center'>
                                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-400'></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {update.media.length > 3 && (
                            <div className='w-16 h-16 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-xs text-neutral-500'>
                              +{update.media.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className='text-sm text-neutral-400'>
                          No media
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setEditingUpdate(update)}
                          className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors'>
                          <Pencil className='h-4 w-4' />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingUpdateId(update.id)}
                          className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-neutral-800 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors'>
                          <Trash2 className='h-4 w-4' />
                          Delete
                        </button>
                      </div>
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

      {/* Edit Project Update Modal */}
      {editingUpdate && (
        <EditProjectUpdateModal
          update={editingUpdate}
          onClose={() => setEditingUpdate(null)}
          onSuccess={() => {
            setEditingUpdate(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingUpdateId && (
        <div className='fixed inset-0 z-50 overflow-y-auto'>
          <div className='flex min-h-screen items-center justify-center p-4'>
            <div className='fixed inset-0 bg-black/50 transition-opacity' />
            <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Delete Project Update
              </h3>
              <p className='text-sm text-neutral-600 dark:text-neutral-400 mb-6'>
                Are you sure you want to delete this project update? This will
                hide it from view, but it can be restored later if needed.
              </p>
              <div className='flex justify-end gap-3'>
                <button
                  onClick={() => setDeletingUpdateId(null)}
                  disabled={deleteMutation.isPending}
                  className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMutation.mutate(deletingUpdateId);
                  }}
                  disabled={deleteMutation.isPending}
                  className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
