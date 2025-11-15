import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/projectsApi';
import { X } from 'lucide-react';

interface ViewProjectModalProps {
  projectId: string;
  onClose: () => void;
}

export function ViewProjectModal({
  projectId,
  onClose,
}: ViewProjectModalProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.fetchProjectById(projectId),
  });

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${
        isEntering ? 'opacity-100' : 'opacity-0'
      } ${isExiting ? 'opacity-0' : ''}`}
    >
      <div className='flex min-h-screen items-center justify-center p-4'>
        <div
          className='fixed inset-0 bg-black/50 transition-opacity'
          onClick={handleClose}
        />
        <div
          className={`relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-transform duration-300 ${
            isEntering ? 'scale-100' : 'scale-95'
          } ${isExiting ? 'scale-95' : ''}`}
        >
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800'>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              Project Details
            </h2>
            <button
              onClick={handleClose}
              className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
            >
              <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-y-auto p-6'>
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500'></div>
              </div>
            ) : project ? (
              <div className='space-y-6'>
                {/* Basic Info */}
                <div>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                    Basic Information
                  </h3>
                  <div className='space-y-3'>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Name
                      </label>
                      <p className='text-sm text-neutral-900 dark:text-neutral-100'>
                        {project.name}
                      </p>
                    </div>
                    {project.description && (
                      <div>
                        <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                          Description
                        </label>
                        <p className='text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap'>
                          {project.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                    Languages
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Target Language
                      </label>
                      {project.target_language ? (
                        <div>
                          <p className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                            {project.target_language.name}
                          </p>
                          <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                            {project.target_language.level}
                          </p>
                        </div>
                      ) : (
                        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                          Not specified
                        </p>
                      )}
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Source Language
                      </label>
                      {project.source_language ? (
                        <div>
                          <p className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                            {project.source_language.name}
                          </p>
                          <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                            {project.source_language.level}
                          </p>
                        </div>
                      ) : (
                        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                          Not specified
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Region */}
                {project.region && (
                  <div>
                    <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                      Region
                    </h3>
                    <div>
                      <p className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {project.region.name}
                      </p>
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        {project.region.level}
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                    Metadata
                  </h3>
                  <div className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-neutral-600 dark:text-neutral-400'>
                        Created At:
                      </span>
                      <span className='text-neutral-900 dark:text-neutral-100'>
                        {project.created_at
                          ? new Date(project.created_at).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                    {project.updated_at && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-neutral-600 dark:text-neutral-400'>
                          Updated At:
                        </span>
                        <span className='text-neutral-900 dark:text-neutral-100'>
                          {project.updated_at
                            ? new Date(project.updated_at).toLocaleString()
                            : '—'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className='text-center py-12'>
                <p className='text-neutral-500 dark:text-neutral-400'>
                  Project not found
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='flex justify-end p-6 border-t border-neutral-200 dark:border-neutral-800'>
            <button
              onClick={handleClose}
              className='px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors'
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
