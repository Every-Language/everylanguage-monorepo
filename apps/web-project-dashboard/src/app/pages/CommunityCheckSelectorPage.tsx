import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Volume2, CheckCircle } from 'lucide-react';
import { useProjectFromRoute } from '../../features/dashboard/hooks/useProjectFromRoute';
import { useAudioVersionsByProject } from '../../shared/hooks/query/audio-versions';
import { useBibleVersionsQuery } from '../../shared/hooks/query/bible-versions';
import { Card, CardContent } from '../../shared/design-system/components/Card';
import { LoadingSpinner } from '../../shared/design-system/components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

export const CommunityCheckSelectorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, isLoading: projectLoading } = useProjectFromRoute();

  const { data: audioVersions = [], isLoading: audioLoading } =
    useAudioVersionsByProject(projectId || null);
  const { data: bibleVersions = [] } = useBibleVersionsQuery();

  const isLoading = projectLoading || audioLoading;

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
    <div className='p-8 space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Community Check
        </h1>
        <p className='text-neutral-600 dark:text-neutral-400 mt-1'>
          Select an audio version to review and provide community feedback for{' '}
          {project.name}
        </p>
      </div>

      {/* Audio Version Selection */}
      {audioVersions.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <div className='w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Volume2 className='w-8 h-8 text-neutral-400' />
            </div>
            <h3 className='text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2'>
              No Audio Versions Available
            </h3>
            <p className='text-neutral-600 dark:text-neutral-400 max-w-md mx-auto'>
              Create audio versions and upload recordings before starting
              community check.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {audioVersions.map(version => {
            const bibleVersion = bibleVersions.find(
              bv => bv.id === version.bible_version_id
            );

            return (
              <Card
                key={version.id}
                className='group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-accent-300 dark:hover:border-accent-700'
                onClick={() =>
                  navigate(
                    `/project/${projectId}/community-check/audio-version/${version.id}`
                  )
                }>
                <CardContent className='p-6'>
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center'>
                        <CheckCircle className='w-5 h-5 text-white' />
                      </div>
                      <div>
                        <h3 className='font-semibold text-neutral-900 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors'>
                          {version.name}
                        </h3>
                        {bibleVersion && (
                          <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                            {bibleVersion.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-neutral-400'>
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
                    </span>
                    <span className='text-xs text-accent-600 dark:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity'>
                      Start Review →
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
