import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { languagesApi } from '../api/languagesApi';
import { regionsApi } from '@/features/regions/api/regionsApi';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import { LocationPicker } from '@/shared/components/LocationPicker/LocationPicker';
import type { LanguageEntity, Region } from '@/types';
import type { Database } from '@everylanguage/shared-types';

type LanguageEntityLevel = Database['public']['Enums']['language_entity_level'];

interface CreateLanguageModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type SourceEntry = {
  source: string;
  version: string;
  is_external: boolean;
  external_id: string;
  external_id_type: string;
};

type AliasEntry = {
  alias_name: string;
};

type PropertyEntry = {
  key: string;
  value: string;
};

type RegionEntry = {
  region_id: string;
  region: Region | null;
  dominance_level: number;
  location_source: string;
  location: { lat: number; lng: number } | null;
};

export function CreateLanguageModal({
  open,
  onClose,
  onSuccess,
}: CreateLanguageModalProps) {
  const queryClient = useQueryClient();

  // Basic info
  const [name, setName] = useState('');
  const [level, setLevel] = useState<LanguageEntityLevel>('language');
  const [parentLanguageId, setParentLanguageId] = useState<string>('');
  const [parentLanguageSearch, setParentLanguageSearch] = useState('');
  const [selectedParentLanguage, setSelectedParentLanguage] =
    useState<LanguageEntity | null>(null);

  // Sources
  const [sources, setSources] = useState<SourceEntry[]>([
    {
      source: '',
      version: '',
      is_external: false,
      external_id: '',
      external_id_type: '',
    },
  ]);

  // Aliases
  const [aliases, setAliases] = useState<AliasEntry[]>([{ alias_name: '' }]);

  // Properties
  const [properties, setProperties] = useState<PropertyEntry[]>([
    { key: '', value: '' },
  ]);

  // Regions
  const [regions, setRegions] = useState<RegionEntry[]>([
    {
      region_id: '',
      region: null,
      dominance_level: 1.0,
      location_source: '',
      location: null,
    },
  ]);
  const [regionSearchQueries, setRegionSearchQueries] = useState<
    Record<number, string>
  >({});

  // Search parent language
  const { data: searchedParentLanguages } = useQuery({
    queryKey: ['search-languages', parentLanguageSearch],
    queryFn: () => languagesApi.searchLanguageEntities(parentLanguageSearch),
    enabled: parentLanguageSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!name.trim()) {
        throw new Error('Language name is required');
      }

      // Validate sources
      for (const source of sources) {
        if (!source.source.trim()) {
          throw new Error('All sources must have a source name');
        }
        if (source.is_external) {
          if (!source.external_id?.trim() || !source.external_id_type?.trim()) {
            throw new Error(
              'External sources must have both external ID and external ID type'
            );
          }
        }
      }

      // Validate regions
      for (const region of regions) {
        if (!region.region_id) {
          throw new Error('All regions must be selected');
        }
      }

      return await languagesApi.createLanguageEntity({
        name: name.trim(),
        level,
        parent_id: parentLanguageId || null,
        sources: sources
          .filter(s => s.source.trim())
          .map(s => ({
            source: s.source.trim(),
            version: s.version.trim() || null,
            is_external: s.is_external,
            external_id: s.is_external ? s.external_id.trim() || null : null,
            external_id_type: s.is_external
              ? s.external_id_type.trim() || null
              : null,
          })),
        aliases: aliases
          .filter(a => a.alias_name.trim())
          .map(a => ({ alias_name: a.alias_name.trim() })),
        properties: properties
          .filter(p => p.key.trim() && p.value.trim())
          .map(p => ({ key: p.key.trim(), value: p.value.trim() })),
        regions: regions
          .filter(r => r.region_id)
          .map(r => ({
            region_id: r.region_id,
            dominance_level: r.dominance_level,
            location: r.location,
            location_source: r.location_source.trim() || null,
          })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['language-entities'] });
      handleClose();
      onSuccess?.();
    },
  });

  const handleClose = () => {
    // Reset form
    setName('');
    setLevel('language');
    setParentLanguageId('');
    setParentLanguageSearch('');
    setSelectedParentLanguage(null);
    setSources([
      {
        source: '',
        version: '',
        is_external: false,
        external_id: '',
        external_id_type: '',
      },
    ]);
    setAliases([{ alias_name: '' }]);
    setProperties([{ key: '', value: '' }]);
    setRegions([
      {
        region_id: '',
        region: null,
        dominance_level: 1.0,
        location_source: '',
        location: null,
      },
    ]);
    setRegionSearchQueries({});
    createMutation.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  // Source handlers
  const addSource = () => {
    setSources([
      ...sources,
      {
        source: '',
        version: '',
        is_external: false,
        external_id: '',
        external_id_type: '',
      },
    ]);
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const updateSource = (index: number, updates: Partial<SourceEntry>) => {
    const updated = [...sources];
    updated[index] = { ...updated[index], ...updates };
    setSources(updated);
  };

  // Alias handlers
  const addAlias = () => {
    setAliases([...aliases, { alias_name: '' }]);
  };

  const removeAlias = (index: number) => {
    setAliases(aliases.filter((_, i) => i !== index));
  };

  const updateAlias = (index: number, alias_name: string) => {
    const updated = [...aliases];
    updated[index] = { alias_name };
    setAliases(updated);
  };

  // Property handlers
  const addProperty = () => {
    setProperties([...properties, { key: '', value: '' }]);
  };

  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const updateProperty = (index: number, updates: Partial<PropertyEntry>) => {
    const updated = [...properties];
    updated[index] = { ...updated[index], ...updates };
    setProperties(updated);
  };

  // Region handlers
  const addRegion = () => {
    setRegions([
      ...regions,
      {
        region_id: '',
        region: null,
        dominance_level: 1.0,
        location_source: '',
        location: null,
      },
    ]);
  };

  const removeRegion = (index: number) => {
    setRegions(regions.filter((_, i) => i !== index));
    const updatedQueries = { ...regionSearchQueries };
    delete updatedQueries[index];
    setRegionSearchQueries(updatedQueries);
  };

  const updateRegion = (index: number, updates: Partial<RegionEntry>) => {
    const updated = [...regions];
    updated[index] = { ...updated[index], ...updates };
    setRegions(updated);
  };

  const handleRegionSelect = (index: number, region: Region) => {
    updateRegion(index, { region_id: region.id, region });
    const updatedQueries = { ...regionSearchQueries };
    updatedQueries[index] = '';
    setRegionSearchQueries(updatedQueries);
  };

  const handleRegionSearchChange = (index: number, query: string) => {
    setRegionSearchQueries({ ...regionSearchQueries, [index]: query });
  };

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex min-h-screen items-center justify-center p-4'>
        {/* Backdrop */}
        <div
          className='fixed inset-0 bg-black/50 transition-opacity'
          onClick={handleClose}
        />

        {/* Modal */}
        <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col'>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800'>
            <div>
              <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
                Create Language Entity
              </h2>
              <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
                Add a new language entity with all related data
              </p>
            </div>
            <button
              onClick={handleClose}
              className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
              <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className='flex-1 overflow-y-auto p-6 space-y-6'>
            {/* Error message */}
            {createMutation.isError && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                <p className='text-sm text-red-800 dark:text-red-200'>
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create language entity. Please try again.'}
                </p>
              </div>
            )}

            {/* Basic Information */}
            <section>
              <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                Basic Information
              </h3>
              <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    placeholder='Enter language name'
                  />
                </div>

                <Select
                  label='Level'
                  value={level}
                  onValueChange={value =>
                    setLevel(value as LanguageEntityLevel)
                  }
                  required>
                  <SelectItem value='family'>Family</SelectItem>
                  <SelectItem value='language'>Language</SelectItem>
                  <SelectItem value='dialect'>Dialect</SelectItem>
                  <SelectItem value='mother_tongue'>Mother Tongue</SelectItem>
                </Select>

                <div>
                  <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                    Parent Language
                  </label>
                  <div className='space-y-2'>
                    <div className='relative'>
                      <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                      <input
                        type='text'
                        placeholder='Search for parent language...'
                        value={parentLanguageSearch}
                        onChange={e => setParentLanguageSearch(e.target.value)}
                        className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>
                    {parentLanguageSearch &&
                      searchedParentLanguages &&
                      searchedParentLanguages.length > 0 && (
                        <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                          {searchedParentLanguages.map(lang => (
                            <button
                              key={lang.id}
                              type='button'
                              onClick={() => {
                                setParentLanguageId(lang.id);
                                setSelectedParentLanguage(lang);
                                setParentLanguageSearch('');
                              }}
                              className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                                parentLanguageId === lang.id
                                  ? 'bg-primary-50 dark:bg-primary-900/20'
                                  : ''
                              }`}>
                              <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                                {lang.name}
                                <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                  ({lang.level})
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    {parentLanguageId && selectedParentLanguage && (
                      <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                        Selected: {selectedParentLanguage.name}
                        <button
                          type='button'
                          onClick={() => {
                            setParentLanguageId('');
                            setSelectedParentLanguage(null);
                            setParentLanguageSearch('');
                          }}
                          className='ml-2 text-red-600 dark:text-red-400 hover:underline'>
                          Clear
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Sources */}
            <section>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                  Sources
                </h3>
                <button
                  type='button'
                  onClick={addSource}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Plus className='h-4 w-4' />
                  Add Source
                </button>
              </div>
              <div className='space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className='border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <h4 className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                        Source {index + 1}
                      </h4>
                      {sources.length > 1 && (
                        <button
                          type='button'
                          onClick={() => removeSource(index)}
                          className='p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Source Name <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        value={source.source}
                        onChange={e =>
                          updateSource(index, { source: e.target.value })
                        }
                        required
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                        placeholder='e.g., ISO 639-3, Ethnologue'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Version
                      </label>
                      <input
                        type='text'
                        value={source.version}
                        onChange={e =>
                          updateSource(index, { version: e.target.value })
                        }
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                        placeholder='Optional version'
                      />
                    </div>
                    <div className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={source.is_external}
                        onChange={e =>
                          updateSource(index, { is_external: e.target.checked })
                        }
                        className='h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded'
                      />
                      <label className='ml-2 block text-sm text-neutral-700 dark:text-neutral-300'>
                        External ID
                      </label>
                    </div>
                    {source.is_external && (
                      <>
                        <div>
                          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                            External ID Type{' '}
                            <span className='text-red-500'>*</span>
                          </label>
                          <input
                            type='text'
                            value={source.external_id_type}
                            onChange={e =>
                              updateSource(index, {
                                external_id_type: e.target.value,
                              })
                            }
                            required={source.is_external}
                            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                            placeholder='e.g., ISO639-3, SIL'
                          />
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                            External ID <span className='text-red-500'>*</span>
                          </label>
                          <input
                            type='text'
                            value={source.external_id}
                            onChange={e =>
                              updateSource(index, {
                                external_id: e.target.value,
                              })
                            }
                            required={source.is_external}
                            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                            placeholder='e.g., eng, spa'
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Aliases */}
            <section>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                  Alternate Names (Aliases)
                </h3>
                <button
                  type='button'
                  onClick={addAlias}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Plus className='h-4 w-4' />
                  Add Alias
                </button>
              </div>
              <div className='space-y-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                {aliases.map((alias, index) => (
                  <div key={index} className='flex gap-2'>
                    <input
                      type='text'
                      value={alias.alias_name}
                      onChange={e => updateAlias(index, e.target.value)}
                      className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      placeholder='Enter alternate name'
                    />
                    {aliases.length > 1 && (
                      <button
                        type='button'
                        onClick={() => removeAlias(index)}
                        className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'>
                        <Trash2 className='h-4 w-4' />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Properties */}
            <section>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                  Properties
                </h3>
                <button
                  type='button'
                  onClick={addProperty}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Plus className='h-4 w-4' />
                  Add Property
                </button>
              </div>
              <div className='space-y-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                {properties.map((property, index) => (
                  <div key={index} className='flex gap-2'>
                    <input
                      type='text'
                      value={property.key}
                      onChange={e =>
                        updateProperty(index, { key: e.target.value })
                      }
                      className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      placeholder='Key'
                    />
                    <input
                      type='text'
                      value={property.value}
                      onChange={e =>
                        updateProperty(index, { value: e.target.value })
                      }
                      className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      placeholder='Value'
                    />
                    {properties.length > 1 && (
                      <button
                        type='button'
                        onClick={() => removeProperty(index)}
                        className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'>
                        <Trash2 className='h-4 w-4' />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Regions */}
            <section>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                  Regions
                </h3>
                <button
                  type='button'
                  onClick={addRegion}
                  className='text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1'>
                  <Plus className='h-4 w-4' />
                  Add Region
                </button>
              </div>
              <div className='space-y-6 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                {regions.map((region, index) => (
                  <div
                    key={index}
                    className='border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h4 className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                        Region {index + 1}
                      </h4>
                      {regions.length > 1 && (
                        <button
                          type='button'
                          onClick={() => removeRegion(index)}
                          className='p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'>
                          <Trash2 className='h-4 w-4' />
                        </button>
                      )}
                    </div>

                    {/* Region Selection */}
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Region <span className='text-red-500'>*</span>
                      </label>
                      <div className='space-y-2'>
                        <div className='relative'>
                          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400' />
                          <input
                            type='text'
                            placeholder='Search for region...'
                            value={regionSearchQueries[index] || ''}
                            onChange={e =>
                              handleRegionSearchChange(index, e.target.value)
                            }
                            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                          />
                        </div>
                        {regionSearchQueries[index] &&
                          regionSearchQueries[index].length >= 2 && (
                            <RegionSearchResults
                              searchQuery={regionSearchQueries[index]}
                              onSelect={r => handleRegionSelect(index, r)}
                              selectedId={region.region_id}
                            />
                          )}
                        {region.region_id && region.region && (
                          <p className='text-xs text-neutral-500 dark:text-neutral-400'>
                            Selected: {region.region.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dominance Level */}
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Dominance Level
                      </label>
                      <input
                        type='number'
                        min='0'
                        max='1'
                        step='0.1'
                        value={region.dominance_level}
                        onChange={e =>
                          updateRegion(index, {
                            dominance_level: parseFloat(e.target.value) || 0,
                          })
                        }
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                      />
                    </div>

                    {/* Location Source */}
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Location Source
                      </label>
                      <input
                        type='text'
                        value={region.location_source}
                        onChange={e =>
                          updateRegion(index, {
                            location_source: e.target.value,
                          })
                        }
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                        placeholder='e.g., Manual, GRN'
                      />
                    </div>

                    {/* Location Picker */}
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                        Location
                      </label>
                      <LocationPicker
                        location={region.location}
                        onLocationChange={location =>
                          updateRegion(index, { location })
                        }
                        height='300px'
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Actions */}
            <div className='flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800'>
              <button
                type='button'
                onClick={handleClose}
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors'>
                Cancel
              </button>
              <button
                type='submit'
                disabled={createMutation.isPending || !name.trim()}
                className='px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                {createMutation.isPending ? 'Creating...' : 'Create Language'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper component for region search results
function RegionSearchResults({
  searchQuery,
  onSelect,
  selectedId,
}: {
  searchQuery: string;
  onSelect: (region: Region) => void;
  selectedId: string;
}) {
  const { data: searchedRegions } = useQuery({
    queryKey: ['search-regions', searchQuery],
    queryFn: () => regionsApi.searchRegions(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  if (!searchedRegions || searchedRegions.length === 0) {
    return (
      <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-sm text-neutral-500 dark:text-neutral-400'>
        No regions found
      </div>
    );
  }

  return (
    <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
      {searchedRegions.map(r => (
        <button
          key={r.id}
          type='button'
          onClick={() => onSelect(r)}
          className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
            selectedId === r.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
          }`}>
          <span className='text-sm text-neutral-900 dark:text-neutral-100'>
            {r.name}
            <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
              ({r.level})
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
