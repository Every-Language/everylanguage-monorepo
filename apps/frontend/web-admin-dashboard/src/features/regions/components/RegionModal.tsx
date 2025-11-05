import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regionsApi } from '../api/regionsApi';
import type {
  RegionWithLanguages,
  RegionHierarchyNode,
  LanguageEntity,
  RegionProperty,
  RegionAlias,
} from '@/types';
import { X, Edit, Save, Plus, Trash2, Search } from 'lucide-react';

interface RegionModalProps {
  region: RegionWithLanguages;
  onClose: () => void;
  onSave: () => void;
  onNavigateToRegion: (regionId: string) => void;
  onNavigateToLanguage: (languageId: string) => void;
}

export function RegionModal({
  region,
  onClose,
  onSave,
  onNavigateToRegion,
  onNavigateToLanguage,
}: RegionModalProps) {
  const queryClient = useQueryClient();

  // State for animations
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Small delay to allow initial render, then trigger animation
    const timer = setTimeout(() => {
      setIsEntering(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  // Section editing states
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingProperties, setEditingProperties] = useState(false);
  const [editingAliases, setEditingAliases] = useState(false);
  const [editingLanguages, setEditingLanguages] = useState(false);

  // Form states
  const [name, setName] = useState(region.name);
  const [level, setLevel] = useState<
    | 'continent'
    | 'world_region'
    | 'country'
    | 'state'
    | 'province'
    | 'district'
    | 'town'
    | 'village'
  >(region.level);
  const [parentId, setParentId] = useState<string | null>(
    region.parent_id || null
  );
  const [localProperties, setLocalProperties] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [localAliases, setLocalAliases] = useState<
    Array<{ alias_name: string }>
  >([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');

  // Fetch full region details with language entities
  const { data: fullRegion, isLoading: isLoadingFullRegion } = useQuery({
    queryKey: ['region-full', region.id],
    queryFn: () => regionsApi.fetchRegionById(region.id),
    initialData: region,
  });

  // Fetch hierarchy
  const { data: hierarchyNodes, isLoading: isLoadingHierarchy } = useQuery({
    queryKey: ['region-hierarchy', region.id],
    queryFn: () => regionsApi.fetchRegionHierarchy(region.id),
  });

  // Fetch properties
  const { data: properties } = useQuery({
    queryKey: ['region-properties', region.id],
    queryFn: () => regionsApi.fetchRegionProperties(region.id),
  });

  // Fetch aliases
  const { data: aliases } = useQuery({
    queryKey: ['region-aliases', region.id],
    queryFn: () => regionsApi.fetchRegionAliases(region.id),
  });

  // Search languages (for linked languages section)
  const { data: searchedLanguages } = useQuery({
    queryKey: ['language-search', languageSearchQuery],
    queryFn: () => regionsApi.searchLanguageEntities(languageSearchQuery),
    enabled: languageSearchQuery.length >= 2,
  });

  // Fetch all regions for parent selection
  const { data: allRegions } = useQuery({
    queryKey: ['regions-list'],
    queryFn: regionsApi.fetchRegionsList,
  });

  // Sync local states with fetched data
  useEffect(() => {
    if (properties) {
      setLocalProperties(
        properties.map(p => ({ key: p.key || '', value: p.value || '' }))
      );
    }
  }, [properties]);

  useEffect(() => {
    if (aliases) {
      setLocalAliases(aliases.map(a => ({ alias_name: a.alias_name || '' })));
    }
  }, [aliases]);

  // Initialize selected languages when full region is loaded
  useEffect(() => {
    if (fullRegion?.language_entities) {
      setSelectedLanguageIds(fullRegion.language_entities.map(l => l.id));
    }
  }, [fullRegion]);

  // Memoize hierarchy tree structure
  const { nodesById, rootId } = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        level: string;
        parentId: string | null;
        children: string[];
      }
    >();
    if (!hierarchyNodes) return { nodesById: map, rootId: null };

    for (const r of hierarchyNodes) {
      if (!map.has(r.hierarchy_region_id)) {
        map.set(r.hierarchy_region_id, {
          id: r.hierarchy_region_id,
          name: r.hierarchy_region_name,
          level: r.hierarchy_region_level,
          parentId: r.hierarchy_parent_id,
          children: [],
        });
      }
    }

    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node.id);
      }
    }

    const self = hierarchyNodes.find(r => r.relationship_type === 'self');
    const ancestors = hierarchyNodes.filter(
      r => r.relationship_type === 'ancestor'
    );
    const calculatedRootId =
      ancestors.length > 0
        ? ancestors.reduce((min, r) =>
            r.generation_distance < min.generation_distance ? r : min
          ).hierarchy_region_id
        : self?.hierarchy_region_id || null;

    return { nodesById: map, rootId: calculatedRootId };
  }, [hierarchyNodes]);

  const [openHierarchyNodes, setOpenHierarchyNodes] = useState<
    Record<string, boolean>
  >({});
  useEffect(() => {
    if (rootId) {
      const openAll: Record<string, boolean> = {};
      nodesById.forEach((_, key) => (openAll[key] = true));
      setOpenHierarchyNodes(openAll);
    }
  }, [rootId, nodesById]);

  const toggleHierarchyNode = (nodeId: string) => {
    setOpenHierarchyNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const renderNode = (nodeId: string): React.ReactElement | null => {
    const node = nodesById.get(nodeId);
    if (!node) return null;

    const hasChildren = node.children.length > 0;
    const isCurrentRegion = node.id === region.id;

    return (
      <div key={nodeId} className='ml-2'>
        <div className='flex items-center gap-2 py-0.5'>
          {hasChildren ? (
            <button
              className='w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              onClick={() => toggleHierarchyNode(nodeId)}
              aria-label={openHierarchyNodes[nodeId] ? 'Collapse' : 'Expand'}
            >
              {openHierarchyNodes[nodeId] ? '▾' : '▸'}
            </button>
          ) : (
            <span className='w-5 h-5' />
          )}
          <button
            onClick={() => onNavigateToRegion(nodeId)}
            className={`text-sm underline-offset-2 hover:underline ${
              isCurrentRegion
                ? 'text-secondary-600 dark:text-secondary-400 font-semibold'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            {node.name}
          </button>
          <span
            className={`text-xs ${
              isCurrentRegion
                ? 'text-secondary-600 dark:text-secondary-400'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {node.level}
          </span>
        </div>
        {hasChildren && openHierarchyNodes[nodeId] && (
          <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2'>
            {node.children.map(cid => renderNode(cid))}
          </div>
        )}
      </div>
    );
  };

  // Mutations
  const updateInfoMutation = useMutation({
    mutationFn: async () => {
      await regionsApi.updateRegion(region.id, {
        name,
        level,
        parent_id: parentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({
        queryKey: ['region-full', region.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['region-hierarchy', region.id],
      });
      setEditingInfo(false);
      onSave();
    },
  });

  const updatePropertiesMutation = useMutation({
    mutationFn: async () => {
      await regionsApi.updateRegionProperties(region.id, localProperties);
    },
    onSuccess: async () => {
      // Refetch and wait for fresh data
      await queryClient.refetchQueries({
        queryKey: ['region-properties', region.id],
      });
      setEditingProperties(false);
    },
  });

  const updateAliasesMutation = useMutation({
    mutationFn: async () => {
      await regionsApi.updateRegionAliases(region.id, localAliases);
    },
    onSuccess: async () => {
      // Refetch and wait for fresh data
      await queryClient.refetchQueries({
        queryKey: ['region-aliases', region.id],
      });
      setEditingAliases(false);
    },
  });

  const updateLanguagesMutation = useMutation({
    mutationFn: async () => {
      await regionsApi.updateRegionLanguageEntities(
        region.id,
        selectedLanguageIds
      );
    },
    onSuccess: async () => {
      // Refetch and wait for fresh data
      await queryClient.refetchQueries({
        queryKey: ['region-full', region.id],
      });
      await queryClient.refetchQueries({ queryKey: ['regions'] });
      setEditingLanguages(false);
      onSave();
    },
  });

  const handleToggleLanguage = (languageId: string) => {
    setSelectedLanguageIds(prev =>
      prev.includes(languageId)
        ? prev.filter(id => id !== languageId)
        : [...prev, languageId]
    );
  };

  return (
    <div className='fixed inset-0 z-50 overflow-hidden'>
      {/* Backdrop with fade-in/out animation */}
      <div
        className={`absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out ${
          isEntering && !isExiting ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Slide panel with slide-in/out animation */}
      <div
        className={`absolute inset-y-0 right-0 max-w-3xl w-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          isEntering && !isExiting ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className='px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              {region.name}
            </h2>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              Region Details
            </p>
          </div>
          <button
            onClick={handleClose}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
          >
            <X className='h-5 w-5 text-neutral-600 dark:text-neutral-400' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
          {isLoadingFullRegion ? (
            <div className='text-center text-neutral-500 dark:text-neutral-400'>
              Loading...
            </div>
          ) : (
            <div className='space-y-8'>
              {/* Region Information */}
              <section>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                    Region Information
                  </h3>
                  {!editingInfo && (
                    <button
                      onClick={() => setEditingInfo(true)}
                      className='text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 flex items-center gap-1'
                    >
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
                    {editingInfo ? (
                      <input
                        type='text'
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-secondary-500 dark:focus:ring-secondary-600'
                      />
                    ) : (
                      <p className='text-neutral-900 dark:text-neutral-100'>
                        {fullRegion?.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Level
                    </label>
                    {editingInfo ? (
                      <select
                        value={level}
                        onChange={e =>
                          setLevel(
                            e.target.value as
                              | 'continent'
                              | 'world_region'
                              | 'country'
                              | 'state'
                              | 'province'
                              | 'district'
                              | 'town'
                              | 'village'
                          )
                        }
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-secondary-500 dark:focus:ring-secondary-600'
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
                      <p className='text-neutral-900 dark:text-neutral-100'>
                        {fullRegion?.level}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                      Parent Region
                    </label>
                    {editingInfo ? (
                      <select
                        value={parentId || ''}
                        onChange={e => setParentId(e.target.value || null)}
                        className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-secondary-500 dark:focus:ring-secondary-600'
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
                      <p className='text-neutral-900 dark:text-neutral-100'>
                        {parentId
                          ? allRegions?.find(r => r.id === parentId)?.name ||
                            parentId
                          : 'None'}
                      </p>
                    )}
                  </div>
                </div>

                {editingInfo && (
                  <div className='flex justify-end space-x-3 mt-4'>
                    <button
                      onClick={() => {
                        setEditingInfo(false);
                        setName(fullRegion?.name || '');
                        setLevel(fullRegion?.level || 'country');
                        setParentId(fullRegion?.parent_id || null);
                      }}
                      className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateInfoMutation.mutate()}
                      disabled={updateInfoMutation.isPending}
                      className='px-4 py-2 bg-secondary-600 dark:bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50 flex items-center'
                    >
                      <Save className='h-4 w-4 mr-2' />
                      {updateInfoMutation.isPending
                        ? 'Saving...'
                        : 'Save Changes'}
                    </button>
                  </div>
                )}
              </section>

              {/* Region Hierarchy */}
              <section>
                <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4'>
                  Region Hierarchy
                </h3>
                <div className='bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                  {isLoadingHierarchy ? (
                    <div className='text-center text-neutral-500 dark:text-neutral-400'>
                      Loading hierarchy...
                    </div>
                  ) : rootId && nodesById.size > 0 ? (
                    <div className='p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg'>
                      {renderNode(rootId)}
                    </div>
                  ) : (
                    <p className='text-neutral-500 dark:text-neutral-400'>
                      No hierarchy information available.
                    </p>
                  )}
                </div>
              </section>

              {/* Region Properties */}
              <section>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                    Region Properties
                  </h3>
                  {!editingProperties && (
                    <button
                      onClick={() => {
                        setEditingProperties(true);
                        if (properties) {
                          setLocalProperties(
                            properties.map(p => ({
                              key: p.key || '',
                              value: p.value || '',
                            }))
                          );
                        }
                      }}
                      className='text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 flex items-center gap-1'
                    >
                      <Edit className='h-4 w-4' />
                      Edit
                    </button>
                  )}
                </div>

                <div className='space-y-2 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                  {editingProperties ? (
                    <>
                      {localProperties.map((prop, index) => (
                        <div
                          key={index}
                          className='flex items-center space-x-2'
                        >
                          <input
                            type='text'
                            placeholder='Key'
                            value={prop.key}
                            onChange={e => {
                              const newProps = [...localProperties];
                              newProps[index].key = e.target.value;
                              setLocalProperties(newProps);
                            }}
                            className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm'
                          />
                          <input
                            type='text'
                            placeholder='Value'
                            value={prop.value}
                            onChange={e => {
                              const newProps = [...localProperties];
                              newProps[index].value = e.target.value;
                              setLocalProperties(newProps);
                            }}
                            className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm'
                          />
                          <button
                            onClick={() =>
                              setLocalProperties(prev =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                            className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setLocalProperties(prev => [
                            ...prev,
                            { key: '', value: '' },
                          ])
                        }
                        className='text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 flex items-center'
                      >
                        <Plus className='h-4 w-4 mr-1' />
                        Add Property
                      </button>
                    </>
                  ) : properties && properties.length > 0 ? (
                    properties.map(prop => (
                      <div
                        key={prop.id}
                        className='flex justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg'
                      >
                        <span className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                          {prop.key}
                        </span>
                        <span className='text-sm text-neutral-600 dark:text-neutral-400'>
                          {prop.value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className='text-neutral-500 dark:text-neutral-400'>
                      No properties
                    </p>
                  )}
                </div>

                {editingProperties && (
                  <div className='flex justify-end space-x-3 mt-4'>
                    <button
                      onClick={() => {
                        setEditingProperties(false);
                        setLocalProperties([]);
                      }}
                      className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updatePropertiesMutation.mutate()}
                      disabled={updatePropertiesMutation.isPending}
                      className='px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50 flex items-center'
                    >
                      <Save className='h-4 w-4' />
                      {updatePropertiesMutation.isPending
                        ? 'Saving...'
                        : 'Save'}
                    </button>
                  </div>
                )}
              </section>

              {/* Alternate Names */}
              <section>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                    Alternate Names
                  </h3>
                  {!editingAliases && (
                    <button
                      onClick={() => {
                        setEditingAliases(true);
                        if (aliases) {
                          setLocalAliases(
                            aliases.map(a => ({
                              alias_name: a.alias_name || '',
                            }))
                          );
                        }
                      }}
                      className='text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 flex items-center gap-1'
                    >
                      <Edit className='h-4 w-4' />
                      Edit
                    </button>
                  )}
                </div>

                <div className='space-y-2 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                  {editingAliases ? (
                    <>
                      {localAliases.map((alias, index) => (
                        <div
                          key={index}
                          className='flex items-center space-x-2'
                        >
                          <input
                            type='text'
                            placeholder='Alias name'
                            value={alias.alias_name}
                            onChange={e => {
                              const newAliases = [...localAliases];
                              newAliases[index].alias_name = e.target.value;
                              setLocalAliases(newAliases);
                            }}
                            className='flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm'
                          />
                          <button
                            onClick={() =>
                              setLocalAliases(prev =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                            className='p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setLocalAliases(prev => [...prev, { alias_name: '' }])
                        }
                        className='text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 flex items-center'
                      >
                        <Plus className='h-4 w-4 mr-1' />
                        Add Alias
                      </button>
                    </>
                  ) : aliases && aliases.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {aliases.map(alias => (
                        <span
                          key={alias.id}
                          className='px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full text-sm'
                        >
                          {alias.alias_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className='text-neutral-500 dark:text-neutral-400'>
                      No alternate names
                    </p>
                  )}
                </div>

                {editingAliases && (
                  <div className='flex justify-end space-x-3 mt-4'>
                    <button
                      onClick={() => {
                        setEditingAliases(false);
                        setLocalAliases([]);
                      }}
                      className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateAliasesMutation.mutate()}
                      disabled={updateAliasesMutation.isPending}
                      className='px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50 flex items-center'
                    >
                      <Save className='h-4 w-4' />
                      {updateAliasesMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </section>

              {/* Linked Language Entities */}
              <section>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                    Linked Language Entities
                  </h3>
                  {!editingLanguages && (
                    <button
                      onClick={() => setEditingLanguages(true)}
                      className='text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 flex items-center gap-1'
                    >
                      <Edit className='h-4 w-4' />
                      Edit
                    </button>
                  )}
                </div>

                <div className='space-y-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg'>
                  {editingLanguages && (
                    <div className='space-y-2'>
                      <div className='relative'>
                        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500' />
                        <input
                          type='text'
                          placeholder='Search languages...'
                          value={languageSearchQuery}
                          onChange={e => setLanguageSearchQuery(e.target.value)}
                          className='w-full pl-9 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm'
                        />
                      </div>

                      {/* Search results */}
                      {languageSearchQuery &&
                        searchedLanguages &&
                        searchedLanguages.length > 0 && (
                          <div className='max-h-40 overflow-y-auto border border-neutral-300 dark:border-neutral-700 rounded-lg'>
                            {searchedLanguages.map(language => (
                              <button
                                key={language.id}
                                onClick={() =>
                                  handleToggleLanguage(language.id)
                                }
                                className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between ${
                                  selectedLanguageIds.includes(language.id)
                                    ? 'bg-secondary-50 dark:bg-secondary-900/20'
                                    : ''
                                }`}
                              >
                                <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                                  {language.name}
                                  <span className='text-xs text-neutral-500 dark:text-neutral-400 ml-2'>
                                    ({language.level})
                                  </span>
                                </span>
                                {selectedLanguageIds.includes(language.id) && (
                                  <span className='text-secondary-600 dark:text-secondary-400 text-xs'>
                                    ✓ Selected
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                      {/* Selected languages */}
                      <div className='flex flex-wrap gap-2 mt-2'>
                        {selectedLanguageIds.map(langId => {
                          const lang = fullRegion?.language_entities?.find(
                            l => l.id === langId
                          );
                          return (
                            <span
                              key={langId}
                              className='px-3 py-1 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300 rounded-full text-sm flex items-center'
                            >
                              {lang?.name || 'Unknown'}
                              <button
                                onClick={() => handleToggleLanguage(langId)}
                                className='ml-2 text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200'
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!editingLanguages &&
                    fullRegion?.language_entities &&
                    fullRegion.language_entities.length > 0 && (
                      <div className='grid grid-cols-1 gap-2'>
                        {fullRegion.language_entities.map(language => (
                          <button
                            key={language.id}
                            onClick={() => onNavigateToLanguage(language.id)}
                            className='px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left'
                          >
                            <div className='font-medium text-neutral-900 dark:text-neutral-100 text-sm'>
                              {language.name}
                            </div>
                            <div className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                              {language.level}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                  {!editingLanguages &&
                    (!fullRegion?.language_entities ||
                      fullRegion.language_entities.length === 0) && (
                      <p className='text-neutral-500 dark:text-neutral-400'>
                        No linked language entities
                      </p>
                    )}
                </div>

                {editingLanguages && (
                  <div className='flex justify-end space-x-3 mt-4'>
                    <button
                      onClick={() => {
                        setEditingLanguages(false);
                        setLanguageSearchQuery('');
                        if (fullRegion?.language_entities) {
                          setSelectedLanguageIds(
                            fullRegion.language_entities.map(l => l.id)
                          );
                        }
                      }}
                      className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updateLanguagesMutation.mutate()}
                      disabled={updateLanguagesMutation.isPending}
                      className='px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50 flex items-center'
                    >
                      <Save className='h-4 w-4' />
                      {updateLanguagesMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
