import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { basesApi } from '../api/basesApi';
import { EntityUserAssignments } from './EntityUserAssignments';
import { EntityProjectAssignments } from './EntityProjectAssignments';
import { LocationPicker } from '@/shared/components/LocationPicker/LocationPicker';
import type {
  BaseWithAssignments,
  CreateBaseData,
  UpdateBaseData,
} from '../types';
import { X, Edit, Save, Search } from 'lucide-react';
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
  const [editingInfo, setEditingInfo] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

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
    is_public:
      (base as BaseWithAssignments & { is_public?: boolean })?.is_public ??
      false,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsEntering(false);
  }, []);

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

  useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.fetchRegions({ pageSize: 1000 }),
  });

  // Search regions for editing
  const { data: searchedRegions } = useQuery({
    queryKey: ['search-regions', regionSearch],
    queryFn: () => regionsApi.searchRegions(regionSearch),
    enabled: editingInfo && regionSearch.length >= 2,
  });

  // Sync form data when base changes
  useEffect(() => {
    if (base && !isCreating) {
      setFormData({
        name: base.name,
        region_id: base.region_id || null,
        location: base.location ? extractLocation(base.location) : null,
        is_public:
          (base as BaseWithAssignments & { is_public?: boolean })?.is_public ??
          false,
      });
    } else if (isCreating) {
      setFormData({
        name: '',
        region_id: null,
        location: null,
        is_public: false,
      });
    }
  }, [base, isCreating, baseData]);

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
      setEditingInfo(false);
      setRegionSearch('');
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

  // Fetch base projects
  const { data: baseProjects, refetch: refetchBaseProjects } = useQuery({
    queryKey: ['base-projects', base?.id],
    queryFn: () => (base?.id ? basesApi.fetchBaseProjects(base.id) : []),
    enabled: !!base?.id && !isCreating,
  });

  const assignProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (base?.id) {
        await basesApi.assignProjectToBase(base.id, projectId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-projects', base?.id] });
      refetchBaseProjects();
      onUpdate?.();
    },
  });

  const removeProjectMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      basesApi.unassignProjectFromBase(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-projects', base?.id] });
      refetchBaseProjects();
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

  const handleCancel = () => {
    const currentBase = baseData || base;
    if (currentBase && !isCreating) {
      setFormData({
        name: currentBase.name,
        region_id: currentBase.region_id || null,
        location: currentBase.location
          ? extractLocation(currentBase.location)
          : null,
        is_public:
          (currentBase as BaseWithAssignments & { is_public?: boolean })
            ?.is_public ?? false,
      });
    }
    setEditingInfo(false);
    setRegionSearch('');
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
        }`}>
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {isCreating ? 'Create Base' : currentBase?.name || 'Base'}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              {isCreating ? 'New base' : 'Base Details'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          {/* Base Information */}
          <section>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                Base Information
              </h3>
              {!isCreating && !editingInfo && (
                <button
                  onClick={() => setEditingInfo(true)}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Edit className='h-4 w-4' />
                  Edit
                </button>
              )}
            </div>
            <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Name
                </label>
                {isCreating || editingInfo ? (
                  <input
                    type='text'
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    required
                  />
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {currentBase?.name || '—'}
                  </p>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Region
                </label>
                {isCreating || editingInfo ? (
                  <div className='space-y-2'>
                    <div className='relative'>
                      <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                      <input
                        type='text'
                        placeholder='Search region...'
                        value={regionSearch}
                        onChange={e => setRegionSearch(e.target.value)}
                        className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>
                    {regionSearch && searchedRegions && (
                      <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                        <button
                          onClick={() => {
                            setFormData({ ...formData, region_id: null });
                            setRegionSearch('');
                          }}
                          className='w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm text-neutral-500 dark:text-neutral-400 italic border-b border-neutral-200 dark:border-neutral-800'>
                          No Region
                        </button>
                        {searchedRegions.map(region => (
                          <button
                            key={region.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                region_id: region.id,
                              });
                              setRegionSearch('');
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                              formData.region_id === region.id
                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                : ''
                            }`}>
                            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                              {region.name}
                              <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                ({region.level})
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {currentBase?.region && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Current: {currentBase.region.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    {currentBase?.region ? (
                      <p className='text-neutral-900 dark:text-neutral-100'>
                        {currentBase.region.name}
                      </p>
                    ) : (
                      <p className='text-neutral-500 dark:text-neutral-400'>
                        Not specified
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  Is Public
                </label>
                {isCreating || editingInfo ? (
                  <div className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      id='is_public'
                      checked={formData.is_public || false}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          is_public: e.target.checked,
                        })
                      }
                      className='w-4 h-4 rounded border-neutral-300 dark:border-neutral-700'
                    />
                    <label
                      htmlFor='is_public'
                      className='text-sm text-neutral-700 dark:text-neutral-300'>
                      Public
                    </label>
                  </div>
                ) : (
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {(
                      currentBase as BaseWithAssignments & {
                        is_public?: boolean;
                      }
                    )?.is_public
                      ? 'Yes'
                      : 'No'}
                  </p>
                )}
              </div>
              {currentBase && (
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Created
                  </label>
                  <p className='text-neutral-900 dark:text-neutral-100'>
                    {formatDate(currentBase.created_at)}
                  </p>
                </div>
              )}
              {(isCreating || editingInfo) && (
                <div className='flex gap-2 pt-2'>
                  <button
                    onClick={isCreating ? handleClose : handleCancel}
                    className='px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'>
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      !formData.name
                    }
                    className='px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1'>
                    <Save className='h-4 w-4' />
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : isCreating
                        ? 'Create'
                        : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Location */}
          <section>
            <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
              Location
            </h3>
            <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
              {isCreating || editingInfo ? (
                <LocationPicker
                  location={formData.location ?? null}
                  onLocationChange={location =>
                    setFormData({ ...formData, location })
                  }
                  height='400px'
                />
              ) : (
                <div>
                  {currentBase?.location ? (
                    <div className='space-y-2'>
                      <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                        <span className='font-medium'>Latitude:</span>{' '}
                        {extractLocation(currentBase.location)?.lat.toFixed(6)}
                      </div>
                      <div className='text-sm text-neutral-900 dark:text-neutral-100'>
                        <span className='font-medium'>Longitude:</span>{' '}
                        {extractLocation(currentBase.location)?.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : (
                    <p className='text-sm text-neutral-500 dark:text-neutral-400'>
                      No location set
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* User Assignments */}
          {currentBase && (
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                User Assignments
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
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
            </section>
          )}

          {/* Projects */}
          {currentBase && (
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Projects
              </h3>
              <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <EntityProjectAssignments
                  assignments={baseProjects || []}
                  onUpdate={onUpdate}
                  onAssign={async projectId => {
                    await assignProjectMutation.mutateAsync(projectId);
                  }}
                  onRemove={async assignmentId => {
                    await removeProjectMutation.mutateAsync(assignmentId);
                  }}
                  onProjectClick={() => {
                    // Could open project modal here if needed
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
