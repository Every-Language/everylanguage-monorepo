import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@/shared/design-system';
import { MediaDisplay } from './MediaDisplay';
import { useDeleteProjectUpdate } from '../hooks/useProjectUpdateMutations';
import { useAuth } from '@/features/auth';
import type { ProjectUpdateWithRelations } from '../types';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface UpdateCardProps {
  update: ProjectUpdateWithRelations;
  onEdit?: (update: ProjectUpdateWithRelations) => void;
  className?: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
};

export const UpdateCard: React.FC<UpdateCardProps> = ({
  update,
  onEdit,
  className,
}) => {
  const { user } = useAuth();
  const deleteUpdate = useDeleteProjectUpdate();

  const creator = Array.isArray(update.creator)
    ? update.creator[0]
    : update.creator;
  const media = Array.isArray(update.media) ? update.media : [];

  const canEdit = user?.id === update.created_by;
  const isDeleting = deleteUpdate.isPending;

  const handleDelete = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this update? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await deleteUpdate.mutateAsync(update.id);
    } catch (error) {
      console.error('Error deleting update:', error);
      alert('Failed to delete update. Please try again.');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <CardTitle>{update.title}</CardTitle>
            <div className='text-xs text-neutral-500 mt-1'>
              {formatDate(update.created_at)}
              {creator && <> • by {creator.full_name}</>}
            </div>
          </div>
          {canEdit && (
            <div className='flex gap-2'>
              {onEdit && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onEdit(update)}
                  disabled={isDeleting}
                >
                  <PencilIcon className='h-4 w-4' />
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                onClick={handleDelete}
                loading={isDeleting}
                disabled={isDeleting}
              >
                <TrashIcon className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='prose prose-sm dark:prose-invert max-w-none mb-4'>
          <p className='whitespace-pre-wrap text-neutral-700 dark:text-neutral-300'>
            {update.body}
          </p>
        </div>

        {media.length > 0 && <MediaDisplay media={media} />}
      </CardContent>
    </Card>
  );
};
