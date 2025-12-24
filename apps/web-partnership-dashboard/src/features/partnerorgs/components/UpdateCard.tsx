import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { formatRelativeDate } from '@/shared/utils/formatters';
import { normalizeSupabaseRelation } from '@/shared/utils/supabase-helpers';
import { DownloadService } from '@/shared/services/downloadService';
import type { PartnerOrgUpdate, ProjectUpdate } from '../types';

export interface UpdateCardProps {
  update: PartnerOrgUpdate | ProjectUpdate;
  showProject?: boolean; // Show project name for partner org view
  variant?: 'compact' | 'full'; // Compact for feeds, full for dedicated page
}

export const UpdateCard: React.FC<UpdateCardProps> = ({
  update,
  showProject = false,
  variant = 'full',
}) => {
  const timestamp: string =
    'timestamp' in update
      ? String(update.timestamp)
      : String(update.created_at);
  const project = normalizeSupabaseRelation(
    'project' in update ? update.project : null
  );
  const languageEntity = project?.language_entity
    ? normalizeSupabaseRelation(project.language_entity)
    : null;
  const creator = normalizeSupabaseRelation(
    'creator' in update ? update.creator : null
  );
  const media = 'media' in update && update.media ? update.media : [];
  const projectName =
    showProject &&
    'project_name' in update &&
    update.project_name &&
    typeof update.project_name === 'string'
      ? update.project_name
      : null;

  // State for media URLs (only used in full variant)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Fetch media URLs when component mounts (only for full variant)
  useEffect(() => {
    if (variant !== 'full' || media.length === 0) {
      return;
    }

    const loadMediaUrls = async () => {
      try {
        setMediaLoading(true);
        setMediaError(null);
        const downloadService = new DownloadService();
        const mediaIds = media.map((m: any) => m.id).filter(Boolean);

        if (mediaIds.length === 0) {
          setMediaLoading(false);
          return;
        }

        const result = await downloadService.getDownloadUrlsById({
          projectUpdatesMediaIds: mediaIds,
          expirationHours: 24,
        });

        if (result.projectUpdatesMedia) {
          setMediaUrls(result.projectUpdatesMedia);
        }
      } catch (err) {
        console.error('Error loading media URLs:', err);
        setMediaError('Failed to load media');
      } finally {
        setMediaLoading(false);
      }
    };

    loadMediaUrls();
  }, [media, variant]);

  if (variant === 'compact') {
    // Compact version for feeds
    return (
      <div className='border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-0 last:pb-0'>
        <div className='flex items-start justify-between mb-1'>
          <div className='font-semibold'>
            {'title' in update ? update.title : ''}
          </div>
          <div className='text-xs text-neutral-500'>
            {formatRelativeDate(timestamp)}
          </div>
        </div>
        {'body' in update && (
          <div className='text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2'>
            {update.body}
          </div>
        )}
        {languageEntity && (
          <div className='text-xs text-neutral-500 mt-1'>
            {languageEntity.name}
          </div>
        )}
      </div>
    );
  }

  // Full version for dedicated pages
  return (
    <Card className='border border-neutral-200 dark:border-neutral-800'>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle>{'title' in update ? update.title : ''}</CardTitle>
            <div className='text-xs text-neutral-500 mt-1'>
              {formatRelativeDate(timestamp)}
              {showProject && languageEntity && <> • {languageEntity.name}</>}
              {projectName && <> • {projectName}</>}
              {!showProject && languageEntity && project && (
                <>
                  {' '}
                  • {languageEntity.name} • {project.name}
                </>
              )}
              {creator && <> • by {creator.full_name}</>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {'body' in update && (
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            <p className='whitespace-pre-wrap'>{update.body}</p>
          </div>
        )}

        {/* Media attachments */}
        {media && media.length > 0 && (
          <div className='mt-6 space-y-4'>
            <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
              Attachments ({media.length})
            </div>
            {mediaLoading && (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {media.map((m: any) => (
                  <div
                    key={m.id}
                    className='aspect-video bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse'
                  />
                ))}
              </div>
            )}
            {mediaError && (
              <div className='text-sm text-neutral-500'>{mediaError}</div>
            )}
            {!mediaLoading && !mediaError && (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {media
                  .sort((a: any, b: any) => {
                    const aOrder = a.display_order ?? 0;
                    const bOrder = b.display_order ?? 0;
                    return aOrder - bOrder;
                  })
                  .map((m: any) => {
                    const url = mediaUrls[m.id];

                    return (
                      <div
                        key={m.id}
                        className='border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden'>
                        {url ? (
                          <>
                            {m.media_type === 'image' ? (
                              <img
                                src={url}
                                alt={
                                  m.caption || m.original_filename || 'Image'
                                }
                                className='w-full h-auto object-cover'
                              />
                            ) : (
                              <video
                                src={url}
                                controls
                                className='w-full h-auto'
                                preload='metadata'>
                                Your browser does not support the video tag.
                              </video>
                            )}
                            {m.caption && (
                              <div className='p-3 text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900'>
                                {m.caption}
                              </div>
                            )}
                          </>
                        ) : (
                          // Fallback to metadata display if URL not available
                          <div className='p-4'>
                            <div className='flex items-center gap-3 mb-2'>
                              {m.media_type === 'image' && (
                                <svg
                                  className='w-8 h-8 text-neutral-400'
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'>
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                                  />
                                </svg>
                              )}
                              {m.media_type === 'video' && (
                                <svg
                                  className='w-8 h-8 text-neutral-400'
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'>
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                                  />
                                </svg>
                              )}
                              <div className='text-xs text-neutral-500'>
                                {m.media_type?.toUpperCase()}
                              </div>
                            </div>
                            <div className='text-sm font-medium truncate'>
                              {m.original_filename || 'Untitled'}
                            </div>
                            {m.file_type && (
                              <div className='text-xs text-neutral-500'>
                                {m.media_type === 'video' &&
                                  m.duration_seconds && (
                                    <span>
                                      {Math.floor(m.duration_seconds / 60)}:
                                      {String(m.duration_seconds % 60).padStart(
                                        2,
                                        '0'
                                      )}{' '}
                                      •{' '}
                                    </span>
                                  )}
                                {m.file_type?.toUpperCase()}
                              </div>
                            )}
                            {m.caption && (
                              <div className='text-sm text-neutral-600 dark:text-neutral-400 mt-2'>
                                {m.caption}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
