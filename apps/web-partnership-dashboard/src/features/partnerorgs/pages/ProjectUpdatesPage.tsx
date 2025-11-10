import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { useProjectUpdates } from '../hooks/useProjectUpdates';

const formatDate = (dateString: string) => {
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

export const ProjectUpdatesPage: React.FC = () => {
  const { projectId, orgId } = useParams<{
    projectId: string;
    orgId: string;
  }>();
  const { data: updates, isLoading } = useProjectUpdates(
    projectId || 'all',
    orgId
  );

  if (isLoading) {
    return <div className='text-neutral-500'>Loading updates...</div>;
  }

  if (!updates || updates.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No updates available for this project
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {updates.map(update => {
        const project = Array.isArray(update.project)
          ? update.project[0]
          : update.project;
        const languageEntity = project?.language_entity
          ? Array.isArray(project.language_entity)
            ? project.language_entity[0]
            : project.language_entity
          : null;
        const creator = Array.isArray(update.creator)
          ? update.creator[0]
          : update.creator;
        const media = Array.isArray(update.media) ? update.media : [];

        return (
          <Card
            key={update.id}
            className='border border-neutral-200 dark:border-neutral-800'
          >
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div>
                  <CardTitle>{update.title}</CardTitle>
                  <div className='text-xs text-neutral-500 mt-1'>
                    {formatDate(update.created_at)}
                    {projectId === 'all' && languageEntity && (
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
              <div className='prose prose-sm dark:prose-invert max-w-none'>
                <p className='whitespace-pre-wrap'>{update.body}</p>
              </div>

              {/* Media attachments */}
              {media && media.length > 0 && (
                <div className='mt-6 space-y-4'>
                  <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                    Attachments ({media.length})
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    {media
                      .sort(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (a: any, b: any) => a.display_order - b.display_order
                      )
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .map((m: any) => (
                        <div
                          key={m.id}
                          className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-4'
                        >
                          <div className='flex items-center gap-3 mb-2'>
                            <div className='flex-shrink-0'>
                              {m.media_type === 'image' && (
                                <svg
                                  className='w-8 h-8 text-neutral-400'
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'
                                >
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
                                  viewBox='0 0 24 24'
                                >
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                                  />
                                </svg>
                              )}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div className='text-sm font-medium truncate'>
                                {m.original_filename || 'Untitled'}
                              </div>
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
                            </div>
                          </div>

                          {m.caption && (
                            <div className='text-sm text-neutral-600 dark:text-neutral-400 mt-2'>
                              {m.caption}
                            </div>
                          )}

                          <div className='mt-3 text-xs text-neutral-400 font-mono truncate'>
                            {m.object_key}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProjectUpdatesPage;
