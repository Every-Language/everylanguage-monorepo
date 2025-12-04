import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';
import { Trash2, Edit, Search } from 'lucide-react';

interface BaseAssignment {
  id: string;
  base_id: string;
  base_name: string;
  region_name: string | null;
}

interface EntityBaseAssignmentsProps {
  assignments: BaseAssignment[];
  onUpdate?: () => void;
  onAssign: (baseId: string) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
  onBaseClick?: (baseId: string) => void;
}

export const EntityBaseAssignments: React.FC<EntityBaseAssignmentsProps> = ({
  assignments,
  onUpdate,
  onAssign,
  onRemove,
  onBaseClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [baseSearch, setBaseSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedBaseId, setSelectedBaseId] = useState('');
  const queryClient = useQueryClient();

  const { data: searchedBases = [] } = useQuery({
    queryKey: ['search-bases', baseSearch],
    queryFn: () => usersApi.searchBases(baseSearch, 10),
    enabled: isEditing && baseSearch.length >= 2,
  });

  const assignMutation = useMutation({
    mutationFn: (baseId: string) => onAssign(baseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      setBaseSearch('');
      setSelectedBaseId('');
      onUpdate?.();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => onRemove(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      onUpdate?.();
    },
  });

  const handleBaseSelect = (baseId: string) => {
    setSelectedBaseId(baseId);
    assignMutation.mutate(baseId);
  };

  const handleRemove = (assignmentId: string) => {
    if (confirm('Are you sure you want to unassign this base?')) {
      removeMutation.mutate(assignmentId);
    }
  };

  const assignedBaseIds = assignments.map(a => a.base_id);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
          Bases
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
          <div className='relative'>
            <div className='flex items-center gap-2'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 z-10' />
              <input
                type='text'
                placeholder='Search bases...'
                value={baseSearch}
                onChange={e => setBaseSearch(e.target.value)}
                className='pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm w-64'
              />
            </div>
            {baseSearch && searchedBases.length > 0 && (
              <div className='absolute z-20 mt-1 max-h-60 w-64 overflow-auto border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 shadow-lg'>
                {searchedBases
                  .filter(base => !assignedBaseIds.includes(base.id))
                  .map(base => (
                    <button
                      key={base.id}
                      onClick={() => handleBaseSelect(base.id)}
                      className='w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm'>
                      {base.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className='text-sm text-neutral-500 dark:text-neutral-400'>
          No bases assigned yet.
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
                  Region Name
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
                    {onBaseClick ? (
                      <button
                        type='button'
                        onClick={() => onBaseClick(assignment.base_id)}
                        className='text-primary-600 dark:text-primary-400 hover:underline font-medium text-left'>
                        {assignment.base_name}
                      </button>
                    ) : (
                      <span className='text-neutral-900 dark:text-neutral-100'>
                        {assignment.base_name}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                    {assignment.region_name || '—'}
                  </td>
                  {isEditing && (
                    <td className='px-4 py-2 text-right'>
                      <button
                        type='button'
                        onClick={() => handleRemove(assignment.id)}
                        className='p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors'
                        title='Unassign base'>
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
              setBaseSearch('');
              setSelectedBaseId('');
            }}
            className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
