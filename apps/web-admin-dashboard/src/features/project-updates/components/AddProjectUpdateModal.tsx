import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectUpdatesApi } from '../api/projectUpdatesApi';
import { ProjectUpdateMediaUploadService } from '../services/mediaUploadService';
import { ProjectSelector } from './ProjectSelector';
import { MediaUploader } from './MediaUploader';
import { Textarea } from '@everylanguage/shared-ui';
import { X } from 'lucide-react';
import { useAuth } from '@/features/auth';
import type { ProjectForSelector, MediaFileWithPreview } from '../types';
import type { Database } from '@everylanguage/shared-types';

interface AddProjectUpdateModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddProjectUpdateModal({
  onClose,
  onSuccess,
}: AddProjectUpdateModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<ProjectForSelector | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFileWithPreview[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadService = useMemo(
    () => new ProjectUpdateMediaUploadService(),
    []
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject) {
        throw new Error('Please select a project');
      }
      if (!user) {
        throw new Error('You must be logged in to create an update');
      }

      const publishStatus: Database['public']['Enums']['publish_status'] =
        isPublished ? 'published' : 'pending';

      // Step 1: Create the project update
      const update = await projectUpdatesApi.createProjectUpdate({
        project_id: selectedProject.id,
        title: title.trim(),
        body: body.trim(),
        publish_status: publishStatus,
        created_by: user.id,
      });

      // Step 2: Upload media files if any
      if (mediaFiles.length > 0) {
        await uploadService.uploadMedia(update.id, mediaFiles, user.id);
      }

      return update;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-updates'] });
      onSuccess?.();
      onClose();
      // Reset form
      setSelectedProject(null);
      setTitle('');
      setBody('');
      setMediaFiles([]);
      setIsPublished(false);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create project update');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!body.trim()) {
      setError('Content is required');
      return;
    }

    createMutation.mutate();
  };

  return (
    <>
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
                Add Project Update
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

              {/* Project Selector */}
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                  Project <span className='text-red-500'>*</span>
                </label>
                {selectedProject ? (
                  <div className='flex items-center justify-between p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800'>
                    <div>
                      <div className='font-medium text-sm text-neutral-900 dark:text-neutral-100'>
                        {selectedProject.name}
                      </div>
                      {selectedProject.target_language && (
                        <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                          {selectedProject.target_language.name}
                        </div>
                      )}
                      {selectedProject.region && (
                        <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                          {selectedProject.region.name}
                        </div>
                      )}
                    </div>
                    <button
                      type='button'
                      onClick={() => setSelectedProject(null)}
                      className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'>
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => setShowProjectSelector(true)}
                    className='w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-left'>
                    Select a project...
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor='title'
                  className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Title <span className='text-red-500'>*</span>
                </label>
                <input
                  id='title'
                  type='text'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='Enter update title...'
                  required
                  disabled={createMutation.isPending || !selectedProject}
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
                  disabled={createMutation.isPending || !selectedProject}
                  rows={6}
                  className='w-full disabled:opacity-50 disabled:cursor-not-allowed'
                />
              </div>

              {/* Media Uploader */}
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                  Media (optional)
                </label>
                <MediaUploader
                  files={mediaFiles}
                  onFilesChange={setMediaFiles}
                  disabled={createMutation.isPending}
                />
              </div>

              {/* Publish Status Toggle */}
              <div className='flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-800/50'>
                <div>
                  <label
                    htmlFor='publish-toggle'
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
                    id='publish-toggle'
                    type='checkbox'
                    checked={isPublished}
                    onChange={e => setIsPublished(e.target.checked)}
                    disabled={createMutation.isPending}
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
                  disabled={createMutation.isPending}
                  className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={
                    createMutation.isPending ||
                    !selectedProject ||
                    !title.trim() ||
                    !body.trim()
                  }
                  className='px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                  {createMutation.isPending ? 'Posting...' : 'Post Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Project Selector Modal */}
      <ProjectSelector
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        onSelect={project => {
          setSelectedProject(project);
          setShowProjectSelector(false);
        }}
        selectedProjectId={selectedProject?.id}
      />
    </>
  );
}
