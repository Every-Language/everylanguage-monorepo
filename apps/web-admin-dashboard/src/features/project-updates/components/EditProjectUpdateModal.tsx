import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { projectUpdatesApi } from '../api/projectUpdatesApi';
import { ProjectUpdateMediaUploadService } from '../services/mediaUploadService';
import { downloadService } from '@/shared/services/downloadService';
import { MediaUploader } from './MediaUploader';
import { Textarea } from '@everylanguage/shared-ui';
import { X, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/features/auth';
import type {
  ProjectUpdateWithProject,
  UpdateProjectUpdateData,
  MediaFileWithPreview,
} from '../types';
import type { Database } from '@everylanguage/shared-types';

interface EditProjectUpdateModalProps {
  update: ProjectUpdateWithProject;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProjectUpdateModal({
  update,
  onClose,
  onSuccess,
}: EditProjectUpdateModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(update.title);
  const [body, setBody] = useState(update.body);
  const [isPublished, setIsPublished] = useState(
    update.publish_status === 'published'
  );
  const [error, setError] = useState<string | null>(null);
  const [newMediaFiles, setNewMediaFiles] = useState<MediaFileWithPreview[]>(
    []
  );
  const [mediaToDelete, setMediaToDelete] = useState<Set<string>>(new Set());
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  const uploadService = useMemo(
    () => new ProjectUpdateMediaUploadService(),
    []
  );

  // Fetch existing media
  const { data: existingMedia } = useQuery({
    queryKey: ['project-update-media', update.id],
    queryFn: () => projectUpdatesApi.fetchProjectUpdateMedia(update.id),
  });

  // Load media URLs for display
  const { data: mediaUrlsData } = useQuery({
    queryKey: [
      'project-update-media-urls',
      existingMedia?.map(m => m.id).join(','),
    ],
    queryFn: async () => {
      if (!existingMedia || existingMedia.length === 0) return {};

      const result = await downloadService.getDownloadUrlsById({
        projectUpdatesMediaIds: existingMedia.map(m => m.id),
        expirationHours: 24,
      });

      return result.projectUpdatesMedia || {};
    },
    enabled: !!existingMedia && existingMedia.length > 0,
  });

  useEffect(() => {
    if (mediaUrlsData) {
      setMediaUrls(mediaUrlsData);
    }
  }, [mediaUrlsData]);

  // Filter out deleted media
  const displayedMedia =
    existingMedia?.filter(m => !mediaToDelete.has(m.id)) || [];

  // Update local state when update prop changes
  useEffect(() => {
    setTitle(update.title);
    setBody(update.body);
    setIsPublished(update.publish_status === 'published');
    setNewMediaFiles([]);
    setMediaToDelete(new Set());
  }, [update]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('You must be logged in to update an update');
      }

      const publishStatus: Database['public']['Enums']['publish_status'] =
        isPublished ? 'published' : 'pending';

      const updateData: UpdateProjectUpdateData = {
        title: title.trim(),
        body: body.trim(),
        publish_status: publishStatus,
      };

      // Step 1: Update the project update
      await projectUpdatesApi.updateProjectUpdate(update.id, updateData);

      // Step 2: Delete media that were marked for deletion
      const deletePromises = Array.from(mediaToDelete).map(mediaId =>
        projectUpdatesApi.deleteProjectUpdateMedia(mediaId)
      );
      await Promise.all(deletePromises);

      // Step 3: Upload new media files
      if (newMediaFiles.length > 0) {
        await uploadService.uploadMedia(update.id, newMediaFiles, user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-updates'] });
      queryClient.invalidateQueries({ queryKey: ['project-update-media'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update project update');
    },
  });

  const handleDeleteMedia = (mediaId: string) => {
    setMediaToDelete(prev => new Set(prev).add(mediaId));
  };

  const handleRestoreMedia = (mediaId: string) => {
    setMediaToDelete(prev => {
      const newSet = new Set(prev);
      newSet.delete(mediaId);
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!body.trim()) {
      setError('Content is required');
      return;
    }

    updateMutation.mutate();
  };

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex min-h-screen items-center justify-center p-4'>
        {/* Backdrop */}
        <div
          className='fixed inset-0 bg-black/50 transition-opacity'
          onClick={onClose}
        />

        {/* Modal */}
        <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto'>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10'>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              Edit Project Update
            </h2>
            <button
              onClick={onClose}
              className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
              <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='p-6 space-y-6'>
            {error && (
              <div className='bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4'>
                <p className='text-sm text-red-800 dark:text-red-200'>
                  {error}
                </p>
              </div>
            )}

            {/* Project Info (read-only) */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                Project
              </label>
              <div className='p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800'>
                <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                  {update.project?.name || 'Unknown Project'}
                </div>
                {update.project?.target_language && (
                  <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                    {update.project.target_language.name}
                  </div>
                )}
                {update.project?.region && (
                  <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                    {update.project.region.name}
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor='edit-title'
                className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Title <span className='text-red-500'>*</span>
              </label>
              <input
                id='edit-title'
                type='text'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='Enter update title...'
                required
                disabled={updateMutation.isPending}
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'
              />
            </div>

            {/* Body */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                Content <span className='text-red-500'>*</span>
              </label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder='Write your update...'
                required
                disabled={updateMutation.isPending}
                rows={6}
                className='w-full disabled:opacity-50 disabled:cursor-not-allowed'
              />
            </div>

            {/* Existing Media */}
            {displayedMedia.length > 0 && (
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                  Existing Media ({displayedMedia.length})
                </label>
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
                  {displayedMedia.map(media => {
                    const url = mediaUrls[media.id];
                    return (
                      <div
                        key={media.id}
                        className='relative border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-800'>
                        <div className='aspect-video bg-neutral-100 dark:bg-neutral-900'>
                          {url ? (
                            media.media_type === 'image' ? (
                              <img
                                src={url}
                                alt={media.original_filename || 'Media'}
                                className='w-full h-full object-cover'
                              />
                            ) : (
                              <div className='w-full h-full flex items-center justify-center'>
                                <ImageIcon className='h-8 w-8 text-neutral-400' />
                              </div>
                            )
                          ) : (
                            <div className='w-full h-full flex items-center justify-center'>
                              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-400'></div>
                            </div>
                          )}
                        </div>
                        <button
                          type='button'
                          onClick={() => handleDeleteMedia(media.id)}
                          disabled={updateMutation.isPending}
                          className='absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                        {media.caption && (
                          <div className='p-2 text-xs text-neutral-600 dark:text-neutral-400 truncate'>
                            {media.caption}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Media to Delete (show if any) */}
            {mediaToDelete.size > 0 && (
              <div className='bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-4'>
                <p className='text-sm text-yellow-800 dark:text-yellow-200 mb-2'>
                  {mediaToDelete.size} media item
                  {mediaToDelete.size > 1 ? 's' : ''} will be deleted
                </p>
                <div className='flex flex-wrap gap-2'>
                  {Array.from(mediaToDelete).map(mediaId => {
                    const media = existingMedia?.find(m => m.id === mediaId);
                    return (
                      <button
                        key={mediaId}
                        type='button'
                        onClick={() => handleRestoreMedia(mediaId)}
                        className='text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800'>
                        {media?.original_filename || 'Media'} (click to restore)
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add New Media */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                Add New Media (optional)
              </label>
              <MediaUploader
                files={newMediaFiles}
                onFilesChange={setNewMediaFiles}
                disabled={updateMutation.isPending}
              />
            </div>

            {/* Publish Status Toggle */}
            <div className='flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-800/50'>
              <div>
                <label
                  htmlFor='edit-publish-toggle'
                  className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                  Publish Status
                </label>
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                  {isPublished
                    ? 'Update will be published immediately'
                    : 'Update will be saved as pending'}
                </p>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  id='edit-publish-toggle'
                  type='checkbox'
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  disabled={updateMutation.isPending}
                  className='sr-only peer'
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Actions */}
            <div className='flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800'>
              <button
                type='button'
                onClick={onClose}
                disabled={updateMutation.isPending}
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                Cancel
              </button>
              <button
                type='submit'
                disabled={
                  updateMutation.isPending ||
                  !title.trim() ||
                  !body.trim() ||
                  (title === update.title &&
                    body === update.body &&
                    isPublished === (update.publish_status === 'published') &&
                    newMediaFiles.length === 0 &&
                    mediaToDelete.size === 0)
                }
                className='px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
