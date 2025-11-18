import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api/teamsApi';
import { EntityUserAssignments } from './EntityUserAssignments';
import { TeamBaseAssignments } from './TeamBaseAssignments';
import { Input } from '@everylanguage/shared-ui';
import type {
  TeamWithAssignments,
  CreateTeamData,
  UpdateTeamData,
} from '../types';
import { X } from 'lucide-react';

interface TeamModalProps {
  team: TeamWithAssignments | null;
  isCreating: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  team,
  isCreating,
  onClose,
  onUpdate,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [formData, setFormData] = useState<CreateTeamData | UpdateTeamData>({
    name: team?.name || '',
    type: team?.type || null,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsEntering(false);
  }, []);

  const { data: teamData, refetch: refetchTeam } = useQuery({
    queryKey: ['team', team?.id],
    queryFn: () => (team?.id ? teamsApi.fetchTeamById(team.id) : null),
    enabled: !!team?.id && !isCreating,
    initialData: team || undefined,
  });

  useEffect(() => {
    if (team?.id && !isCreating) {
      refetchTeam();
    }
  }, [team?.id, isCreating, refetchTeam]);

  const createMutation = useMutation({
    mutationFn: (data: CreateTeamData) => teamsApi.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      handleClose();
      onUpdate?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateTeamData) => {
      if (team?.id) {
        await teamsApi.updateTeam(team.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      onUpdate?.();
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      if (team?.id) {
        await teamsApi.assignUserToTeam(team.id, userId, roleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      refetchTeam();
      onUpdate?.();
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      teamsApi.removeUserFromTeam(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      refetchTeam();
      onUpdate?.();
    },
  });

  const assignBaseMutation = useMutation({
    mutationFn: async ({
      baseId,
      roleId,
    }: {
      baseId: string;
      roleId: string;
    }) => {
      if (team?.id) {
        await teamsApi.assignTeamToBase(team.id, baseId, roleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      refetchTeam();
      onUpdate?.();
    },
  });

  const removeBaseMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      teamsApi.removeTeamFromBase(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      refetchTeam();
      onUpdate?.();
    },
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSave = () => {
    if (isCreating) {
      createMutation.mutate(formData as CreateTeamData);
    } else if (team?.id) {
      updateMutation.mutate(formData as UpdateTeamData);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const currentTeam = teamData || team;

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-out ${
          isClosing ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleClose}
      />

      <div
        className={`absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isClosing
            ? 'translate-x-full'
            : isEntering
              ? 'translate-x-full'
              : 'translate-x-0'
        }`}
      >
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {isCreating ? 'Create Team' : 'Team Details'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {currentTeam?.name || 'New team'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6'>
          <div className='space-y-6'>
            {/* Team Details */}
            <div>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Team Information
              </h3>

              <div className='space-y-4'>
                <Input
                  label='Name'
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <Input
                  label='Type'
                  value={formData.type || ''}
                  onChange={e =>
                    setFormData({ ...formData, type: e.target.value || null })
                  }
                />
                {currentTeam && (
                  <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                    <p>
                      <span className='font-medium'>Created:</span>{' '}
                      {formatDate(currentTeam.created_at)}
                    </p>
                  </div>
                )}
              </div>

              <div className='mt-4 flex gap-2'>
                <button
                  type='button'
                  onClick={handleSave}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    !formData.name
                  }
                  className='px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors'
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : isCreating
                      ? 'Create'
                      : 'Save'}
                </button>
                <button
                  type='button'
                  onClick={handleClose}
                  className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* User Assignments */}
            {currentTeam && (
              <div>
                <EntityUserAssignments
                  entityId={currentTeam.id}
                  resourceType='team'
                  assignments={currentTeam.users || []}
                  onUpdate={onUpdate}
                  onAssign={async (userId, roleId) => {
                    await assignUserMutation.mutateAsync({ userId, roleId });
                  }}
                  onRemove={async assignmentId => {
                    await removeUserMutation.mutateAsync(assignmentId);
                  }}
                />
              </div>
            )}

            {/* Base Assignments */}
            {currentTeam && (
              <div>
                <TeamBaseAssignments
                  assignments={currentTeam.bases || []}
                  mode='team'
                  onUpdate={onUpdate}
                  onAssign={async (_teamId, baseId, roleId) => {
                    await assignBaseMutation.mutateAsync({ baseId, roleId });
                  }}
                  onRemove={async assignmentId => {
                    await removeBaseMutation.mutateAsync(assignmentId);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
