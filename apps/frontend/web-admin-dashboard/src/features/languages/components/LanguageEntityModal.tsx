import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { languagesApi } from '../api/languagesApi';
import { useAuth } from '@/features/auth';
import type { LanguageEntityWithRegions, LanguageEntity } from '@/types';
import { X, Save, History } from 'lucide-react';
import { supabase } from '@/shared/services/supabase';

interface LanguageEntityModalProps {
  entity: LanguageEntityWithRegions;
  onClose: () => void;
  onSave: () => void;
}

export function LanguageEntityModal({
  entity,
  onClose,
  onSave,
}: LanguageEntityModalProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(entity.name);
  const [level, setLevel] = useState(entity.level);
  const [parentId, setParentId] = useState<string | null>(entity.parent_id);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  // Fetch full entity details with regions
  const { data: fullEntity } = useQuery({
    queryKey: ['language-entity', entity.id],
    queryFn: () => languagesApi.fetchLanguageEntityById(entity.id),
  });

  // Fetch all language entities for parent selection
  const { data: allEntities } = useQuery({
    queryKey: ['language-entities-list'],
    queryFn: languagesApi.fetchLanguageEntitiesList,
  });

  // Fetch all regions for region selection
  const { data: allRegions } = useQuery({
    queryKey: ['regions-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, level')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch version history
  const { data: versions } = useQuery({
    queryKey: ['language-entity-versions', entity.id],
    queryFn: () => languagesApi.fetchLanguageEntityVersions(entity.id),
    enabled: showVersions,
  });

  // Initialize selected regions when full entity is loaded
  useEffect(() => {
    if (fullEntity?.regions) {
      setSelectedRegionIds(fullEntity.regions.map(r => r.id));
    }
  }, [fullEntity]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Update language entity
      await languagesApi.updateLanguageEntity(
        entity.id,
        { name, level, parent_id: parentId },
        user.id
      );

      // Update regions
      await languagesApi.updateLanguageEntityRegions(
        entity.id,
        selectedRegionIds
      );
    },
    onSuccess: () => {
      onSave();
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleToggleRegion = (regionId: string) => {
    setSelectedRegionIds(prev =>
      prev.includes(regionId)
        ? prev.filter(id => id !== regionId)
        : [...prev, regionId]
    );
  };

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      <div
        className='absolute inset-0 bg-black bg-opacity-50'
        onClick={onClose}
      />

      <div className='absolute inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col'>
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900'>
              {entity.name}
            </h2>
            <p className='text-sm text-neutral-500'>Language Entity Details</p>
          </div>
          <div className='flex items-center space-x-2'>
            <button
              onClick={() => setShowVersions(!showVersions)}
              className='p-2 rounded-lg hover:bg-neutral-100 transition-colors'
              title='View history'
            >
              <History className='h-5 w-5 text-neutral-600' />
            </button>
            <button
              onClick={onClose}
              className='p-2 rounded-lg hover:bg-neutral-100 transition-colors'
            >
              <X className='h-5 w-5 text-neutral-600' />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
          {showVersions ? (
            <div>
              <h3 className='text-lg font-medium text-neutral-900 mb-4'>
                Version History
              </h3>
              {versions && versions.length > 0 ? (
                <div className='space-y-3'>
                  {versions.map(version => (
                    <div
                      key={version.id}
                      className='p-4 border border-neutral-200 rounded-lg'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <span className='text-sm font-medium text-neutral-900'>
                          {version.change_type}
                        </span>
                        <span className='text-xs text-neutral-500'>
                          {new Date(version.changed_at).toLocaleString()}
                        </span>
                      </div>
                      <div className='text-sm text-neutral-600'>
                        <p>Name: {version.name}</p>
                        <p>Level: {version.level}</p>
                      </div>
                      {version.changed_by_user && (
                        <p className='text-xs text-neutral-500 mt-2'>
                          By: {version.changed_by_user.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-neutral-500'>No version history available</p>
              )}
            </div>
          ) : (
            <div className='space-y-6'>
              {/* Basic Info */}
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-medium text-neutral-900'>
                    Basic Information
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className='text-sm text-primary-600 hover:text-primary-700'
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-neutral-700 mb-1'>
                      Name
                    </label>
                    {isEditing ? (
                      <input
                        type='text'
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    ) : (
                      <p className='text-neutral-900'>{entity.name}</p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 mb-1'>
                      Level
                    </label>
                    {isEditing ? (
                      <select
                        value={level}
                        onChange={e => setLevel(e.target.value as typeof level)}
                        className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
                      >
                        <option value='family'>Family</option>
                        <option value='language'>Language</option>
                        <option value='dialect'>Dialect</option>
                        <option value='mother_tongue'>Mother Tongue</option>
                      </select>
                    ) : (
                      <p className='text-neutral-900'>{entity.level}</p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 mb-1'>
                      Parent Language
                    </label>
                    {isEditing ? (
                      <select
                        value={parentId || ''}
                        onChange={e => setParentId(e.target.value || null)}
                        className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
                      >
                        <option value=''>None</option>
                        {allEntities
                          ?.filter(e => e.id !== entity.id)
                          .map(e => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.level})
                            </option>
                          ))}
                      </select>
                    ) : (
                      <p className='text-neutral-900'>
                        {parentId
                          ? allEntities?.find(e => e.id === parentId)?.name ||
                            parentId
                          : 'None'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Regions */}
              <div>
                <h3 className='text-lg font-medium text-neutral-900 mb-4'>
                  Linked Regions
                </h3>
                {isEditing ? (
                  <div className='space-y-2 max-h-60 overflow-y-auto'>
                    {allRegions?.map(region => (
                      <label
                        key={region.id}
                        className='flex items-center p-2 hover:bg-neutral-50 rounded cursor-pointer'
                      >
                        <input
                          type='checkbox'
                          checked={selectedRegionIds.includes(region.id)}
                          onChange={() => handleToggleRegion(region.id)}
                          className='mr-2'
                        />
                        <span className='text-sm text-neutral-900'>
                          {region.name} ({region.level})
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {fullEntity?.regions && fullEntity.regions.length > 0 ? (
                      fullEntity.regions.map(region => (
                        <div
                          key={region.id}
                          className='px-3 py-2 bg-neutral-50 rounded-lg text-sm text-neutral-900'
                        >
                          {region.name} ({region.level})
                        </div>
                      ))
                    ) : (
                      <p className='text-neutral-500'>No regions linked</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && !showVersions && (
          <div className='px-6 py-4 border-t border-neutral-200 flex justify-end space-x-3'>
            <button
              onClick={() => {
                setIsEditing(false);
                setName(entity.name);
                setLevel(entity.level);
                setParentId(entity.parent_id);
                if (fullEntity?.regions) {
                  setSelectedRegionIds(fullEntity.regions.map(r => r.id));
                }
              }}
              className='px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center'
            >
              <Save className='h-4 w-4 mr-2' />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
