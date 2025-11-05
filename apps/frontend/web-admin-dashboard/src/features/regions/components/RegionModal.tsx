import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { regionsApi } from '../api/regionsApi';
import { languagesApi } from '../../languages/api/languagesApi';
import type { RegionWithLanguages } from '@/types';
import { X, Save } from 'lucide-react';

interface RegionModalProps {
  region: RegionWithLanguages;
  onClose: () => void;
  onSave: () => void;
}

export function RegionModal({ region, onClose, onSave }: RegionModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(region.name);
  const [level, setLevel] = useState(region.level);
  const [parentId, setParentId] = useState<string | null>(region.parent_id);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);

  // Fetch full region details with language entities
  const { data: fullRegion } = useQuery({
    queryKey: ['region', region.id],
    queryFn: () => regionsApi.fetchRegionById(region.id),
  });

  // Fetch all regions for parent selection
  const { data: allRegions } = useQuery({
    queryKey: ['regions-list'],
    queryFn: regionsApi.fetchRegionsList,
  });

  // Fetch all language entities for selection
  const { data: allLanguages } = useQuery({
    queryKey: ['language-entities-list'],
    queryFn: languagesApi.fetchLanguageEntitiesList,
  });

  // Initialize selected language entities when full region is loaded
  useEffect(() => {
    if (fullRegion?.language_entities) {
      setSelectedLanguageIds(fullRegion.language_entities.map(l => l.id));
    }
  }, [fullRegion]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update region
      await regionsApi.updateRegion(region.id, {
        name,
        level,
        parent_id: parentId,
      });

      // Update language entities
      await regionsApi.updateRegionLanguageEntities(
        region.id,
        selectedLanguageIds
      );
    },
    onSuccess: () => {
      onSave();
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleToggleLanguage = (languageId: string) => {
    setSelectedLanguageIds(prev =>
      prev.includes(languageId)
        ? prev.filter(id => id !== languageId)
        : [...prev, languageId]
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
              {region.name}
            </h2>
            <p className='text-sm text-neutral-500'>Region Details</p>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-lg hover:bg-neutral-100 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
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
                    className='text-sm text-secondary-600 hover:text-secondary-700'
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
                      className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500'
                    />
                  ) : (
                    <p className='text-neutral-900'>{region.name}</p>
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
                      className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500'
                    >
                      <option value='continent'>Continent</option>
                      <option value='world_region'>World Region</option>
                      <option value='country'>Country</option>
                      <option value='state'>State</option>
                      <option value='province'>Province</option>
                      <option value='district'>District</option>
                      <option value='town'>Town</option>
                      <option value='village'>Village</option>
                    </select>
                  ) : (
                    <p className='text-neutral-900'>{region.level}</p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-1'>
                    Parent Region
                  </label>
                  {isEditing ? (
                    <select
                      value={parentId || ''}
                      onChange={e => setParentId(e.target.value || null)}
                      className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500'
                    >
                      <option value=''>None</option>
                      {allRegions
                        ?.filter(r => r.id !== region.id)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.level})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <p className='text-neutral-900'>
                      {parentId
                        ? allRegions?.find(r => r.id === parentId)?.name ||
                          parentId
                        : 'None'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Language Entities */}
            <div>
              <h3 className='text-lg font-medium text-neutral-900 mb-4'>
                Linked Language Entities
              </h3>
              {isEditing ? (
                <div className='space-y-2 max-h-60 overflow-y-auto'>
                  {allLanguages?.map(language => (
                    <label
                      key={language.id}
                      className='flex items-center p-2 hover:bg-neutral-50 rounded cursor-pointer'
                    >
                      <input
                        type='checkbox'
                        checked={selectedLanguageIds.includes(language.id)}
                        onChange={() => handleToggleLanguage(language.id)}
                        className='mr-2'
                      />
                      <span className='text-sm text-neutral-900'>
                        {language.name} ({language.level})
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className='space-y-2'>
                  {fullRegion?.language_entities &&
                  fullRegion.language_entities.length > 0 ? (
                    fullRegion.language_entities.map(language => (
                      <div
                        key={language.id}
                        className='px-3 py-2 bg-neutral-50 rounded-lg text-sm text-neutral-900'
                      >
                        {language.name} ({language.level})
                      </div>
                    ))
                  ) : (
                    <p className='text-neutral-500'>
                      No language entities linked
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {isEditing && (
          <div className='px-6 py-4 border-t border-neutral-200 flex justify-end space-x-3'>
            <button
              onClick={() => {
                setIsEditing(false);
                setName(region.name);
                setLevel(region.level);
                setParentId(region.parent_id);
                if (fullRegion?.language_entities) {
                  setSelectedLanguageIds(
                    fullRegion.language_entities.map(l => l.id)
                  );
                }
              }}
              className='px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className='px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50 flex items-center'
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
