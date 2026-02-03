import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Volume2, FileText, TrendingUp } from 'lucide-react';
import { useProjectFromRoute } from '../../features/dashboard/hooks/useProjectFromRoute';
import { useAudioVersionsByProject } from '../../shared/hooks/query/audio-versions';
import { useTextVersionsByProject } from '../../shared/hooks/query/text-versions';
import { useBibleVersionsQuery } from '../../shared/hooks/query/bible-versions';
import { Card, CardContent } from '../../shared/design-system/components/Card';
import { LoadingSpinner } from '../../shared/design-system/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

export const ProgressPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, isLoading: projectLoading } = useProjectFromRoute();

  const { data: audioVersions = [], isLoading: audioLoading } =
    useAudioVersionsByProject(projectId || null);
  const { data: textVersions = [], isLoading: textLoading } =
    useTextVersionsByProject(projectId || null);
  const { data: bibleVersions = [] } = useBibleVersionsQuery();

  const isLoading = projectLoading || audioLoading || textLoading;

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (!project) {
    return (
      <div className='p-8'>
        <Card>
          <CardContent className='py-12 text-center'>
            <h3 className='text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2'>
              Project Not Found
            </h3>
            <p className='text-neutral-600 dark:text-neutral-400'>
              The project you're looking for doesn't exist or you don't have
              access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-5'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
          Bible Progress
        </h1>
        <p className='text-sm text-neutral-600 dark:text-neutral-400 mt-0.5'>
          Track translation and recording progress for {project.name}
        </p>
      </div>

      {/* Version Selection Cards */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
        {/* Audio Versions Section */}
        <div>
          <div className='flex items-center gap-2 mb-3'>
            <div className='w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center'>
              <Volume2 className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
            </div>
            <h2 className='text-base font-semibold text-neutral-900 dark:text-white'>
              Audio Versions
            </h2>
          </div>

          {audioVersions.length === 0 ? (
            <Card>
              <CardContent className='py-6 text-center'>
                <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                  No audio versions yet. Create one from the Audio Versions
                  page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-2'>
              {audioVersions.map(version => {
                const bibleVersion = bibleVersions.find(
                  bv => bv.id === version.bible_version_id
                );

                return (
                  <Card
                    key={version.id}
                    className='cursor-pointer hover:shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all'
                    onClick={() =>
                      navigate(
                        `/project/${projectId}/progress/audio-version/${version.id}`
                      )
                    }>
                    <CardContent className='p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2.5'>
                          <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center'>
                            <Volume2 className='w-4 h-4 text-white' />
                          </div>
                          <div>
                            <h3 className='text-sm font-medium text-neutral-900 dark:text-white'>
                              {version.name}
                            </h3>
                            {bibleVersion && (
                              <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                                {bibleVersion.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <TrendingUp className='w-3.5 h-3.5 text-neutral-400' />
                          <span className='text-xs text-neutral-500'>View</span>
                        </div>
                      </div>
                      <div className='mt-1.5 text-[10px] text-neutral-400'>
                        {(version.updated_at || version.created_at) && (
                          <>
                            Updated{' '}
                            {formatDistanceToNow(
                              new Date(
                                (version.updated_at || version.created_at)!
                              ),
                              { addSuffix: true }
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Text Versions Section */}
        <div>
          <div className='flex items-center gap-2 mb-3'>
            <div className='w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-md flex items-center justify-center'>
              <FileText className='w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400' />
            </div>
            <h2 className='text-base font-semibold text-neutral-900 dark:text-white'>
              Text Versions
            </h2>
          </div>

          {textVersions.length === 0 ? (
            <Card>
              <CardContent className='py-6 text-center'>
                <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                  No text versions yet. Create one from the Text Versions page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-2'>
              {textVersions.map(version => {
                const bibleVersion = bibleVersions.find(
                  bv => bv.id === version.bible_version_id
                );

                return (
                  <Card
                    key={version.id}
                    className='cursor-pointer hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all'
                    onClick={() =>
                      navigate(
                        `/project/${projectId}/progress/text-version/${version.id}`
                      )
                    }>
                    <CardContent className='p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2.5'>
                          <div className='w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center'>
                            <FileText className='w-4 h-4 text-white' />
                          </div>
                          <div>
                            <h3 className='text-sm font-medium text-neutral-900 dark:text-white'>
                              {version.name}
                            </h3>
                            {bibleVersion && (
                              <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                                {bibleVersion.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <TrendingUp className='w-3.5 h-3.5 text-neutral-400' />
                          <span className='text-xs text-neutral-500'>View</span>
                        </div>
                      </div>
                      <div className='mt-1.5 text-[10px] text-neutral-400'>
                        {(version.updated_at || version.created_at) && (
                          <>
                            Updated{' '}
                            {formatDistanceToNow(
                              new Date(
                                (version.updated_at || version.created_at)!
                              ),
                              { addSuffix: true }
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
