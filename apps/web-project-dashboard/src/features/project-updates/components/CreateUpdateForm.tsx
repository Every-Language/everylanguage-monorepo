import React, { useState, useCallback } from 'react';
import { Button, Input } from '@/shared/design-system';
import { Textarea } from '@everylanguage/shared-ui';
import { MediaUploader } from './MediaUploader';
import { useCreateProjectUpdate } from '../hooks/useProjectUpdateMutations';
import { ProjectUpdateMediaUploadService } from '../services/mediaUploadService';
import { useAuth } from '@/features/auth';
import type { MediaFileWithPreview } from '../types';

interface CreateUpdateFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateUpdateForm: React.FC<CreateUpdateFormProps> = ({
  projectId,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const createUpdate = useCreateProjectUpdate();
  const uploadService = React.useMemo(
    () => new ProjectUpdateMediaUploadService(),
    []
  );

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFileWithPreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!title.trim()) {
        setError('Title is required');
        return;
      }

      if (!body.trim()) {
        setError('Body is required');
        return;
      }

      if (!user) {
        setError('You must be logged in to create an update');
        return;
      }

      setIsSubmitting(true);

      try {
        // Step 1: Create the project update
        const update = await createUpdate.mutateAsync({
          project_id: projectId,
          title: title.trim(),
          body: body.trim(),
          created_by: user.id,
        });

        // Step 2: Upload media files if any
        if (mediaFiles.length > 0) {
          await uploadService.uploadMedia(update.id, mediaFiles, user.id);
        }

        // Step 3: Success - reset form and call callback
        setTitle('');
        setBody('');
        setMediaFiles([]);
        onSuccess?.();
      } catch (err) {
        console.error('Error creating update:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to create update. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      body,
      mediaFiles,
      user,
      projectId,
      createUpdate,
      uploadService,
      onSuccess,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {error && (
        <div className='bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-4'>
          <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
        </div>
      )}

      <Input
        label='Title'
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder='Enter update title...'
        required
        disabled={isSubmitting}
        className='w-full'
      />

      <Textarea
        label='Body'
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder='Write your update...'
        required
        disabled={isSubmitting}
        rows={6}
        className='w-full'
      />

      <div>
        <MediaUploader
          files={mediaFiles}
          onFilesChange={setMediaFiles}
          disabled={isSubmitting}
        />
      </div>

      <div className='flex justify-end gap-3'>
        {onCancel && (
          <Button
            type='button'
            variant='secondary'
            onClick={onCancel}
            disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type='submit' loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Posting...' : 'Post Update'}
        </Button>
      </div>
    </form>
  );
};
