import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectSelector } from './ProjectSelector';
import { Trash2, Plus, Edit } from 'lucide-react';

interface ProjectAssignment {
  id: string;
  project_id: string;
  project_name: string;
  language_name: string | null;
  project_status: string | null;
}

interface EntityProjectAssignmentsProps {
  assignments: ProjectAssignment[];
  onUpdate?: () => void;
  onAssign: (projectId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
  onProjectClick?: (projectId: string) => void;
}

export const EntityProjectAssignments: React.FC<
  EntityProjectAssignmentsProps
> = ({ assignments, onUpdate, onAssign, onRemove, onProjectClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: (projectId: string) => onAssign(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowProjectSelector(false);
      onUpdate?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => onRemove(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onUpdate?.();
    },
  });

  const handleProjectSelected = (projectId: string) => {
    assignMutation.mutate(projectId);
  };

  const handleRemove = (assignmentId: string) => {
    if (confirm('Are you sure you want to unassign this project?')) {
      removeMutation.mutate(assignmentId);
    }
  };

  const assignedProjectIds = assignments.map(a => a.project_id);

  const getStatusBadgeColor = (status: string | null): string => {
    if (!status)
      return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'precreated':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          Projects
        </h3>
        {!isEditing && (
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
            <Edit className='h-4 w-4' />
            Edit
          </button>
        )}
        {isEditing && (
          <button
            type='button'
            onClick={() => setShowProjectSelector(true)}
            className='px-3 py-1.5 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors flex items-center gap-2'>
            <Plus className='h-4 w-4' />
            Assign Project
          </button>
        )}
      </div>

      {/* Project Selector Modal */}
      <ProjectSelector
        isOpen={showProjectSelector}
        onClose={() => setShowProjectSelector(false)}
        onSelect={handleProjectSelected}
        excludeProjectIds={assignedProjectIds}
      />

      {assignments.length === 0 ? (
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          No projects assigned yet.
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
            <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
              <tr>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  Name
                </th>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  Language
                </th>
                <th className='px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                  Project Status
                </th>
                {isEditing && (
                  <th className='px-4 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400'>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td className='px-4 py-2 text-sm'>
                    {onProjectClick ? (
                      <button
                        type='button'
                        onClick={() => onProjectClick(assignment.project_id)}
                        className='text-primary-600 dark:text-primary-400 hover:underline font-medium text-left'>
                        {assignment.project_name}
                      </button>
                    ) : (
                      <span className='text-neutral-900 dark:text-neutral-100'>
                        {assignment.project_name}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                    {assignment.language_name || '—'}
                  </td>
                  <td className='px-4 py-2 text-sm'>
                    {assignment.project_status ? (
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                          assignment.project_status
                        )}`}>
                        {assignment.project_status}
                      </span>
                    ) : (
                      <span className='text-neutral-500 dark:text-neutral-400'>
                        —
                      </span>
                    )}
                  </td>
                  {isEditing && (
                    <td className='px-4 py-2 text-right'>
                      <button
                        type='button'
                        onClick={() => handleRemove(assignment.id)}
                        className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                        title='Unassign project'>
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isEditing && (
        <div className='flex gap-2 pt-2'>
          <button
            type='button'
            onClick={() => {
              setIsEditing(false);
            }}
            className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
