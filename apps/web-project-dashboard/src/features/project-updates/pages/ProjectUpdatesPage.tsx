import React, { useState } from 'react';
import { Button, Card, CardContent } from '@/shared/design-system';
import { useSelectedProject } from '@/features/dashboard';
import { useProjectUpdates } from '../hooks/useProjectUpdates';
import { UpdateCard } from '../components/UpdateCard';
import { CreateUpdateModal } from '../components/CreateUpdateModal';
import { PlusIcon } from '@heroicons/react/24/outline';

export const ProjectUpdatesPage: React.FC = () => {
  const { selectedProject } = useSelectedProject();
  const { data: updates, isLoading } = useProjectUpdates(
    selectedProject?.id || null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!selectedProject) {
    return (
      <div className='p-8'>
        <Card>
          <CardContent className='py-12 text-center'>
            <h3 className='text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2'>
              No Project Selected
            </h3>
            <p className='text-neutral-600 dark:text-neutral-400'>
              Please select a project from the sidebar to view updates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='p-8 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
            Project Updates
          </h1>
          <p className='text-neutral-600 dark:text-neutral-400 mt-1'>
            Share progress and updates for {selectedProject.name}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<PlusIcon className='h-5 w-5' />}
        >
          Post Update
        </Button>
      </div>

      {/* Updates List */}
      {isLoading ? (
        <Card>
          <CardContent className='py-12 text-center text-neutral-500'>
            Loading updates...
          </CardContent>
        </Card>
      ) : !updates || updates.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <h3 className='text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2'>
              No Updates Yet
            </h3>
            <p className='text-neutral-600 dark:text-neutral-400 mb-6'>
              Be the first to share an update about this project.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Post First Update
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-6'>
          {updates.map(update => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateUpdateModal
        projectId={selectedProject.id}
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
};
