import React, { useState, useEffect } from 'react';
import { DownloadService } from '@/shared/services/downloadService';
import type { ProjectUpdateMediaRow } from '../types';
import { cn } from '@/shared/design-system/utils';

interface MediaDisplayProps {
  media: ProjectUpdateMediaRow[];
  className?: string;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
  media,
  className,
}) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUrls = async () => {
      if (media.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const downloadService = new DownloadService();
        const mediaIds = media.map(m => m.id);
        const result = await downloadService.getDownloadUrlsById({
          projectUpdatesMediaIds: mediaIds,
          expirationHours: 24,
        });

        if (result.projectUpdatesMedia) {
          setUrls(result.projectUpdatesMedia);
        }
        setError(null);
      } catch (err) {
        console.error('Error loading media URLs:', err);
        setError('Failed to load media');
      } finally {
        setLoading(false);
      }
    };

    loadUrls();
  }, [media]);

  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
        {media.map(m => (
          <div
            key={m.id}
            className='aspect-video bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse'
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-sm text-neutral-500', className)}>{error}</div>
    );
  }

  if (media.length === 0) {
    return null;
  }

  const sortedMedia = [...media].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
        Attachments ({sortedMedia.length})
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {sortedMedia.map(m => {
          const url = urls[m.id];
          if (!url) return null;

          return (
            <div
              key={m.id}
              className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'
            >
              {m.media_type === 'image' ? (
                <img
                  src={url}
                  alt={m.caption || m.original_filename || 'Image'}
                  className='w-full h-auto object-cover'
                />
              ) : (
                <video
                  src={url}
                  controls
                  className='w-full h-auto'
                  preload='metadata'
                >
                  Your browser does not support the video tag.
                </video>
              )}
              {m.caption && (
                <div className='p-3 text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900'>
                  {m.caption}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
