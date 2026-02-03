import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
  Button,
} from '../../../../shared/design-system';
import type { ProjectMetadata } from '../../../../shared/hooks/query/dashboard';
import { useCurrentProject } from '../../hooks/useCurrentProject';
import { ProjectEditModal } from './ProjectEditModal';

interface ProjectInfoProps {
  projectMetadata?: ProjectMetadata;
  isLoading: boolean;
}

export const ProjectInfo: React.FC<ProjectInfoProps> = ({
  projectMetadata,
  isLoading,
}) => {
  const { project } = useCurrentProject();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className='py-3 px-4'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base'>Project Information</CardTitle>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsEditModalOpen(true)}
              disabled={!project}
              className='h-7 text-xs'>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className='px-4 pb-4 pt-0'>
          {isLoading ? (
            <LoadingSpinner size='sm' />
          ) : (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-3'>
                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Description
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {projectMetadata?.description ||
                        'No description provided'}
                    </p>
                  </div>

                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Source Language
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {projectMetadata?.sourceLanguage?.name || 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Target Language
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {projectMetadata?.targetLanguage?.name || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Region
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {projectMetadata?.region?.name || 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Location
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {projectMetadata?.location
                        ? `${projectMetadata.location.lat.toFixed(6)}, ${projectMetadata.location.lng.toFixed(6)}`
                        : 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Project Status
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100 capitalize'>
                      {projectMetadata?.projectStatus || 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Publish Status
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100 capitalize'>
                      {projectMetadata?.publishStatus || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              <div className='mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Team Members
                    </h3>
                    {projectMetadata?.users &&
                    projectMetadata.users.length > 0 ? (
                      <div className='space-y-1.5'>
                        {projectMetadata.users.map((userRole, index) => (
                          <div
                            key={index}
                            className='flex items-center justify-between text-sm'>
                            <span className='text-neutral-900 dark:text-neutral-100'>
                              {userRole.user.first_name}{' '}
                              {userRole.user.last_name}
                            </span>
                            <span className='text-xs text-neutral-600 dark:text-neutral-400'>
                              {userRole.roles.join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-sm text-neutral-600 dark:text-neutral-400'>
                        No team members found
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className='text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5'>
                      Created
                    </h3>
                    <p className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {projectMetadata?.createdAt
                        ? new Date(
                            projectMetadata.createdAt
                          ).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={project}
        projectMetadata={projectMetadata}
      />
    </>
  );
};
