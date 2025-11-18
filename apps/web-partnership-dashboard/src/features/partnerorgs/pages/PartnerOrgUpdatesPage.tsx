'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/Card';
import { usePartnerOrgUpdates } from '../hooks/usePartnerOrgUpdates';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export const PartnerOrgUpdatesPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: updates, isLoading } = usePartnerOrgUpdates(orgId!);

  if (isLoading) {
    return <div className='text-neutral-500'>Loading updates...</div>;
  }

  if (!updates || updates.length === 0) {
    return (
      <Card className='border border-neutral-200 dark:border-neutral-800'>
        <CardContent className='py-12 text-center text-neutral-500'>
          No updates available for this partner organization
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {updates.map(update => {
        if (update.type === 'project_update') {
          const project = update.project;
          const languageEntity = project?.language_entity
            ? Array.isArray(project.language_entity)
              ? project.language_entity[0]
              : project.language_entity
            : null;

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
                      {formatDate(update.timestamp)}
                      {languageEntity && <> • {languageEntity.name}</>}
                      {update.project_name && <> • {update.project_name}</>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='prose prose-sm dark:prose-invert max-w-none'>
                  <p className='whitespace-pre-wrap'>{update.body}</p>
                </div>

                {/* Media attachments */}
                {update.media && update.media.length > 0 && (
                  <div className='mt-6 space-y-4'>
                    <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                      Attachments ({update.media.length})
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {update.media
                        .sort(
                          (a: any, b: any) =>
                            (a.display_order || 0) - (b.display_order || 0)
                        )
                        .map((m: any) => (
                          <div
                            key={m.id}
                            className='border border-neutral-200 dark:border-neutral-800 rounded-lg p-4'
                          >
                            <div className='flex items-center gap-3 mb-2'>
                              <div className='text-xs text-neutral-500'>
                                {m.media_type?.toUpperCase()}
                              </div>
                            </div>
                            <div className='text-sm font-medium truncate'>
                              {m.original_filename || 'Untitled'}
                            </div>
                            {m.caption && (
                              <div className='text-sm text-neutral-600 dark:text-neutral-400 mt-2'>
                                {m.caption}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        } else {
          // Bible audio upload
          return (
            <Card
              key={update.id}
              className='border border-neutral-200 dark:border-neutral-800'
            >
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div>
                    <CardTitle>Bible Audio Upload</CardTitle>
                    <div className='text-xs text-neutral-500 mt-1'>
                      {formatDate(update.timestamp)}
                      {update.language_name && <> • {update.language_name}</>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-sm'>
                  {update.book_name && (
                    <div>
                      <span className='font-medium'>{update.book_name}</span>
                      {update.chapter_number !== null &&
                        update.chapter_number !== undefined && (
                          <span> Chapter {update.chapter_number}</span>
                        )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }
      })}
    </div>
  );
};
