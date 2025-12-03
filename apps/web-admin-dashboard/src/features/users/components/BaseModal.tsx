import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { basesApi } from '../api/basesApi';
import { EntityUserAssignments } from './EntityUserAssignments';
import { TeamBaseAssignments } from './TeamBaseAssignments';
import { Input, Select, SelectItem } from '@everylanguage/shared-ui';
import type {
  BaseWithAssignments,
  CreateBaseData,
  UpdateBaseData,
} from '../types';
import { X } from 'lucide-react';
import { regionsApi } from '@/features/regions/api/regionsApi';

interface BaseModalProps {
  base: BaseWithAssignments | null;
  isCreating: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  base,
  isCreating,
  onClose,
  onUpdate,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);

  // Helper to extract location from PostGIS point
  const extractLocation = (
    location: unknown
  ): { lat: number; lng: number } | null => {
    if (!location || typeof location !== 'object') return null;
    if (
      'type' in location &&
      location.type === 'Point' &&
      'coordinates' in location
    ) {
      const coords = (location as { coordinates: unknown }).coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        return { lng: coords[0] as number, lat: coords[1] as number };
      }
    }
    return null;
  };

  const [formData, setFormData] = useState<CreateBaseData | UpdateBaseData>({
    name: base?.name || '',
    region_id: base?.region_id || null,
    location: base?.location ? extractLocation(base.location) : null,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsEntering(false);
  }, []);

  useEffect(() => {
    if (base) {
      setFormData({
        name: base.name,
        region_id: base.region_id || null,
        location: base.location ? extractLocation(base.location) : null,
      });
    } else {
      setFormData({
        name: '',
        region_id: null,
        location: null,
      });
    }
  }, [base]);

  const { data: baseData, refetch: refetchBase } = useQuery({
    queryKey: ['base', base?.id],
    queryFn: () => (base?.id ? basesApi.fetchBaseById(base.id) : null),
    enabled: !!base?.id && !isCreating,
    initialData: base || undefined,
  });

  useEffect(() => {
    if (base?.id && !isCreating) {
      refetchBase();
    }
  }, [base?.id, isCreating, refetchBase]);

  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.fetchRegions({ pageSize: 1000 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBaseData) => basesApi.createBase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      handleClose();
      onUpdate?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateBaseData) => {
      if (base?.id) {
        await basesApi.updateBase(base.id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base', base?.id] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
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
      if (base?.id) {
        await basesApi.assignUserToBase(base.id, userId, roleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base', base?.id] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      refetchBase();
      onUpdate?.();
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      basesApi.removeUserFromBase(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base', base?.id] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      refetchBase();
      onUpdate?.();
    },
  });

  const assignTeamMutation = useMutation({
    mutationFn: async ({
      teamId,
      roleId,
    }: {
      teamId: string;
      roleId: string;
    }) => {
      if (base?.id) {
        await basesApi.assignTeamToBase(base.id, teamId, roleId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base', base?.id] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      refetchBase();
      onUpdate?.();
    },
  });

  const removeTeamMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      basesApi.removeTeamFromBase(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base', base?.id] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      refetchBase();
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
      createMutation.mutate(formData as CreateBaseData);
    } else if (base?.id) {
      updateMutation.mutate(formData as UpdateBaseData);
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

  const currentBase = baseData || base;
  const regions = regionsData?.data || [];

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
              {isCreating ? 'Create Base' : 'Base Details'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {currentBase?.name || 'New base'}
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
            {/* Base Details */}
            <div>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Base Information
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
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2'>
                    Region
                  </label>
                  <Select
                    value={formData.region_id || ''}
                    onValueChange={value =>
                      setFormData({ ...formData, region_id: value || null })
                    }
                    placeholder='Select a region...'
                  >
                    <SelectItem value=''>None</SelectItem>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <Input
                    label='Latitude'
                    type='number'
                    step='any'
                    value={formData.location?.lat.toString() || ''}
                    onChange={e => {
                      const lat = parseFloat(e.target.value);
                      setFormData({
                        ...formData,
                        location:
                          lat && !isNaN(lat)
                            ? { lat, lng: formData.location?.lng || 0 }
                            : null,
                      });
                    }}
                    placeholder='e.g., 40.7128'
                  />
                  <Input
                    label='Longitude'
                    type='number'
                    step='any'
                    value={formData.location?.lng.toString() || ''}
                    onChange={e => {
                      const lng = parseFloat(e.target.value);
                      setFormData({
                        ...formData,
                        location:
                          lng && !isNaN(lng)
                            ? { lat: formData.location?.lat || 0, lng }
                            : null,
                      });
                    }}
                    placeholder='e.g., -74.0060'
                  />
                </div>
                {currentBase && (
                  <div className='text-sm text-neutral-500 dark:text-neutral-400'>
                    <p>
                      <span className='font-medium'>Created:</span>{' '}
                      {formatDate(currentBase.created_at)}
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
            {currentBase && (
              <div>
                <EntityUserAssignments
                  entityId={currentBase.id}
                  resourceType='base'
                  assignments={currentBase.users || []}
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

            {/* Team Assignments */}
            {currentBase && (
              <div>
                <TeamBaseAssignments
                  assignments={currentBase.teams || []}
                  mode='base'
                  onUpdate={onUpdate}
                  onAssign={async (teamId, _baseId, roleId) => {
                    await assignTeamMutation.mutateAsync({ teamId, roleId });
                  }}
                  onRemove={async assignmentId => {
                    await removeTeamMutation.mutateAsync(assignmentId);
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
